import { MigrationInterface, QueryRunner } from 'typeorm';

// Closes a gap where two partner_submissions rows could exist for the same
// policy (one from the legacy local-charge path, one from the real
// submitPolicy() flow) — mirrors apex_box_submissions.policyId's own
// unique constraint. If this fails on deploy, it means duplicate rows
// already exist for some policyId — find and resolve those manually
// (e.g. `SELECT "policyId", count(*) FROM partner_submissions GROUP BY
// "policyId" HAVING count(*) > 1`) before retrying; this migration
// intentionally does not delete anything on its own.
export class AddPartnerSubmissionsPolicyIdUnique1789700000000 implements MigrationInterface {
  name = 'AddPartnerSubmissionsPolicyIdUnique1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" ADD CONSTRAINT "UQ_partner_submissions_policyId" UNIQUE ("policyId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" DROP CONSTRAINT "UQ_partner_submissions_policyId"`,
    );
  }
}
