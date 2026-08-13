import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymeFieldsToCards1784431278618 implements MigrationInterface {
    name = 'AddPaymeFieldsToCards1784431278618'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cards" ADD "paymeToken" character varying`);
        await queryRunner.query(`ALTER TABLE "cards" ADD "paymeVerified" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "paymeVerified"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP COLUMN "paymeToken"`);
    }

}
