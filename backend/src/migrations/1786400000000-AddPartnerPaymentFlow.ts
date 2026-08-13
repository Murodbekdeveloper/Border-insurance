import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPartnerPaymentFlow1786400000000 implements MigrationInterface {
    name = 'AddPartnerPaymentFlow1786400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."insurance_policies_status_enum" ADD VALUE 'awaiting_partner_payment'`);
        await queryRunner.query(`ALTER TABLE "partner_submissions" ADD "startDate" date`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "partner_submissions" DROP COLUMN "startDate"`);
        // Postgres has no DROP VALUE for enums — reverting 'awaiting_partner_payment'
        // would require recreating the type and rewriting every dependent column/
        // constraint. Left as a no-op; the extra enum value is harmless if unused.
    }

}
