import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminJwtRefreshGuard } from './guards/admin-jwt-refresh.guard';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import type { RequestAdmin } from './decorators/current-admin.decorator';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Administrator sifatida kirish' })
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.adminAuthService.login(dto, req.ip ?? null);
  }

  @Post('refresh')
  @UseGuards(AdminJwtRefreshGuard)
  @ApiOperation({ summary: 'Admin access tokenini yangilash' })
  refresh(@CurrentAdmin() currentAdmin: RequestAdmin) {
    return this.adminAuthService.refresh(currentAdmin.adminId);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: "Joriy administrator ma'lumotlari" })
  async me(@CurrentAdmin() currentAdmin: RequestAdmin) {
    const admin = await this.adminAuthService.findById(currentAdmin.adminId);
    if (!admin) {
      throw new NotFoundException('Administrator topilmadi');
    }
    return admin;
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: "O'z profilini tahrirlash" })
  updateProfile(
    @CurrentAdmin() currentAdmin: RequestAdmin,
    @Body() dto: UpdateAdminProfileDto,
  ) {
    return this.adminAuthService.updateProfile(currentAdmin.adminId, dto);
  }

  @Patch('password')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: "O'z parolini almashtirish" })
  async changePassword(
    @CurrentAdmin() currentAdmin: RequestAdmin,
    @Body() dto: ChangeAdminPasswordDto,
  ) {
    await this.adminAuthService.changePassword(currentAdmin.adminId, dto);
    return { success: true };
  }
}
