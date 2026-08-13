import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    description:
      'Required only if the account already has a password (i.e. not a Google-only account setting one for the first time)',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'newPassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
