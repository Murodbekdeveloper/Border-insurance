import { MigrationInterface, QueryRunner } from 'typeorm';

// Apex_Box's CreatePolicyResponse now also returns transaction_uuid/
// commission/premium/payall_url alongside contract_id/uuid/click_link/
// payme_link (confirmed 2026-09-17) — mirrors the columns
// PartnerSubmission (osago_v3) already has for the same purpose:
// regulator (NAPP) reconciliation by transactionId, and bookkeeping of
// the partner's own authoritative premium/commission.
export class AddApexBoxCommissionFields1789600000000 implements MigrationInterface {
  name = 'AddApexBoxCommissionFields1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD "payallUrl" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD "transactionId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD "commissionAmount" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD "insurancePremium" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD CONSTRAINT "UQ_apex_box_submissions_transactionId" UNIQUE ("transactionId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP CONSTRAINT "UQ_apex_box_submissions_transactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP COLUMN "insurancePremium"`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP COLUMN "commissionAmount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP COLUMN "transactionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP COLUMN "payallUrl"`,
    );
  }
}
