import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApexBoxClientService } from './apex-box-client.service';
import { AsiaInsuranceApiError } from './asia-insurance-api.error';
import {
  COUNTRY_NAME_UZ,
  FOREIGN_VEHICLE_DURATION_NAME_UZ,
  translateReferenceItems,
} from './reference-translations';

export const APEX_BOX_NOT_CONFIGURED_CODE = 'APEX_BOX_NOT_CONFIGURED';

// Reference-data lookups for the foreign-citizen/vehicle (Apex_Box)
// application flow — countries (for applicant.citizenshipId) and the
// foreign-vehicle policy durations (for cost.foreignVehicleId). Same
// thin-passthrough/guard pattern as InsurancePartnerController.
@ApiTags('apex-box')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('apex-box')
export class ApexBoxController {
  constructor(private readonly apexBoxClient: ApexBoxClientService) {}

  @Get('countries')
  @ApiOperation({ summary: "Fuqarolik (davlat) ro'yxati" })
  async getCountries() {
    // Asia Insurance's /countries only returns Russian names — see
    // reference-translations.ts's module comment.
    const { items } = await this.wrap(() => this.apexBoxClient.getCountries());
    return { items: translateReferenceItems(items, COUNTRY_NAME_UZ) };
  }

  @Get('foreign-vehicle-durations')
  @ApiOperation({
    summary: "Chet elda ro'yxatdan o'tgan transport uchun sug'urta muddatlari",
  })
  async getForeignVehicleDurations() {
    const { items } = await this.wrap(() =>
      this.apexBoxClient.getForeignVehiclePolicyDurations(),
    );
    return {
      items: translateReferenceItems(items, FOREIGN_VEHICLE_DURATION_NAME_UZ),
    };
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AsiaInsuranceApiError && err.httpStatus === 0) {
        throw new ServiceUnavailableException({
          code: APEX_BOX_NOT_CONFIGURED_CODE,
          message: 'Apex_Box API hali ulanmagan',
        });
      }
      throw err;
    }
  }
}
