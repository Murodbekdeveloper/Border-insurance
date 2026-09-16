import { MigrationInterface, QueryRunner } from 'typeorm';

// Backs the "Mehmon sifatida kirish" (continue as guest) login option —
// distinguishes an auto-created, no-real-email account (see
// UsersService.createGuestUser) from a real registered/OAuth one, so admin
// screens and reporting can tell them apart at a glance.
export class AddGuestUsers1789200000000 implements MigrationInterface {
  name = 'AddGuestUsers1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isGuest" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isGuest"`);
  }
}
