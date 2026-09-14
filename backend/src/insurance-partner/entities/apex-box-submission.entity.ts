import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InsurancePolicy } from '../../policies/entities/insurance-policy.entity';

// One row per policy submitted to Apex_Box (Asia Insurance's universal,
// foreign-citizen/vehicle-capable OSAGO API — POST /osago). Kept separate
// from PartnerSubmission (osago_v3) since the two APIs' responses have
// different shapes: Apex_Box returns a single contract_id/uuid plus two
// payment links (click_link, payme_link) rather than one payall_url.
@Entity('apex_box_submissions')
export class ApexBoxSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InsurancePolicy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy: InsurancePolicy;

  @Column({ unique: true })
  policyId: string;

  // WE generate this and send it as details.transactionId — Apex_Box's
  // spec doesn't document what it's used for beyond uniqueness (unlike
  // osago_v3's transaction_id, which round-trips through GetPolicyRequest),
  // but a stable per-submission value is needed either way.
  @Generated('increment')
  @Column({ type: 'int', unique: true })
  ourTransactionId: number;

  // CreatePolicyResponse.contract_id.
  @Column({ type: 'int', nullable: true })
  contractId: number | null;

  // CreatePolicyResponse.uuid — "ID анкеты полученный в Фонде
  // гарантированных выплат" per their spec.
  @Column({ type: 'varchar', nullable: true })
  uuid: string | null;

  @Column({ type: 'varchar', nullable: true })
  clickLink: string | null;

  @Column({ type: 'varchar', nullable: true })
  paymeLink: string | null;

  // GetIssuedPolicyResponse.policy_no — filled in once PartnerPolicySyncCron
  // polls Apex_Box's GET /policy and finds the contract paid (Apex_Box has
  // no payment-callback webhook, unlike osago_v3's PaymentCallbackController,
  // so polling is the only way this ever gets set). Presence of this column
  // is what findReadyForFinalization() below waits for.
  @Column({ type: 'varchar', nullable: true })
  policyNo: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
