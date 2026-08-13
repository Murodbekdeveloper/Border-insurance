import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Ism yoki email bo'yicha qidirish" })
  @IsOptional()
  @IsString()
  search?: string;
}
