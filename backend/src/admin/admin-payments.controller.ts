import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { PaymentsQueryDto } from './dto/payments-query.dto';
import { toCsv } from './csv.util';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: "Barcha to'lovlar ro'yxati (filtr, sahifalangan)" })
  async list(@Query() query: PaymentsQueryDto) {
    const [data, total] = await this.paymentsService.findAllPaginated(
      query.page,
      query.limit,
      query.status,
    );
    return { data, total, page: query.page, limit: query.limit };
  }

  @Get('export')
  @ApiOperation({ summary: "To'lovlarni CSV sifatida eksport qilish" })
  async export(@Query() query: PaymentsQueryDto, @Res() res: Response) {
    const payments = await this.paymentsService.findAllMatching(query.status);
    const csv = toCsv(
      ['Summasi', 'Polis raqami', 'Karta', 'Tranzaksiya ID', 'Holati', 'Sana'],
      payments.map((p) => [
        String(p.amount),
        p.policy?.policyNumber ?? '',
        p.card?.maskedNumber ? `**** ${p.card.maskedNumber}` : '',
        p.transactionId,
        p.status,
        p.createdAt.toISOString(),
      ]),
    );
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tolovlar.csv"',
    });
    res.send(csv);
  }
}
