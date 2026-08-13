import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminReportService } from './admin-report.service';

@Injectable()
export class MonthlyReportCron {
  constructor(private readonly adminReportService: AdminReportService) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async sendMonthlyReport(): Promise<void> {
    await this.adminReportService.sendPreviousMonthReport();
  }
}
