import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DriverRestriction } from '../entities/insurance-policy.entity';
import { DriverDto } from './driver.dto';

export class CreatePolicyDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ enum: DriverRestriction })
  @IsEnum(DriverRestriction)
  driverRestriction: DriverRestriction;

  @ApiProperty({ type: [DriverDto] })
  @ValidateIf(
    (dto: CreatePolicyDto) =>
      dto.driverRestriction === DriverRestriction.RESTRICTED,
  )
  @ArrayMinSize(1, {
    message: "Kamida bitta haydovchi qo'shilishi kerak",
  })
  @ValidateNested({ each: true })
  @Type(() => DriverDto)
  drivers: DriverDto[];
}
