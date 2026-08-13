import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'aziz@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;
}
