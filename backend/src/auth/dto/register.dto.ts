import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const PHONE_REGEX = /^\+998[0-9]{9}$/;

export class RegisterDto {
  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString()
  @MinLength(3)
  fullName: string;

  @ApiProperty({ example: 'aziz@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+998901234567' })
  @Matches(PHONE_REGEX, {
    message: 'phone must be in +998XXXXXXXXX format',
  })
  phone: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
