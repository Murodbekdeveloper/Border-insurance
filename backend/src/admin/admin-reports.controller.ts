import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminReportService } from './admin-report.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly adminReportService: AdminReportService) {}

  @Get('monthly-preview')
  @ApiOperation({ summary: "O'tgan oy uchun hisobot ma'lumotlarini ko'rish" })
  preview() {
    return this.adminReportService.buildPreviousMonthReport();
  }

  @Post('monthly/send-now')
  @ApiOperation({
    summary: "O'tgan oy hisobotini hoziroq barcha adminlarga yuborish",
  })
  async sendNow() {
    await this.adminReportService.sendPreviousMonthReport();
    return { success: true };
  }
}
