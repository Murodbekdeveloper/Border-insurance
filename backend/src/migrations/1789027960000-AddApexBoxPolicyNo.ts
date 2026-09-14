import { MigrationInterface, QueryRunner } from 'typeorm';

// Without this column, ApexBoxService.submitPolicy() has no way to record
// that Asia Insurance actually confirmed payment (via GET /policy, since
// Apex_Box has no payment-callback webhook the way osago_v3 does) — every
// foreign-vehicle policy would stay stuck at AWAITING_PARTNER_PAYMENT
// forever, exactly the gap partner_submissions.partnerPolicyNo already
// closes for the Uzbek-vehicle flow (see PartnerPolicySyncCron).
export class AddApexBoxPolicyNo1789027960000 implements MigrationInterface {
  name = 'AddApexBoxPolicyNo1789027960000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" ADD "policyNo" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "apex_box_submissions" DROP COLUMN "policyNo"`,
    );
  }
}
