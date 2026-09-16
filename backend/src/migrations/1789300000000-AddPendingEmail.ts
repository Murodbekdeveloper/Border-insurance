import { MigrationInterface, QueryRunner } from 'typeorm';

// Backs profile-page "add/change email" for guest and phone-only accounts —
// holds the new address while its emailed code is unconfirmed (see
// UsersService.requestEmailChange/confirmEmailChange). Reuses the existing
// emailVerificationCode/emailVerificationCodeExpiresAt columns.
export class AddPendingEmail1789300000000 implements MigrationInterface {
  name = 'AddPendingEmail1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "pendingEmail" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "pendingEmail"`);
  }
}
