import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppleId1785410000000 implements MigrationInterface {
  name = 'AddAppleId1785410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "appleId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_user_apple_id" UNIQUE ("appleId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_user_apple_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "appleId"`);
  }
}
