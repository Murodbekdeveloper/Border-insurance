import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PHONE_REGEX = /^\+998[0-9]{9}$/;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Aziz Karimov' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  fullName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message: 'phone must be in +998XXXXXXXXX format',
  })
  phone?: string;

  // "Applicant" fields for Asia Insurance's /save-policy contract — asked
  // once here instead of on every policy purchase. Loosely validated (not
  // the strict 2-letter/7-digit Uzbek pattern) since a foreign resident's
  // passport won't fit that shape either.
  @ApiPropertyOptional({ example: 'AB' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  passportSeries?: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  passportNumber?: string;

  @ApiPropertyOptional({ example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  // Apex_Box's applicant.citizenshipId (GET /apex-box/countries) — only
  // meaningful for a non-resident applicant applying for a foreign-vehicle
  // policy, hence optional here too.
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  citizenshipId?: string;
}
