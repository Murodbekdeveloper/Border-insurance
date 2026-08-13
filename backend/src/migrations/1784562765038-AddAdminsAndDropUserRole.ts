import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcrypt";

const SUPERADMIN_EMAIL = "developermurodbek@gmail.com";
const SUPERADMIN_PASSWORD = "20061214develop.M";
const SALT_ROUNDS = 10;

export class AddAdminsAndDropUserRole1784562765038 implements MigrationInterface {
    name = 'AddAdminsAndDropUserRole1784562765038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."admins_role_enum" AS ENUM('admin', 'superadmin')`);
        await queryRunner.query(`CREATE TABLE "admins" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."admins_role_enum" NOT NULL DEFAULT 'admin', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_e3b38270c97a854c48d2e80874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);

        const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS);
        await queryRunner.query(
            `INSERT INTO "admins" ("fullName", "email", "passwordHash", "role") VALUES ($1, $2, $3, 'superadmin')`,
            ["Murodbek", SUPERADMIN_EMAIL, passwordHash],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer'`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TYPE "public"."admins_role_enum"`);
    }

}
