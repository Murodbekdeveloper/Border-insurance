import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminLoginAttempts1784636683367 implements MigrationInterface {
    name = 'AddAdminLoginAttempts1784636683367'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "admin_login_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "ipAddress" character varying, "success" boolean NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_699add8381e49d00fb3b7d87462" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "admin_login_attempts"`);
    }

}
