import { MigrationInterface, QueryRunner } from 'typeorm';

// Lets a domestic (UZ-registered vehicle) customer pick their osago_v3
// policy duration instead of the app always defaulting to a fixed 1 year
// — see InsurancePolicy.periodId's comment.
export class AddPolicyPeriodId1789500000000 implements MigrationInterface {
  name = 'AddPolicyPeriodId1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "insurance_policies" ADD "periodId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "insurance_policies" DROP COLUMN "periodId"`,
    );
  }
}
