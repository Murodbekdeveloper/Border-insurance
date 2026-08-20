import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsurancePartnerService } from './insurance-partner.service';
import { PartnerApiKeyGuard } from './guards/partner-api-key.guard';

// Column is typed `uuid` in Postgres (PartnerSubmission.transactionId) — a
// non-UUID path param makes the lookup query itself throw (invalid input
// syntax for type uuid), which without this check surfaces as an unhandled
// 500 instead of the 404 a malformed/unknown id should get.
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Inbound endpoint for the insurance regulator (NAPP/ЕАИС «ЕРСП», per the
// 2026-06-02 Положение о страховых агентах №3845, in force 2026-07-01) to
// reconcile a policy against the transactionId we pass the partner
// (Asia Insurance) when confirming payment. Response shape — including
// the "comission" spelling — is fixed by their spec, not a typo here.
@ApiTags('insurance-partner')
@ApiBearerAuth()
@UseGuards(PartnerApiKeyGuard)
@Controller('partner/transactions')
export class PartnerTransactionsController {
  constructor(
    private readonly insurancePartnerService: InsurancePartnerService,
  ) {}

  @Get(':transactionId')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Regulyator uchun: transactionId bo'yicha polis uuid/premium/komissiyani qaytarish",
  })
  async getByTransactionId(@Param('transactionId') transactionId: string) {
    if (!UUID_REGEX.test(transactionId)) {
      throw new NotFoundException('Bunday transactionId topilmadi');
    }
    const submission =
      await this.insurancePartnerService.findByTransactionId(transactionId);
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
