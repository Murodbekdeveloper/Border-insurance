import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PolicyStatus } from '../../policies/entities/insurance-policy.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class PoliciesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PolicyStatus })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;
}
