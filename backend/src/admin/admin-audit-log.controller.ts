import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AuditLogService } from './audit-log.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/audit-log')
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Adminlar tomonidan bajarilgan amallar tarixi' })
  async list(@Query() query: PaginationQueryDto) {
    const [data, total] = await this.auditLogService.findAllPaginated(
      query.page,
      query.limit,
    );
    return { data, total, page: query.page, limit: query.limit };
  }
}
