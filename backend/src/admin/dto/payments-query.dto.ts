import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '../../payments/entities/payment.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class PaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
