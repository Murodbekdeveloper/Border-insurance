import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCallbackFields1786355067584 implements MigrationInterface {
  name = 'AddPaymentCallbackFields1786355067584';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" ADD "partnerPolicyNo" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" ADD "partnerContractNum" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" ADD "partnerPolicyStatus" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" ADD "partnerPolicyCheckUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" DROP COLUMN "partnerPolicyCheckUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" DROP COLUMN "partnerPolicyStatus"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" DROP COLUMN "partnerContractNum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" DROP COLUMN "partnerPolicyNo"`,
    );
  }
}
