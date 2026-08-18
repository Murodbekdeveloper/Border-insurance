import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUzcardHumoCardTypes1785143517619 implements MigrationInterface {
  name = 'AddUzcardHumoCardTypes1785143517619';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Uzcard/Humo are the dominant local card networks in Uzbekistan —
    // the card-type enum previously only recognised Visa/Mastercard.
    await queryRunner.query(
      `ALTER TYPE "public"."cards_cardtype_enum" ADD VALUE IF NOT EXISTS 'uzcard'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."cards_cardtype_enum" ADD VALUE IF NOT EXISTS 'humo'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres has no ALTER TYPE ... DROP VALUE. Rolling back would
    // require recreating the enum and rewriting any rows already using
    // 'uzcard'/'humo', which isn't a safe automatic operation — this is
    // deliberately a no-op; reverting this migration is not supported
    // once any card has been saved with one of the new types.
  }
}
