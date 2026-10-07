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
  translateCountryItems,
  translateForeignVehicleDurationItems,
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
    // reference-translations.ts's module comment. translateCountryItems
    // attaches every language this app's UI supports (nameRu/nameEn/nameKy/
    // nameZh alongside the Uzbek `name`), so the frontend's country picker
    // can display and search in whichever is active (e.g. a Russian-typed
    // "Киргизия" should still find it even when the UI language is Uzbek).
    const { items } = await this.wrap(() => this.apexBoxClient.getCountries());
    return { items: translateCountryItems(items) };
  }

  @Get('foreign-vehicle-durations')
  @ApiOperation({
    summary: "Chet elda ro'yxatdan o'tgan transport uchun sug'urta muddatlari",
  })
  async getForeignVehicleDurations() {
    const { items } = await this.wrap(() =>
      this.apexBoxClient.getForeignVehiclePolicyDurations(),
    );
    return { items: translateForeignVehicleDurationItems(items) };
  }

  @Get('relatives')
  @ApiOperation({
    summary:
      "Haydovchining transport egasi bilan qarindoshlik darajalari ro'yxati (xorijda ro'yxatdan o'tgan transport uchun)",
  })
  async getRelatives() {
    // Apex_Box's own /osago_relative list (sp_id-numbered) — a DIFFERENT
    // numbering scheme than osago_v3's /get-relative (InsurancePartner-
    // Controller's own 'relatives' endpoint, "relative" id 0-10). A
    // foreign-registered vehicle submits through Apex_Box
    // (ApexBoxService.submitPolicy), so its driver's relativeId must come
    // from THIS list — sending an osago_v3-numbered id here would record
    // the wrong kinship relationship on the issued policy. Reshaped to
    // the same { relative, name, nameRu } shape
    // InsurancePartnerController's /relatives already returns (even though
    // Apex_Box's own field is called sp_id) so the frontend's existing
    // RelativeOption type and relative picker work for either source
    // unchanged.
    const { items } = await this.wrap(() => this.apexBoxClient.getRelatives());
    return {
      items: items.map((item) => ({
        relative: item.sp_id,
        name: item.name_uzb,
        nameRu: item.name_rus,
      })),
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
      if (err instanceof AsiaInsuranceApiError && err.httpStatus === -1) {
        throw new ServiceUnavailableException(
          "Apex_Box bilan ulanishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.",
        );
      }
      throw err;
    }
  }
}
