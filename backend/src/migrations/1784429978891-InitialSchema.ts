import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784429978891 implements MigrationInterface {
    name = 'InitialSchema1784429978891'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_weightcategory_enum" AS ENUM('yengil', 'og''ir')`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_registrationcountry_enum" AS ENUM('UZ', 'Xorij')`);
        await queryRunner.query(`CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "weightCategory" "public"."vehicles_weightcategory_enum" NOT NULL, "registrationCountry" "public"."vehicles_registrationcountry_enum" NOT NULL, "plateNumber" character varying NOT NULL, "techPassportSeries" character varying NOT NULL, "techPassportNumber" character varying NOT NULL, "model" character varying NOT NULL, "vehicleType" character varying NOT NULL, "techPassportIssueDate" date NOT NULL, "manufactureYear" integer NOT NULL, "bodyNumber" character varying NOT NULL, "engineNumber" character varying NOT NULL, "city" character varying NOT NULL, "phone" character varying NOT NULL, CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "drivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "policyId" uuid NOT NULL, "fullName" character varying NOT NULL, "birthDate" date NOT NULL, "passportSeries" character varying NOT NULL, "passportNumber" character varying NOT NULL, "licenseNumber" character varying NOT NULL, "licenseIssueDate" date NOT NULL, "drivingExperienceSince" integer NOT NULL, CONSTRAINT "PK_92ab3fb69e566d3eb0cae896047" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."insurance_policies_driverrestriction_enum" AS ENUM('cheklangan', 'cheklanmagan')`);
        await queryRunner.query(`CREATE TYPE "public"."insurance_policies_status_enum" AS ENUM('draft', 'pending_payment', 'paid', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "insurance_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "vehicleId" uuid NOT NULL, "driverRestriction" "public"."insurance_policies_driverrestriction_enum" NOT NULL, "price" integer NOT NULL DEFAULT '0', "status" "public"."insurance_policies_status_enum" NOT NULL DEFAULT 'draft', "policyNumber" character varying, "validFrom" TIMESTAMP WITH TIME ZONE, "validTo" TIMESTAMP WITH TIME ZONE, "pdfUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_69af1d3a19277d1a822c9b13bf1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_residenttype_enum" AS ENUM('resident', 'non_resident')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying, "googleId" character varying, "phone" character varying, "residentType" "public"."users_residenttype_enum", "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."cards_cardtype_enum" AS ENUM('visa', 'mastercard')`);
        await queryRunner.query(`CREATE TABLE "cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "cardType" "public"."cards_cardtype_enum" NOT NULL, "maskedNumber" character varying(4) NOT NULL, "cardHolderName" character varying NOT NULL, "expDate" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5f3269634705fdff4a9935860fc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('success', 'failed', 'pending')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "policyId" uuid NOT NULL, "cardId" uuid, "amount" integer NOT NULL, "status" "public"."payments_status_enum" NOT NULL, "transactionId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "vehicles" ADD CONSTRAINT "FK_20f139b9d79f917ef735efacb00" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "drivers" ADD CONSTRAINT "FK_f7e211d754e2f96f2167be7c9fb" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "insurance_policies" ADD CONSTRAINT "FK_c76434dc53acdd818f5637bc8b9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "insurance_policies" ADD CONSTRAINT "FK_510dd63123fa27f8d27c0935cd3" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cards" ADD CONSTRAINT "FK_7b7230897ecdeb7d6b0576d907b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_373d7479a058d13a2d5ef3ea245" FOREIGN KEY ("policyId") REFERENCES "insurance_policies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_ffa0049cf3c2abff5d4aee33a9e" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_ffa0049cf3c2abff5d4aee33a9e"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_373d7479a058d13a2d5ef3ea245"`);
        await queryRunner.query(`ALTER TABLE "cards" DROP CONSTRAINT "FK_7b7230897ecdeb7d6b0576d907b"`);
        await queryRunner.query(`ALTER TABLE "insurance_policies" DROP CONSTRAINT "FK_510dd63123fa27f8d27c0935cd3"`);
        await queryRunner.query(`ALTER TABLE "insurance_policies" DROP CONSTRAINT "FK_c76434dc53acdd818f5637bc8b9"`);
        await queryRunner.query(`ALTER TABLE "drivers" DROP CONSTRAINT "FK_f7e211d754e2f96f2167be7c9fb"`);
        await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "FK_20f139b9d79f917ef735efacb00"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TABLE "cards"`);
        await queryRunner.query(`DROP TYPE "public"."cards_cardtype_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_residenttype_enum"`);
        await queryRunner.query(`DROP TABLE "insurance_policies"`);
        await queryRunner.query(`DROP TYPE "public"."insurance_policies_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."insurance_policies_driverrestriction_enum"`);
        await queryRunner.query(`DROP TABLE "drivers"`);
        await queryRunner.query(`DROP TABLE "vehicles"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_registrationcountry_enum"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_weightcategory_enum"`);
    }

}
