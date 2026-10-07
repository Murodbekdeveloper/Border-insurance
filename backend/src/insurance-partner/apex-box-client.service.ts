import { Injectable, Logger } from '@nestjs/common';
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
 * Wired into PoliciesService.submitToPartner(), which routes a policy here
 * instead of to osago_v3 whenever vehicle.registrationCountry is "Xorij"
 * (see ApexBoxService.submitPolicy()/PartnerPolicySyncCron for the
 * submission and payment-polling side of that flow). Still blocked on
 * real APEX_BOX_LOGIN/PASSWORD/USER_ID credentials (Asia Insurance to
 * provide) and on their unresolved details.startDate/endDate validation
 * bug — see the NOT YET RESOLVED comment in
 * ApexBoxService.buildCreatePolicyRequest.
 */
@Injectable()
export class ApexBoxClientService {
  private readonly logger = new Logger(ApexBoxClientService.name);

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
    const url = `${this.baseUrl()}${path}${query}`;
    const res = await this.doFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
      body: JSON.stringify(body),
    });
    return this.parse<TResponse>(res, url);
  }

  private async get<TResponse>(path: string): Promise<TResponse> {
    const url = `${this.baseUrl()}${path}`;
    const res = await this.doFetch(url, { headers: this.authHeader() });
    return this.parse<TResponse>(res, url);
  }

  // See AsiaInsuranceClientService.doFetch — fetch() itself can reject
  // (DNS, timeout, refused, TLS) before any HTTP response exists, which
  // parse()'s res.ok check never sees.
  private async doFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`${url} -> network error: ${detail}`);
      throw new AsiaInsuranceApiError(
        -1,
        `Apex_Box bilan tarmoq ulanishida xatolik: ${detail}`,
      );
    }
  }

  private async parse<TResponse>(
    res: Response,
    url: string,
  ): Promise<TResponse> {
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      this.logger.error(
        `${url} -> ${res.status}: ${bodyText.slice(0, 2000) || '(empty body)'}`,
      );
      throw new AsiaInsuranceApiError(
        res.status,
        `Apex_Box API xatosi: ${res.status}${bodyText ? ` — ${bodyText.slice(0, 500)}` : ''}`,
      );
    }
    return (await res.json()) as TResponse;
  }
}
