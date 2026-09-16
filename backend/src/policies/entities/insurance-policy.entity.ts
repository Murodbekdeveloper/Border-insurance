import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Driver } from './driver.entity';

export enum DriverRestriction {
  RESTRICTED = 'cheklangan',
  UNRESTRICTED = 'cheklanmagan',
}

export enum PolicyStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  // Priced and submitted to Asia Insurance (/save-policy succeeded) —
  // customer has been handed payallUrl but PartnerPolicySyncCron hasn't
  // yet observed a finished payment (via webhook or getPolicy polling).
  AWAITING_PARTNER_PAYMENT = 'awaiting_partner_payment',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.policies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column()
  vehicleId: string;

  @OneToMany(() => Driver, (driver) => driver.policy, {
    cascade: true,
    eager: true,
  })
  drivers: Driver[];

  @Column({ type: 'enum', enum: DriverRestriction })
  driverRestriction: DriverRestriction;

  @Column({ type: 'int', default: 0 })
  price: number;

  // Only set (and only meaningful) when vehicle.registrationCountry is
  // "Xorij" — an id from GET /apex-box/foreign-vehicle-durations, needed
  // by ApexBoxService.submitPolicy() at submission time.
  @Column({ type: 'varchar', nullable: true })
  foreignPolicyDurationId: string | null;

  // Only meaningful when vehicle.registrationCountry is "UZ" — an id from
  // GET /insurance-partner/periods (osago_v3's /get-period), the domestic
  // policy duration the customer picked. Nullable: InsurancePartnerService
  // falls back to its own fixed 1-year lookup when unset, so this stays
  // backward-compatible with drafts created before the picker existed.
  @Column({ type: 'int', nullable: true })
  periodId: number | null;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.DRAFT })
  status: PolicyStatus;

  @Column({ type: 'varchar', nullable: true, unique: true })
  policyNumber: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  validFrom: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  validTo: Date | null;

  @Column({ type: 'varchar', nullable: true })
  pdfUrl: string | null;

  // Set by the daily renewal-reminder cron job once a reminder has been
  // sent for this policy, so the same policy isn't re-notified every day
  // while it's within the reminder window (see RenewalRemindersCron).
  @Column({ type: 'timestamptz', nullable: true })
  renewalReminderSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
