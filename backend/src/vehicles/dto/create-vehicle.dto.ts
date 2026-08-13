import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  RegistrationCountry,
  WeightCategory,
} from '../entities/vehicle.entity';

const PHONE_REGEX = /^\+998[0-9]{9}$/;
const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;
const CURRENT_YEAR = new Date().getFullYear();

export class CreateVehicleDto {
  @ApiProperty({ enum: WeightCategory })
  @IsEnum(WeightCategory)
  weightCategory: WeightCategory;

  @ApiProperty({ enum: RegistrationCountry })
  @IsEnum(RegistrationCountry)
  registrationCountry: RegistrationCountry;

  @ApiProperty({ example: '01 A 123 AA' })
  @IsString()
  @MinLength(1)
  plateNumber: string;

  @ApiProperty({ example: 'AAB' })
  @IsString()
  @MinLength(1)
  techPassportSeries: string;

  @ApiProperty({ example: '1234567' })
  @IsString()
  @MinLength(1)
  techPassportNumber: string;

  @ApiProperty({ example: 'Chevrolet Cobalt' })
  @IsString()
  @MinLength(1)
  model: string;

  @ApiProperty({ example: 'yengil_avtomobil' })
  @IsString()
  @MinLength(1)
  vehicleType: string;

  @ApiProperty({ example: '2022-05-10' })
  @IsDateString()
  techPassportIssueDate: string;

  @ApiProperty({ example: 2021 })
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(CURRENT_YEAR)
  manufactureYear: number;

  @ApiProperty({ example: 'ABC1234567' })
  @IsString()
  @MinLength(5)
  @MaxLength(17)
  @Matches(ALPHANUMERIC_REGEX)
  bodyNumber: string;

  @ApiProperty({ example: 'ENG1234567' })
  @IsString()
  @MinLength(5)
  @MaxLength(17)
  @Matches(ALPHANUMERIC_REGEX)
  engineNumber: string;

  @ApiProperty({ example: 'Toshkent shahri' })
  @IsString()
  @MinLength(1)
  city: string;

  @ApiProperty({ example: '+998901234567' })
  @Matches(PHONE_REGEX)
  phone: string;

  // Asia Insurance's /save-policy contract needs a vehicle `owner`
  // separate from the `applicant`. Defaults to true (owner = the logged-in
  // user, taken from their own profile fields) when omitted — the three
  // fields below are only required when the owner is someone else.
  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  ownerIsApplicant?: boolean;

  @ApiPropertyOptional({ example: 'AB' })
  @ValidateIf((dto: CreateVehicleDto) => dto.ownerIsApplicant === false)
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  ownerPassportSeries?: string;

  @ApiPropertyOptional({ example: '1234567' })
  @ValidateIf((dto: CreateVehicleDto) => dto.ownerIsApplicant === false)
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  ownerPassportNumber?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @ValidateIf((dto: CreateVehicleDto) => dto.ownerIsApplicant === false)
  @IsDateString()
  ownerBirthDate?: string;
}
