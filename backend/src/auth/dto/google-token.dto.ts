import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleTokenDto {
  @ApiProperty({ description: 'Google Sign-In SDK tomonidan qaytarilgan ID token' })
  @IsString()
  @MinLength(1)
  idToken: string;
}
