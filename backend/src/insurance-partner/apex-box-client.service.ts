import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsiaInsuranceApiError } from './asia-insurance-api.error';
import {
  ApexBoxReferenceItem,
  CalculatePremiumRequest,
  CalculatePremiumResponse,
  CreatePolicyRequest,
  CreatePolicyResponse,
  GetIssuedPolicyRequest,
  GetIssuedPolicyResponse,
} from './apex-box.types';

/**
 * Thin REST client for Asia Insurance's "Apex_Box" OSAGO API — the
 * universal issuer (Uzbek AND foreign citizens/vehicles), confirmed by
 * Asia Insurance (2026-09-05) to live at this exact base URL. An earlier
 * document they gave us listed `rest.aic.uz/api/ins/apex_box` instead —
 * confirmed incorrect; only this host works.
 *
 * Auth: HTTP Basic (components.securitySchemes.BasicAuth in their spec,
 * swagger.asia-insurance.uz/swagger-files/old_osago.yaml) — same pattern
 * as AsiaInsuranceClientService, but Asia Insurance said these are
 * separate credentials from osago_v3's, not reused. `/osago` and `/policy`
 * additionally require a `user_id` query parameter Asia Insurance issues
 * alongside the credentials.
 *
 * NOT YET WIRED into InsurancePartnerService.submitPolicy() — no
 * credentials exist yet (Asia Insurance to provide them), and the
 * business decision of *when* to route a policy here instead of to
 * osago_v3 hasn't been made. This class is ready to call once both land.
 */
@Injectable()
export class ApexBoxClientService {
  constructor(private readonly configService: ConfigService) {}

  createPolicy(request: CreatePolicyRequest): Promise<CreatePolicyResponse> {
    return this.post<CreatePolicyRequest, CreatePolicyResponse>(
      '/osago',
      request,
      { withUserId: true },
    );
  }

  calculatePremium(
    request: CalculatePremiumRequest,
  ): Promise<CalculatePremiumResponse> {
    return this.post<CalculatePremiumRequest, CalculatePremiumResponse>(
      '/osago_calculation',
      request,
      { withUserId: false },
    );
  }

  getIssuedPolicy(
    request: GetIssuedPolicyRequest,
  ): Promise<GetIssuedPolicyResponse> {
    return this.post<GetIssuedPolicyRequest, GetIssuedPolicyResponse>(
      '/policy',
      request,
      { withUserId: true },
    );
  }

  getRegions(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/osago_references_regions');
  }

  getUseTerritories(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/osago_use_territory');
  }

  getVehicleTypes(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/osago_references_vehicle_type');
  }

  getContractTerms(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/osago_references_contractTermConclusionId');
  }

  getSeasonalInsurances(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/osago_references_seasonal_insurances');
  }

  getForeignVehiclePolicyDurations(): Promise<{
    items: ApexBoxReferenceItem[];
  }> {
    return this.get('/osago_references_foreign_vehicles_policy_duration');
  }

  getCountries(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/countries');
  }

  getResidentTypes(): Promise<{ items: ApexBoxReferenceItem[] }> {
    return this.get('/resident-types');
  }

  getRegionIds(): Promise<{ items: { regionId: number; name_ru: string }[] }> {
    return this.get('/regionId');
  }

  getDistrictIds(): Promise<{
    items: { districtId: number; name_ru: string }[];
  }> {
    return this.get('/districtId');
  }

  getRelatives(): Promise<{
    items: { sp_id: number; name_uzb: string; name_rus: string }[];
  }> {
    return this.get('/osago_relative');
  }

  private baseUrl(): string {
    const url = this.configService.get<string>('apexBox.apiUrl');
    if (!url) {
      throw new AsiaInsuranceApiError(0, 'apexBox.apiUrl sozlanmagan');
    }
    return url;
  }

  private userId(): string {
    const userId = this.configService.get<string>('apexBox.userId');
    if (!userId) {
      throw new AsiaInsuranceApiError(0, 'APEX_BOX_USER_ID sozlanmagan');
    }
    return userId;
  }

  private authHeader(): Record<string, string> {
    const login = this.configService.get<string>('apexBox.login');
    const password = this.configService.get<string>('apexBox.password');
    if (!login || !password) {
      throw new AsiaInsuranceApiError(
        0,
        'APEX_BOX_LOGIN/APEX_BOX_PASSWORD sozlanmagan',
      );
    }
    const token = Buffer.from(`${login}:${password}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }

  private async post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    { withUserId }: { withUserId: boolean },
  ): Promise<TResponse> {
    const query = withUserId
      ? `?user_id=${encodeURIComponent(this.userId())}`
      : '';
    const res = await fetch(`${this.baseUrl()}${path}${query}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
      body: JSON.stringify(body),
    });
    return this.parse<TResponse>(res);
  }

  private async get<TResponse>(path: string): Promise<TResponse> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      headers: this.authHeader(),
    });
    return this.parse<TResponse>(res);
  }

  private async parse<TResponse>(res: Response): Promise<TResponse> {
    if (!res.ok) {
      throw new AsiaInsuranceApiError(
        res.status,
        `Apex_Box API xatosi: ${res.status}`,
      );
    }
    return (await res.json()) as TResponse;
  }
}
