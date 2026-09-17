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
// different shapes — though as of 2026-09-17 CreatePolicyResponse also
// carries a transaction_uuid/commission/premium/payall_url, mirroring
// PartnerSubmission's equivalent columns below.
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

  // CreatePolicyResponse.payall_url — same "universal" link as osago_v3's
  // PartnerSubmission.payallUrl; PoliciesService.submitToPartner() forwards
  // whichever one is set, and the frontend already prefers payallUrl over
  // click/payme when present.
  @Column({ type: 'varchar', nullable: true })
  payallUrl: string | null;

  // CreatePolicyResponse.transaction_uuid — lets PartnerTransactionsController
  // (the regulator/NAPP reconciliation endpoint) resolve a foreign-vehicle
  // Apex_Box policy too, not just osago_v3 ones. Distinct from `uuid` above
  // ("ID анкеты" in the Guaranteed Payments Fund) even though Asia
  // Insurance's own examples show them equal so far — store separately
  // rather than assume they always match.
  @Column({ type: 'varchar', nullable: true })
  transactionId: string | null;

  // CreatePolicyResponse.commission.
  @Column({ type: 'int', nullable: true })
  commissionAmount: number | null;

  // CreatePolicyResponse.premium — the partner's own authoritative premium,
  // now returned directly instead of only via a prior /osago_calculation
  // call. Kept alongside (not replacing) the calc-based value already used
  // to build the CreatePolicyRequest itself, since that call still happens
  // first and its result is what's actually submitted as cost.insurancePremium.
  @Column({ type: 'int', nullable: true })
  insurancePremium: number | null;

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
