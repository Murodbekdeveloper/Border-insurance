import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ResidentType } from '../entities/user.entity';

export class UpdateResidentTypeDto {
  @ApiProperty({ enum: ResidentType })
  @IsEnum(ResidentType)
  residentType: ResidentType;
}
