import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { RequestAdmin } from './decorators/current-admin.decorator';
import { AdminAuthService } from './admin-auth.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AuditLogService } from './audit-log.service';

// Managing admin accounts is the most sensitive admin capability, hence
// the extra SuperAdminGuard on top of the usual AdminJwtAuthGuard.
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, SuperAdminGuard)
@Controller('admin/admins')
export class AdminAdminsController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Barcha administratorlar ro'yxati" })
  findAll() {
    return this.adminAuthService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Yangi administrator yaratish' })
  async create(
    @Body() dto: CreateAdminDto,
    @CurrentAdmin() currentAdmin: RequestAdmin,
  ) {
    const admin = await this.adminAuthService.createAdmin(dto);
    await this.auditLogService.record(
      currentAdmin.adminId,
      currentAdmin.email,
      'admin.create',
      'admin',
      admin.id,
      admin.email,
    );
    return admin;
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: "Administratorni o'chirish" })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() currentAdmin: RequestAdmin,
  ) {
    await this.adminAuthService.deleteAdmin(id, currentAdmin.adminId);
    await this.auditLogService.record(
      currentAdmin.adminId,
      currentAdmin.email,
      'admin.delete',
      'admin',
      id,
    );
  }
}
