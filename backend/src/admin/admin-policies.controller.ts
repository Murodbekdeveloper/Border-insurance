import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { RequestAdmin } from './decorators/current-admin.decorator';
import { PoliciesService } from '../policies/policies.service';
import { PoliciesQueryDto } from './dto/policies-query.dto';
import { AuditLogService } from './audit-log.service';
import { toCsv } from './csv.util';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/policies')
export class AdminPoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Barcha so'rovlar (polislar) ro'yxati (filtr, sahifalangan)",
  })
  async list(@Query() query: PoliciesQueryDto) {
    const [data, total] = await this.policiesService.findAllPaginated(
      query.page,
      query.limit,
      query.status,
    );
    return { data, total, page: query.page, limit: query.limit };
  }

  @Get('export')
  @ApiOperation({ summary: "So'rovlarni CSV sifatida eksport qilish" })
  async export(@Query() query: PoliciesQueryDto, @Res() res: Response) {
    const policies = await this.policiesService.findAllMatching(query.status);
    const csv = toCsv(
      ['Polis raqami', 'Davlat raqami', 'Narxi', 'Holati', 'Yaratilgan sana'],
      policies.map((p) => [
        p.policyNumber ?? '',
        p.vehicle?.plateNumber ?? '',
        String(p.price),
        p.status,
        p.createdAt.toISOString(),
      ]),
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sorovlar.csv"',
    });
    res.send(csv);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: "So'rovni (polisni) admin tomonidan bekor qilish" })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() currentAdmin: RequestAdmin,
  ) {
    const policy = await this.policiesService.adminCancel(id);
    await this.auditLogService.record(
      currentAdmin.adminId,
      currentAdmin.email,
      'policy.cancel',
      'policy',
      id,
      policy.policyNumber ?? undefined,
    );
    return policy;
  }
}
