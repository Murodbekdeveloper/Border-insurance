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
