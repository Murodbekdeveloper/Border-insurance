import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsurancePartnerService } from './insurance-partner.service';
import { PaymentCallbackApiKeyGuard } from './guards/payment-callback-api-key.guard';
import { PaymentCallbackDto } from './dto/payment-callback.dto';

// Asia Insurance calls this once a customer finishes paying at the
// payall_url from SavePolicyResponse — confirmed 2026-08-10 (Javoxir) that
// the body is shaped exactly like GetPolicyResponse, so this app doesn't
// need to poll GET /get-policy itself. Money never touches our backend:
// this is purely a "here's what happened on our side" notification.
@ApiTags('insurance-partner')
@ApiBearerAuth()
@UseGuards(PaymentCallbackApiKeyGuard)
@Controller('partner/payment-callback')
export class PaymentCallbackController {
  private readonly logger = new Logger(PaymentCallbackController.name);

  constructor(
    private readonly insurancePartnerService: InsurancePartnerService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      "Asia Insurance'dan to'lov yakunlangani haqida callback (payall_url orqali)",
  })
  async handleCallback(@Body() dto: PaymentCallbackDto) {
    // Mirror reconcileFromPartner()'s gate (insurance-partner.service.ts) —
    // a callback isn't proof of a finished, successful payment just because
    // it arrived on an authenticated channel. Anyone holding
    // INSURANCE_PARTNER_CALLBACK_TOKEN could otherwise finalize any policy
    // by posting an arbitrary contract_id with a non-success result.
    if (dto.result !== 0 || dto.policy_status !== 'ISSUED') {
      this.logger.warn(
        `Ignoring non-success payment callback for contract_id ${dto.contract_id}: result=${dto.result}, policy_status=${dto.policy_status}`,
      );
      return { received: true };
    }
    await this.insurancePartnerService.recordPaymentCallback(dto.contract_id, {
      contractNum: dto.contract_num,
      policyNo: dto.policy_no,
      policyStatus: dto.policy_status,
      policyCheckUrl: dto.policy_check,
    });
    return { received: true };
  }
}
