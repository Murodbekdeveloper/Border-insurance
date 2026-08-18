import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartnerSubmissions1786345730681 implements MigrationInterface {
  name = 'AddPartnerSubmissions1786345730681';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "partner_submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "policyId" uuid NOT NULL, "ourTransactionId" SERIAL NOT NULL, "transactionId" uuid, "partnerOrderId" integer, "partnerPolicyUuid" character varying, "insurancePremium" integer, "commissionAmount" integer, "payallUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0a91e539e1ccbe259cc8fb099da" UNIQUE ("ourTransactionId"), CONSTRAINT "UQ_65f8f2f13ba0edfb5d01204d375" UNIQUE ("transactionId"), CONSTRAINT "PK_c2a15f8a839459b94bd315f61f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" ADD CONSTRAINT "FK_0b1d273d55cf4352588f893fd8c" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partner_submissions" DROP CONSTRAINT "FK_0b1d273d55cf4352588f893fd8c"`,
    );
    await queryRunner.query(`DROP TABLE "partner_submissions"`);
  }
}
