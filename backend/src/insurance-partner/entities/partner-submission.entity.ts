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

// One row per policy submitted to the real OSAGO issuer (currently Asia
// Insurance — see swagger.asia-insurance.uz/ui/osago3). Field naming
// mirrors their SavePolicyRequest/SavePolicyResponse contract exactly,
// since the two integer/uuid ids are easy to mix up:
//   - `ourTransactionId` (int) — WE generate this and send it as
//     SavePolicyRequest.details.transaction_id; reused as-is in
//     GetPolicyRequest.transaction_id to fetch the finished policy.
//   - `transactionId` (uuid) — the opposite direction: Asia Insurance
//     generates this (`transaction_uuid` in SavePolicyResponse.response,
//     documented there as "ID транзакции для НАПП") and hands it back to
//     us. THIS is the id the NAPP/ЕАИС «ЕРСП» reglament (in force since
//     2026-07-01) means by "transactionId" — PartnerTransactionsController
//     looks submissions up by this column, not by ourTransactionId.
// Everything past ourTransactionId stays null until the outbound call to
// /save-policy (not yet built — full request schema is now known, but the
// API token and a business decision on the `payall_url`/RAHMAT PAY payment
// step are still pending) fills it in from that response.
@Entity('partner_submissions')
export class PartnerSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InsurancePolicy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy: InsurancePolicy;

  @Column()
  policyId: string;

  @Generated('increment')
  @Column({ type: 'int', unique: true })
  ourTransactionId: number;

  // SavePolicyRequest.details.start_date as sent to Asia Insurance — kept
  // here (not just derived from createdAt) because the customer may pay at
  // payallUrl anywhere from minutes to days later, and PartnerPolicySyncCron
  // needs the exact date we already declared to them for InsurancePolicy's
  // validFrom/validTo once the policy is finalized, not the finalization
  // moment itself.
  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'uuid', nullable: true, unique: true })
  transactionId: string | null;

  // Asia Insurance's own contract id (SavePolicyResponse.response.order_id)
  // — required alongside ourTransactionId to call GetPolicyRequest later.
  @Column({ type: 'int', nullable: true })
  partnerOrderId: number | null;

  @Column({ type: 'varchar', nullable: true })
  partnerPolicyUuid: string | null;

  @Column({ type: 'int', nullable: true })
  insurancePremium: number | null;

  @Column({ type: 'int', nullable: true })
  commissionAmount: number | null;

  // SavePolicyResponse.response.payall_url — "Универсальный URL для
  // оплаты (RAHMAT PAY)". Decided: the customer pays here directly: the
  // money flow stays entirely on Asia Insurance's side, so our own Payme
  // card-charging flow is not used for OSAGO purchases.
  @Column({ type: 'varchar', nullable: true })
  payallUrl: string | null;

  // The four fields below arrive via PaymentCallbackController once the
  // customer finishes paying at payallUrl — Asia Insurance confirmed the
  // callback body is shaped exactly like GetPolicyResponse. Correlated
  // back to this row by contract_id === partnerOrderId.
  @Column({ type: 'varchar', nullable: true })
  partnerPolicyNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  partnerContractNum: string | null;

  // Observed value: "ISSUED" — likely also "TERMINATED"/"CANCELLED", exact
  // enum unconfirmed by Asia Insurance.
  @Column({ type: 'varchar', nullable: true })
  partnerPolicyStatus: string | null;

  // PDF link to the officially issued policy document (their hosted copy,
  // e.g. ersp.e-osgo.uz/.../export-to-pdf?id=...) — distinct from our own
  // PdfService-generated PDF.
  @Column({ type: 'varchar', nullable: true })
  partnerPolicyCheckUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
