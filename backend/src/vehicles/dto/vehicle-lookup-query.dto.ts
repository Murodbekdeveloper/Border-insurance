import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VehicleLookupQueryDto {
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
}
