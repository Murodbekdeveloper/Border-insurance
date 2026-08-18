import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintsAndAdminActive1785141647083 implements MigrationInterface {
  name = 'AddUniqueConstraintsAndAdminActive1785141647083';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres unique constraints allow multiple NULLs, so existing
    // unconfirmed policies (policyNumber IS NULL) are unaffected.
    await queryRunner.query(
      `ALTER TABLE "insurance_policies" ADD CONSTRAINT "UQ_policy_number" UNIQUE ("policyNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_vehicle_plate_number" UNIQUE ("plateNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_vehicle_body_number" UNIQUE ("bodyNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_vehicle_engine_number" UNIQUE ("engineNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "admins" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "isActive"`);
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_vehicle_engine_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_vehicle_body_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_vehicle_plate_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "insurance_policies" DROP CONSTRAINT "UQ_policy_number"`,
    );
  }
}
