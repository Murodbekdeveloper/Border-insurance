import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
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

  // Only meaningful (and required at submission time, see
  // PoliciesService.submitToPartner) when the linked vehicle's
  // registrationCountry is "Xorij" — an id from
  // GET /apex-box/foreign-vehicle-durations (e.g. "1" = "до 15 дней").
  // Optional here since it isn't known until the vehicle is already
  // created and only applies to the foreign case.
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  foreignPolicyDurationId?: string;

  // Only meaningful (and used, see PoliciesService.submitToPartner) when
  // the linked vehicle's registrationCountry is "UZ" — an id from
  // GET /insurance-partner/periods. Optional here for the same reason as
  // foreignPolicyDurationId above, and because InsurancePartnerService
  // still falls back to a fixed 1-year lookup when unset.
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodId?: number;
}
