import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds what's needed for the Apex_Box (Asia Insurance's universal, foreign-
// citizen/vehicle-capable OSAGO API) submission flow:
//   - users.citizenshipId: only meaningful for a non-resident applicant,
//     required by Apex_Box's applicant.citizenshipId (from /countries).
//   - apex_box_submissions: Apex_Box's own submission-tracking table,
//     separate from partner_submissions (Asia Insurance's osago_v3) since
//     the two APIs return structurally different results — a single
//     click_link/payme_link pair here instead of one payall_url, and their
//     own contract_id/uuid instead of order_id/transaction_uuid.
export class AddApexBoxSupport1789027959000 implements MigrationInterface {
  name = 'AddApexBoxSupport1789027959000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "citizenshipId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "insurance_policies" ADD "foreignPolicyDurationId" character varying`,
    );
    await queryRunner.query(
      `CREATE TABLE "apex_box_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "policyId" uuid NOT NULL, "ourTransactionId" SERIAL NOT NULL, "contractId" integer, "uuid" character varying, "clickLink" character varying, "paymeLink" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_apex_box_submissions_policyId" UNIQUE ("policyId"), CONSTRAINT "UQ_apex_box_submissions_ourTransactionId" UNIQUE ("ourTransactionId"), CONSTRAINT "PK_apex_box_submissions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD CONSTRAINT "FK_apex_box_submissions_policyId" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP CONSTRAINT "FK_apex_box_submissions_policyId"`,
    );
    await queryRunner.query(`DROP TABLE "apex_box_submissions"`);
    await queryRunner.query(
      `ALTER TABLE "insurance_policies" DROP COLUMN "foreignPolicyDurationId"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "citizenshipId"`);
  }
}
