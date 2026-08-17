import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { InsurancePartnerModule } from '../insurance-partner/insurance-partner.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle]), InsurancePartnerModule],
  providers: [VehiclesService],
  controllers: [VehiclesController],
  exports: [VehiclesService],
})
export class VehiclesModule {}
