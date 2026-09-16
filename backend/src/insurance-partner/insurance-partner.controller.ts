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
import {
  PERIOD_NAME_UZ,
  RELATIVE_NAME_UZ,
  translatePeriodItems,
  translateRelativeItems,
} from './reference-translations';

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

  @Get('periods')
  @ApiOperation({
    summary:
      "O'zbekistonda ro'yxatdan o'tgan transport uchun sug'urta muddatlari",
  })
  async getPeriods() {
    try {
      // Asia Insurance's /get-period only returns Russian names (e.g.
      // "Один год") — see reference-translations.ts's module comment.
      const { items } = await this.asiaInsuranceClient.getPeriods();
      return { items: translatePeriodItems(items, PERIOD_NAME_UZ) };
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

  @Get('relatives')
  @ApiOperation({
    summary:
      "Haydovchining transport egasi bilan qarindoshlik darajalari ro'yxati",
  })
  async getRelatives() {
    try {
      // Asia Insurance's /get-relative only returns Russian names (e.g.
      // "ОТЕЦ") — see reference-translations.ts's module comment.
      const { items } = await this.asiaInsuranceClient.getRelatives();
      return { items: translateRelativeItems(items, RELATIVE_NAME_UZ) };
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
