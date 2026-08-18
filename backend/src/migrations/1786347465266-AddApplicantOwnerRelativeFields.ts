import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicantOwnerRelativeFields1786347465266 implements MigrationInterface {
  name = 'AddApplicantOwnerRelativeFields1786347465266';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "ownerIsApplicant" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "ownerPassportSeries" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD "ownerPassportNumber" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "vehicles" ADD "ownerBirthDate" date`);
    await queryRunner.query(`ALTER TABLE "drivers" ADD "relativeId" integer`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "passportSeries" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "passportNumber" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "birthDate" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "birthDate"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passportNumber"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passportSeries"`);
    await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN "relativeId"`);
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "ownerBirthDate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "ownerPassportNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "ownerPassportSeries"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP COLUMN "ownerIsApplicant"`,
    );
  }
}
