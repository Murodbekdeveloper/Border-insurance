import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  policyId: string;

  @ApiProperty()
  @IsUUID()
  cardId: string;
}
