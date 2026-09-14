import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsurancePartnerService } from './insurance-partner.service';
import { PartnerApiKeyGuard } from './guards/partner-api-key.guard';
import { GetTransactionDto } from './dto/get-transaction.dto';

// Inbound endpoint for the insurance regulator (NAPP/ЕАИС «ЕРСП», per the
// 2026-06-02 Положение о страховых агентах №3845, in force 2026-07-01) to
// reconcile a policy against the transactionId we pass the partner
// (Asia Insurance) when confirming payment. Response shape — including
// the "comission" spelling — is fixed by their spec, not a typo here.
//
// CORRECTED 2026-09-11: originally built as GET /partner/transactions/:id
// with transactionId as a path param — the regulator's actual integration
// calls this as POST with transactionId in the JSON body instead.
@ApiTags('insurance-partner')
@ApiBearerAuth()
@UseGuards(PartnerApiKeyGuard)
@Controller('partner/transactions')
export class PartnerTransactionsController {
  constructor(
    private readonly insurancePartnerService: InsurancePartnerService,
  ) {}

  @Post()
  // A lookup, not a resource creation — Nest's default 201 for POST would
  // be a needlessly odd status for a regulator client that likely checks
  // for a plain 200.
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Regulyator uchun: transactionId bo'yicha polis uuid/premium/komissiyani qaytarish",
  })
  async getByTransactionId(@Body() dto: GetTransactionDto) {
    const submission = await this.insurancePartnerService.findByTransactionId(
      dto.transactionId,
    );
    if (!submission || !submission.partnerPolicyUuid) {
      throw new NotFoundException('Bunday transactionId topilmadi');
    }

    return {
      uuid: submission.partnerPolicyUuid,
      insurancePremium: submission.insurancePremium,
      comission: submission.commissionAmount,
    };
  }
}
