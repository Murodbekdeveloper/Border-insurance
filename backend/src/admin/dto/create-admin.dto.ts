import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AdminRole } from '../entities/admin.entity';

export class CreateAdminDto {
  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString()
  @MinLength(3)
  fullName: string;

  @ApiProperty({ example: 'admin@osago.uz' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: AdminRole, default: AdminRole.ADMIN })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
