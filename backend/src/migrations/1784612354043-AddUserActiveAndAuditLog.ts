import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserActiveAndAuditLog1784612354043 implements MigrationInterface {
  name = 'AddUserActiveAndAuditLog1784612354043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "admin_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "adminId" character varying NOT NULL, "adminEmail" character varying NOT NULL, "action" character varying NOT NULL, "targetType" character varying NOT NULL, "targetId" character varying, "details" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_de7a8fc2fbb525484c71a86bb96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
    await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
  }
}
