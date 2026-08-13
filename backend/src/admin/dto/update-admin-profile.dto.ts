import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @ApiProperty({ example: 'Aziz Karimov' })
  @IsString()
  @MinLength(3)
  fullName: string;
}
