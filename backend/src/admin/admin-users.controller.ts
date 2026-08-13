import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { UsersService } from '../users/users.service';
import { PoliciesService } from '../policies/policies.service';
import { PaymentsService } from '../payments/payments.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { AuditLogService } from './audit-log.service';
import { toCsv } from './csv.util';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly policiesService: PoliciesService,
    private readonly paymentsService: PaymentsService,
    private readonly vehiclesService: VehiclesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Barcha foydalanuvchilar ro'yxati (qidiruv, sahifalangan)",
  })
  async list(@Query() query: UsersQueryDto) {
    const [data, total] = await this.usersService.findAllPaginated(
      query.page,
      query.limit,
      query.search,
    );
    return { data, total, page: query.page, limit: query.limit };
  }

  @Get('export')
  @ApiOperation({ summary: 'Foydalanuvchilarni CSV sifatida eksport qilish' })
  async export(@Query() query: UsersQueryDto, @Res() res: Response) {
    const users = await this.usersService.findAllMatching(query.search);
    const csv = toCsv(
      ['F.I.O.', 'Email', 'Telefon', 'Holati', "Ro'yxatdan o'tgan sana"],
      users.map((u) => [
        u.fullName,
        u.email,
        u.phone ?? '',
        u.isActive ? 'Faol' : 'Bloklangan',
        u.createdAt.toISOString(),
      ]),
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="foydalanuvchilar.csv"',
    });
    res.send(csv);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      "Bitta foydalanuvchi haqida to'liq ma'lumot (avtomobillari, so'rovlari, to'lovlari bilan)",
  })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    const [vehicles, policies, payments] = await Promise.all([
      this.vehiclesService.findAllForUser(id),
      this.policiesService.findAllForUser(id),
      this.paymentsService.findAllForUser(id),
    ]);
    return { user, vehicles, policies, payments };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Foydalanuvchini bloklash/blokdan chiqarish' })
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserActiveDto,
    @CurrentAdmin() currentAdmin: RequestAdmin,
  ) {
    const user = await this.usersService.setActive(id, dto.isActive);
    await this.auditLogService.record(
      currentAdmin.adminId,
      currentAdmin.email,
      dto.isActive ? 'user.unblock' : 'user.block',
      'user',
      id,
      user.fullName,
    );
    return user;
  }
}
