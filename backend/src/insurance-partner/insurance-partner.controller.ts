import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AsiaInsuranceClientService } from './asia-insurance-client.service';
import { AsiaInsuranceApiError } from './asia-insurance-api.error';

export const INSURANCE_PARTNER_NOT_CONFIGURED_CODE =
  'INSURANCE_PARTNER_NOT_CONFIGURED';

// User-facing proxy for the two Asia Insurance reference lookups the
// driver/vehicle forms need. Mirrors DocumentsService's OCR_NOT_CONFIGURED
// pattern: if INSURANCE_PARTNER_LOGIN/PASSWORD are ever unset (e.g. a
// fresh dev environment), the frontend gets a stable error code it already
// knows how to render as "not available yet, fall back to skipping this
// field" instead of a generic failure.
@ApiTags('insurance-partner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insurance-partner')
export class InsurancePartnerController {
  constructor(
    private readonly asiaInsuranceClient: AsiaInsuranceClientService,
  ) {}

  @Get('relatives')
  @ApiOperation({
    summary:
      "Haydovchining transport egasi bilan qarindoshlik darajalari ro'yxati",
  })
  async getRelatives() {
    try {
      return await this.asiaInsuranceClient.getRelatives();
    } catch (err) {
      if (err instanceof AsiaInsuranceApiError && err.httpStatus === 0) {
        throw new ServiceUnavailableException({
          code: INSURANCE_PARTNER_NOT_CONFIGURED_CODE,
          message: 'Asia Insurance API hali ulanmagan',
        });
      }
      throw err;
    }
  }
}
