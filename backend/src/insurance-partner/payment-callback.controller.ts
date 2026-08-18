import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  constructor(
    private readonly insurancePartnerService: InsurancePartnerService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      "Asia Insurance'dan to'lov yakunlangani haqida callback (payall_url orqali)",
  })
  async handleCallback(@Body() dto: PaymentCallbackDto) {
    await this.insurancePartnerService.recordPaymentCallback(dto.contract_id, {
      contractNum: dto.contract_num,
      policyNo: dto.policy_no,
      policyStatus: dto.policy_status,
      policyCheckUrl: dto.policy_check,
    });
    return { received: true };
  }
}
