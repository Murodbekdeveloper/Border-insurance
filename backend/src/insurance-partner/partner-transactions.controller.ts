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
import { ApexBoxService } from './apex-box.service';
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
    private readonly apexBoxService: ApexBoxService,
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
    // Checked in the same order the policy could have gone: osago_v3
    // (Uzbek-registered vehicles) first, then Apex_Box (foreign vehicles/
    // citizens) — the two flows' transactionId values are drawn from
    // disjoint uuid spaces in practice, so this can't collide.
    const submission = await this.insurancePartnerService.findByTransactionId(
      dto.transactionId,
    );
    if (submission?.partnerPolicyUuid) {
      return {
        uuid: submission.partnerPolicyUuid,
        insurancePremium: submission.insurancePremium,
        comission: submission.commissionAmount,
      };
    }

    const apexBoxSubmission = await this.apexBoxService.findByTransactionId(
      dto.transactionId,
    );
    if (apexBoxSubmission?.uuid) {
      return {
        uuid: apexBoxSubmission.uuid,
        insurancePremium: apexBoxSubmission.insurancePremium,
        comission: apexBoxSubmission.commissionAmount,
      };
    }

    throw new NotFoundException('Bunday transactionId topilmadi');
  }
}
