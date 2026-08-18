import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  DriverRestriction,
  InsurancePolicy,
  PolicyStatus,
} from './entities/insurance-policy.entity';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { PricingService } from './pricing/pricing.service';
import { PdfService } from './pdf/pdf.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InsurancePartnerService } from '../insurance-partner/insurance-partner.service';

function generatePolicyNumber(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(3).readUIntBE(0, 3) % 900000;
  return `OSG-${year}-${100000 + random}`;
}

// Postgres unique_violation on the policyNumber constraint specifically —
// used to retry with a freshly generated number rather than failing the
// whole payment when two numbers happen to collide.
function isPolicyNumberConflict(err: unknown): boolean {
  const code =
    (err as { code?: string; driverError?: { code?: string } })?.code ??
    (err as { driverError?: { code?: string } })?.driverError?.code;
  const constraint =
    (err as { constraint?: string; driverError?: { constraint?: string } })
      ?.constraint ??
    (err as { driverError?: { constraint?: string } })?.driverError?.constraint;
  return code === '23505' && constraint === 'UQ_policy_number';
}

@Injectable()
export class PoliciesService {
  constructor(
    @InjectRepository(InsurancePolicy)
    private readonly policiesRepository: Repository<InsurancePolicy>,
    private readonly pricingService: PricingService,
    private readonly pdfService: PdfService,
    private readonly vehiclesService: VehiclesService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly insurancePartnerService: InsurancePartnerService,
  ) {}

  async create(userId: string, dto: CreatePolicyDto): Promise<InsurancePolicy> {
    const vehicle = await this.vehiclesService.findById(dto.vehicleId);
    if (vehicle.userId !== userId) {
      throw new ForbiddenException('Bu transport vositasi sizga tegishli emas');
    }

    // Exactly one policy should ever be "in flight" or active for a given
    // physical vehicle — otherwise the same car could end up with several
    // simultaneously valid OSAGO policies.
    const conflicting = await this.policiesRepository.findOne({
      where: [
        { vehicleId: vehicle.id, status: PolicyStatus.PENDING_PAYMENT },
        { vehicleId: vehicle.id, status: PolicyStatus.PAID },
      ],
    });
    if (conflicting) {
      const isExpired =
        conflicting.status === PolicyStatus.PAID &&
        conflicting.validTo !== null &&
        conflicting.validTo < new Date();
      if (!isExpired) {
        throw new ConflictException(
          conflicting.status === PolicyStatus.PENDING_PAYMENT
            ? "Bu transport vositasi uchun to'lov kutilayotgan ariza allaqachon mavjud"
            : 'Bu transport vositasi uchun faol OSAGO polisi allaqachon mavjud',
        );
      }
    }

    const drivers =
      dto.driverRestriction === DriverRestriction.RESTRICTED ? dto.drivers : [];

    for (const driver of drivers) {
      const birthDate = new Date(driver.birthDate);
      const licenseIssueDate = new Date(driver.licenseIssueDate);
      if (licenseIssueDate < birthDate) {
        throw new ForbiddenException(
          `${driver.fullName}: guvohnoma tug'ilgan sanadan oldin berilgan bo'lishi mumkin emas`,
        );
      }
    }

    const policy = this.policiesRepository.create({
      userId,
      vehicleId: vehicle.id,
      driverRestriction: dto.driverRestriction,
      drivers,
      price: 0,
      status: PolicyStatus.DRAFT,
    });
    return this.policiesRepository.save(policy);
  }

  async findByIdForUser(id: string, userId: string): Promise<InsurancePolicy> {
    const policy = await this.policiesRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException('Ariza topilmadi');
    }
    if (policy.userId !== userId) {
      throw new ForbiddenException('Bu ariza sizga tegishli emas');
    }
    return policy;
  }

  async getPrice(id: string, userId: string): Promise<number> {
    const policy = await this.findByIdForUser(id, userId);
    const user = await this.usersService.findById(userId);

    const price = this.pricingService.calculatePrice({
      weightCategory: policy.vehicle.weightCategory,
      driverRestriction: policy.driverRestriction,
      residentType: user?.residentType,
      registrationCountry: policy.vehicle.registrationCountry,
    });

    policy.price = price;
    policy.status = PolicyStatus.PENDING_PAYMENT;
    await this.policiesRepository.save(policy);
    return price;
  }

  // Registers the priced application with Asia Insurance (/save-policy) and
  // returns their payallUrl — the customer pays there directly, our own
  // Payme/Cards flow is not used for OSAGO (see PaymentCallbackController).
  // `price` is overwritten with their calculator's amount_uzs, which is the
  // authoritative figure per SavePolicyRequest.details.amount_uzs's spec.
  async submitToPartner(
    id: string,
    userId: string,
  ): Promise<{ payallUrl: string }> {
    const policy = await this.findByIdForUser(id, userId);
    if (policy.status !== PolicyStatus.PENDING_PAYMENT) {
      throw new ConflictException(
        policy.status === PolicyStatus.AWAITING_PARTNER_PAYMENT
          ? "Bu ariza allaqachon Asia Insurance'ga yuborilgan — to'lov kutilmoqda"
          : 'Ariza hali narxlanmagan yoki allaqachon yakunlangan',
      );
    }
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const { payallUrl, amountUzs } =
      await this.insurancePartnerService.submitPolicy(policy, user);

    policy.status = PolicyStatus.AWAITING_PARTNER_PAYMENT;
    policy.price = amountUzs;
    await this.policiesRepository.save(policy);

    return { payallUrl };
  }

  // Called by PartnerPolicySyncCron once Asia Insurance confirms the
  // customer finished paying at payallUrl (via webhook or getPolicy
  // polling) — the OSAGO equivalent of the old confirmAfterPayment(), but
  // policyNumber now comes from the real issuer instead of being generated
  // locally, and validFrom/validTo derive from the start_date we already
  // declared to them (see PartnerSubmission.startDate) rather than "now",
  // since payment can land anywhere from minutes to days after submission.
  async finalizeAfterPartnerPayment(
    policyId: string,
    policyNo: string,
    startDate: string | null,
  ): Promise<void> {
    const policy = await this.policiesRepository.findOne({
      where: { id: policyId },
    });
    if (!policy || policy.status === PolicyStatus.PAID) {
      return;
    }

    const validFrom = startDate ? new Date(startDate) : new Date();
    const validTo = new Date(validFrom);
    validTo.setFullYear(validTo.getFullYear() + 1);

    policy.status = PolicyStatus.PAID;
    policy.policyNumber = policyNo;
    policy.validFrom = validFrom;
    policy.validTo = validTo;
    policy.pdfUrl = `/policies/${policy.id}/pdf`;
    await this.policiesRepository.save(policy);

    await this.notifyConfirmed(policy, policy.userId);
  }

  // NOTE: this deliberately no longer performs the draft->paid transition
  // itself — that only ever happens as a side effect of a real, verified
  // payment (see PaymentsService.pay() / confirmAfterPayment() below).
  // This endpoint is kept only so the mobile client's existing follow-up
  // call after pay() remains a harmless, idempotent no-op.
  async confirm(id: string, userId: string): Promise<InsurancePolicy> {
    const policy = await this.findByIdForUser(id, userId);
    if (policy.status === PolicyStatus.PAID) {
      return policy;
    }
    throw new ConflictException(
      "Polis hali to'lanmagan — avval to'lovni yakunlang",
    );
  }

  // Called only by PaymentsService.pay(), inside the same DB transaction as
  // the successful charge/Payment record, using that transaction's own
  // EntityManager so both writes commit or roll back together.
  async confirmAfterPayment(
    policyId: string,
    manager: EntityManager,
  ): Promise<InsurancePolicy> {
    const policyRepo = manager.getRepository(InsurancePolicy);
    const policy = await policyRepo.findOne({ where: { id: policyId } });
    if (!policy) {
      throw new NotFoundException('Ariza topilmadi');
    }

    const now = new Date();
    const validTo = new Date(now);
    validTo.setFullYear(validTo.getFullYear() + 1);
    policy.status = PolicyStatus.PAID;
    policy.validFrom = now;
    policy.validTo = validTo;
    policy.pdfUrl = `/policies/${policy.id}/pdf`;

    for (let attempt = 0; attempt < 5; attempt++) {
      policy.policyNumber = generatePolicyNumber();
      try {
        const saved = await policyRepo.save(policy);
        // Reserves a PartnerSubmission row (and its ourTransactionId) for
        // the future /save-policy call to Asia Insurance — same
        // transaction as the policy write above. The NAPP/ЕАИС «ЕРСП»
        // reglament (in force since 2026-07-01) transactionId itself comes
        // back from *their* response, not generated here — see
        // InsurancePartnerService.
        await this.insurancePartnerService.createSubmission(saved.id, manager);
        return saved;
      } catch (err) {
        if (isPolicyNumberConflict(err) && attempt < 4) continue;
        throw err;
      }
    }
    /* istanbul ignore next - unreachable, loop always returns or throws */
    throw new Error("Polis raqamini generatsiya qilib bo'lmadi");
  }

  async notifyConfirmed(
    policy: InsurancePolicy,
    userId: string,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (user) {
      await this.notificationsService.notifyPolicyConfirmed(policy, user);
    }
  }

  async generatePdf(id: string, userId: string): Promise<Buffer> {
    const policy = await this.findByIdForUser(id, userId);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    return this.pdfService.generatePolicyPdf(policy, user);
  }

  findAllForUser(userId: string): Promise<InsurancePolicy[]> {
    return this.policiesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByPolicyNumber(
    policyNumber: string,
  ): Promise<InsurancePolicy | null> {
    return this.policiesRepository.findOne({ where: { policyNumber } });
  }

  // Paid policies expiring within `maxDaysLeft` days that haven't had a
  // reminder sent in the last 7 days — used by RenewalRemindersCron.
  findExpiringPolicies(maxDaysLeft: number): Promise<InsurancePolicy[]> {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + maxDaysLeft);
    const remindedRecentlyBefore = new Date(now.getTime() - 7 * 86_400_000);

    return this.policiesRepository
      .createQueryBuilder('policy')
      .where('policy.status = :status', { status: PolicyStatus.PAID })
      .andWhere('policy.validTo IS NOT NULL')
      .andWhere('policy.validTo <= :threshold', { threshold })
      .andWhere('policy.validTo >= :now', { now })
      .andWhere(
        '(policy.renewalReminderSentAt IS NULL OR policy.renewalReminderSentAt <= :remindedRecentlyBefore)',
        { remindedRecentlyBefore },
      )
      .getMany();
  }

  async markReminderSent(id: string): Promise<void> {
    await this.policiesRepository.update(
      { id },
      { renewalReminderSentAt: new Date() },
    );
  }

  findAllPaginated(
    page: number,
    limit: number,
    status?: PolicyStatus,
  ): Promise<[InsurancePolicy[], number]> {
    return this.policiesRepository.findAndCount({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllMatching(status?: PolicyStatus): Promise<InsurancePolicy[]> {
    return this.policiesRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  countAll(): Promise<number> {
    return this.policiesRepository.count();
  }

  countByStatus(status: PolicyStatus): Promise<number> {
    return this.policiesRepository.count({ where: { status } });
  }

  async sumRevenue(): Promise<number> {
    const result = await this.policiesRepository
      .createQueryBuilder('policy')
      .select('COALESCE(SUM(policy.price), 0)', 'total')
      .where('policy.status = :status', { status: PolicyStatus.PAID })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  // Admin-initiated cancellation — bypasses the ownership check
  // (findByIdForUser) since an admin can act on any customer's policy.
  async adminCancel(id: string): Promise<InsurancePolicy> {
    const policy = await this.policiesRepository.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException('Ariza topilmadi');
    }
    policy.status = PolicyStatus.CANCELLED;
    return this.policiesRepository.save(policy);
  }

  // Grouped by validFrom (the moment payment was confirmed), not createdAt
  // (the moment the draft was started) — that's when the revenue actually
  // realized. Months with zero revenue are simply absent from the result;
  // the caller fills the gaps so the chart always shows a full range.
  async monthlyRevenue(
    months: number,
  ): Promise<{ month: string; revenue: number }[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await this.policiesRepository
      .createQueryBuilder('policy')
      .select(
        "to_char(date_trunc('month', policy.validFrom), 'YYYY-MM')",
        'month',
      )
      .addSelect('COALESCE(SUM(policy.price), 0)', 'revenue')
      .where('policy.status = :status', { status: PolicyStatus.PAID })
      .andWhere('policy.validFrom >= :since', { since })
      .groupBy("date_trunc('month', policy.validFrom)")
      .orderBy("date_trunc('month', policy.validFrom)", 'ASC')
      .getRawMany<{ month: string; revenue: string }>();

    return rows.map((r) => ({ month: r.month, revenue: Number(r.revenue) }));
  }

  countExpiringSoon(days: number): Promise<number> {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + days);

    return this.policiesRepository
      .createQueryBuilder('policy')
      .where('policy.status = :status', { status: PolicyStatus.PAID })
      .andWhere('policy.validTo IS NOT NULL')
      .andWhere('policy.validTo >= :now', { now })
      .andWhere('policy.validTo <= :threshold', { threshold })
      .getCount();
  }

  findRecent(limit: number): Promise<InsurancePolicy[]> {
    return this.policiesRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  countPaidBetween(start: Date, end: Date): Promise<number> {
    return this.policiesRepository
      .createQueryBuilder('policy')
      .where('policy.status = :status', { status: PolicyStatus.PAID })
      .andWhere('policy.validFrom >= :start', { start })
      .andWhere('policy.validFrom < :end', { end })
      .getCount();
  }

  async sumRevenueBetween(start: Date, end: Date): Promise<number> {
    const result = await this.policiesRepository
      .createQueryBuilder('policy')
      .select('COALESCE(SUM(policy.price), 0)', 'total')
      .where('policy.status = :status', { status: PolicyStatus.PAID })
      .andWhere('policy.validFrom >= :start', { start })
      .andWhere('policy.validFrom < :end', { end })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  searchTop(query: string, limit: number): Promise<InsurancePolicy[]> {
    return this.policiesRepository
      .createQueryBuilder('policy')
      .where('policy.policyNumber ILIKE :search', { search: `%${query}%` })
      .orderBy('policy.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
