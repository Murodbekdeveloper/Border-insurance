import { MigrationInterface, QueryRunner } from 'typeorm';

// Never sent to Asia Insurance (see CalcDriver/SavePolicyDriver in
// insurance-partner/asia-insurance.types.ts) — purely a leftover local
// field the web form no longer collects. Kept in the schema (nullable) so
// existing rows and the mobile app, which still collects it, are unaffected.
export class MakeDrivingExperienceSinceOptional1787044620293 implements MigrationInterface {
  name = 'MakeDrivingExperienceSinceOptional1787044620293';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "drivers" ALTER COLUMN "drivingExperienceSince" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "drivers" ALTER COLUMN "drivingExperienceSince" SET NOT NULL`,
    );
  }
}
