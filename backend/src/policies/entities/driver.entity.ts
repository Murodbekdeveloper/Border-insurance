import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InsurancePolicy } from './insurance-policy.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InsurancePolicy, (policy) => policy.drivers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policyId' })
  policy: InsurancePolicy;

  @Column()
  policyId: string;

  @Column()
  fullName: string;

  @Column({ type: 'date' })
  birthDate: string;

  @Column()
  passportSeries: string;

  @Column()
  passportNumber: string;

  @Column()
  licenseNumber: string;

  @Column({ type: 'date' })
  licenseIssueDate: string;

  @Column()
  drivingExperienceSince: number;

  // Asia Insurance's /save-policy Driver.relative — degree of kinship to
  // the vehicle owner, an id from GetRelativeResponse (e.g. 1 = ОТЕЦ).
  // Nullable at the DB level for drafts created before this was collected;
  // InsurancePartnerService.buildSavePolicyRequest() requires it once the
  // policy is actually submitted to Asia Insurance.
  @Column({ type: 'int', nullable: true })
  relativeId: number | null;
}
