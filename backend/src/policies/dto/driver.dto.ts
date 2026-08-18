import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const CURRENT_YEAR = new Date().getFullYear();

export class DriverDto {
  @ApiProperty({ example: 'Ali Valiyev' })
  @IsString()
  @MinLength(3)
  fullName: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  birthDate: string;

  // O'zbekiston pasporti "2 harf" formatida, lekin chet el fuqarolarining
  // pasportlari bunga to'g'ri kelmaydi (mobil ilova ham norezidentlar uchun
  // shu maydonni erkinlashtiradi) — shuning uchun bu yerda faqat uzunlik
  // bilan cheklaymiz, aniq formatni majburlamaymiz.
  @ApiProperty({ example: 'AA' })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  passportSeries: string;

  @ApiProperty({ example: '1234567' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  passportNumber: string;

  @ApiProperty({ example: 'LIC123456' })
  @IsString()
  @MinLength(1)
  licenseNumber: string;

  @ApiProperty({ example: '2015-06-01' })
  @IsDateString()
  licenseIssueDate: string;

  // Never sent to Asia Insurance — optional since the web form no longer
  // collects it (the mobile app still does, for now).
  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  drivingExperienceSince?: number;

  // Asia Insurance's /save-policy Driver.relative — degree of kinship to
  // the vehicle owner, an id from GET /insurance-partner/relatives.
  // Optional at the DTO level: existing/incomplete drafts predate this
  // field, but InsurancePartnerService requires it once a policy is
  // actually submitted to Asia Insurance (see submitToPartner()).
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  relativeId?: number;
}