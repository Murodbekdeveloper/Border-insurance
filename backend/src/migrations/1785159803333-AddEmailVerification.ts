import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1785159803333 implements MigrationInterface {
  name = 'AddEmailVerification1785159803333';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "isEmailVerified" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "emailVerificationCode" varchar(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "emailVerificationCodeExpiresAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "emailVerificationCodeExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "emailVerificationCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "isEmailVerified"`,
    );
  }
}
