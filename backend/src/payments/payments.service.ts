import {
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';
import type { PaymentGateway } from './gateway/payment-gateway.interface';
import { CardsService } from '../cards/cards.service';
import { PoliciesService } from '../policies/policies.service';
import {
  InsurancePolicy,
  PolicyStatus,
} from '../policies/entities/insurance-policy.entity';

function generateTransactionId(): string {
  return `TXN-${Date.now()}-${randomBytes(2).toString('hex')}`;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: PaymentGateway,
    private readonly cardsService: CardsService,
    private readonly policiesService: PoliciesService,
  ) {}

  async pay(userId: string, dto: CreatePaymentDto): Promise<Payment> {
    const card = await this.cardsService.findById(dto.cardId, userId);
    // Verification only applies to Payme-tokenized cards (paymeToken set);
    // under the mock gateway no card ever has a token, so this must not
    // block payment there.
    if (card.paymeToken && !card.paymeVerified) {
      throw new HttpException(
        'Karta hali tasdiqlanmagan',
        HttpStatus.BAD_REQUEST,
      );
    }

    const policy = await this.policiesService.findByIdForUser(
      dto.policyId,
      userId,
    );
    if (policy.status !== PolicyStatus.PENDING_PAYMENT) {
      throw new ConflictException(
        "Bu ariza uchun to'lov allaqachon amalga oshirilgan yoki hali narx hisoblanmagan",
      );
    }

    // The gateway call is deliberately outside the DB transaction below —
    // an external network call shouldn't be made while holding a row lock.
    const result = await this.paymentGateway.charge({
      amount: policy.price,
      maskedNumber: card.maskedNumber,
      cardToken: card.paymeToken ?? undefined,
      orderId: policy.id,
    });

    const { payment, confirmedPolicy } = await this.dataSource.transaction(
      async (manager) => {
        const policyRepo = manager.getRepository(InsurancePolicy);
        const paymentRepo = manager.getRepository(Payment);

        // Re-check under a row lock: two concurrent/duplicate submissions
        // for the same policy can both pass the check above, but only one
        // will win this lock while PENDING_PAYMENT still holds.
        // Uses the query builder (not findOne) so InsurancePolicy's eager
        // `vehicle`/`drivers` relations aren't auto-joined — Postgres
        // rejects `FOR UPDATE` on the nullable side of an outer join.
        const lockedPolicy = await policyRepo
          .createQueryBuilder('policy')
          .setLock('pessimistic_write')
          .where('policy.id = :id', { id: policy.id })
          .getOne();
        if (!lockedPolicy || lockedPolicy.status !== PolicyStatus.PENDING_PAYMENT) {
          throw new ConflictException(
            "Bu ariza uchun to'lov allaqachon amalga oshirilgan yoki hali narx hisoblanmagan",
          );
        }

        const paymentEntity = paymentRepo.create({
          policyId: lockedPolicy.id,
          cardId: card.id,
          amount: lockedPolicy.price,
          status: result.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
          transactionId: generateTransactionId(),
        });
        const savedPayment = await paymentRepo.save(paymentEntity);

        if (!result.success) {
          return { payment: savedPayment, confirmedPolicy: null };
        }

        // Same transaction as the payment row above — either both commit
        // (paid policy + successful payment record) or both roll back.
        const confirmed = await this.policiesService.confirmAfterPayment(
          lockedPolicy.id,
          manager,
        );
        return { payment: savedPayment, confirmedPolicy: confirmed };
      },
    );

    if (!result.success) {
      throw new HttpException(
        "To'lov amalga oshmadi. Karta rad etildi.",
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    if (confirmedPolicy) {
      await this.policiesService.notifyConfirmed(confirmedPolicy, userId);
    }

    return payment;
  }

  findAllPaginated(
    page: number,
    limit: number,
    status?: PaymentStatus,
  ): Promise<[Payment[], number]> {
    return this.paymentsRepository.findAndCount({
      where: status ? { status } : {},
      relations: { policy: true, card: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findAllMatching(status?: PaymentStatus): Promise<Payment[]> {
    return this.paymentsRepository.find({
      where: status ? { status } : {},
      relations: { policy: true, card: true },
      order: { createdAt: 'DESC' },
    });
  }

  countByStatus(status: PaymentStatus): Promise<number> {
    return this.paymentsRepository.count({ where: { status } });
  }

  // Payments have no direct userId column — ownership flows through the
  // policy they belong to, hence the join instead of a plain `where`.
  findAllForUser(userId: string): Promise<Payment[]> {
    return this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.policy', 'policy')
      .leftJoinAndSelect('payment.card', 'card')
      .where('policy.userId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .getMany();
  }

  countByStatusSince(status: PaymentStatus, since: Date): Promise<number> {
    return this.paymentsRepository.count({
      where: { status, createdAt: MoreThanOrEqual(since) },
    });
  }

  findRecent(limit: number): Promise<Payment[]> {
    return this.paymentsRepository.find({
      relations: { policy: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  countByStatusBetween(
    status: PaymentStatus,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.paymentsRepository.count({
      where: { status, createdAt: Between(start, end) },
    });
  }

  searchTop(query: string, limit: number): Promise<Payment[]> {
    return this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.policy', 'policy')
      .where('payment.transactionId ILIKE :search', { search: `%${query}%` })
      .orderBy('payment.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
