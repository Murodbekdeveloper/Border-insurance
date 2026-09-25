import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Original literal seed values were scrubbed from this file 2026-09-21
// after being found committed in plaintext — rotate the real superadmin
// password in production (it's still whatever this migration originally
// set, until changed via the admin panel) if that hasn't happened yet,
// since the old value remains readable in git history regardless of this
// edit. Left as placeholders rather than deleted since this migration
// already ran everywhere it needed to (TypeORM tracks completion by class
// name, not file content) — editing it further doesn't change what
// already executed, only what a fresh clone's history shows going forward.
const SUPERADMIN_EMAIL = 'admin@example.test';
const SUPERADMIN_PASSWORD = 'REDACTED_ROTATE_BEFORE_REUSE';
const SALT_ROUNDS = 10;

export class AddAdminsAndDropUserRole1784562765038 implements MigrationInterface {
  name = 'AddAdminsAndDropUserRole1784562765038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."admins_role_enum" AS ENUM('admin', 'superadmin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."admins_role_enum" NOT NULL DEFAULT 'admin', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);

    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);
    await queryRunner.query(
      `INSERT INTO "admins" ("fullName", "email", "passwordHash", "role") VALUES ($1, $2, $3, 'superadmin')`,
      ['Murodbek', SUPERADMIN_EMAIL, passwordHash],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer'`,
    );
    await queryRunner.query(`DROP TABLE "admins"`);
    await queryRunner.query(`DROP TYPE "public"."admins_role_enum"`);
  }
}
