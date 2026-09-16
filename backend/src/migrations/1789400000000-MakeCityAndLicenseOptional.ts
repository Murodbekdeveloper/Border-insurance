import { MigrationInterface, QueryRunner } from 'typeorm';

// vehicles.city and drivers.licenseNumber/licenseIssueDate are only
// actually required by Asia Insurance for a foreign-registered vehicle
// (Apex_Box) — their domestic osago_v3 /save-policy contract has no
// equivalent fields at all, so forcing them on every Uzbek-registered
// vehicle/driver was pure friction. See ApexBoxService.assertReadyForSubmission
// for where they're now enforced instead, conditional on registrationCountry.
export class MakeCityAndLicenseOptional1789400000000 implements MigrationInterface {
  name = 'MakeCityAndLicenseOptional1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "city" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ALTER COLUMN "licenseNumber" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ALTER COLUMN "licenseIssueDate" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "drivers" ALTER COLUMN "licenseIssueDate" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "drivers" ALTER COLUMN "licenseNumber" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "city" SET NOT NULL`,
    );
  }
}
