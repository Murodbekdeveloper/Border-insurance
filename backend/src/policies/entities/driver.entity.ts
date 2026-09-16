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

  // Only actually required for a driver on a foreign-registered vehicle —
  // Asia Insurance's Apex_Box contract needs it; their domestic osago_v3
  // /save-policy Driver shape has no license fields at all. Nullable so a
  // domestic driver can skip it (InsurancePartnerService never reads it).
  @Column({ type: 'varchar', nullable: true })
  licenseNumber: string | null;

  @Column({ type: 'date', nullable: true })
  licenseIssueDate: string | null;

  // Never sent to Asia Insurance — nullable since the web form no longer
  // collects it (the mobile app still does, for now).
  @Column({ type: 'int', nullable: true })
  drivingExperienceSince: number | null;

  // Asia Insurance's /save-policy Driver.relative — degree of kinship to
  // the vehicle owner, an id from GetRelativeResponse (e.g. 1 = ОТЕЦ).
  // Nullable at the DB level for drafts created before this was collected;
  // InsurancePartnerService.buildSavePolicyRequest() requires it once the
  // policy is actually submitted to Asia Insurance.
  @Column({ type: 'int', nullable: true })
  relativeId: number | null;
}
