import { MigrationInterface, QueryRunner } from 'typeorm';

// The same physical vehicle (plate/body/engine number) can now have more
// than one `vehicles` row — needed so a new OSAGO application for a car
// that's already in the system (under this account or another) is never
// blocked by a duplicate-identifier conflict.
export class DropVehicleUniqueConstraints1789800000000
  implements MigrationInterface
{
  name = 'DropVehicleUniqueConstraints1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_vehicle_plate_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_vehicle_body_number"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_vehicle_engine_number"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_vehicle_engine_number" UNIQUE ("engineNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_vehicle_body_number" UNIQUE ("bodyNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_vehicle_plate_number" UNIQUE ("plateNumber")`,
    );
  }
}
