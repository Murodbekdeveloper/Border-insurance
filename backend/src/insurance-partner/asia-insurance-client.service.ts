import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsiaInsuranceApiError } from './asia-insurance-api.error';
import {
  CalcRequest,
  CalcResponse,
  GetPeriodResponse,
  GetPolicyRequest,
  GetPolicyResponse,
  GetRelativeResponse,
  SavePolicyRequest,
  SavePolicyResponse,
  VehicleLookupRequest,
  VehicleLookupResponse,
} from './asia-insurance.types';

/**
 * Thin REST client for Asia Insurance's OSAGO issuance API
 * (swagger.asia-insurance.uz/ui/osago3, base https://ais.asia-insurance.uz/).
 * Outbound direction only — this app calling them to price a policy,
 * register the order, and fetch the finished document. The regulator-
 * facing inbound side lives in PartnerTransactionsController instead.
 *
 * Auth: HTTP Basic (login/password), confirmed against their published spec
 * at swagger.asia-insurance.uz/swagger-files/osago3.yaml
 * (components.securitySchemes.BasicAuth, type: http / scheme: basic).
 */
@Injectable()
export class AsiaInsuranceClientService {
  constructor(private readonly configService: ConfigService) {}

  // get-calc-osago is shared between production and sandbox (confirmed by
  // Asia Insurance 2026-08-18) — it's the only call that never gets the
  // /sandbox path prefix, even in sandbox mode.
  calculatePremium(request: CalcRequest): Promise<CalcResponse> {
    return this.post<CalcRequest, CalcResponse>('/get-calc-osago', request, {
      sandboxPrefixed: false,
    });
  }

  // Confirmed against the sandbox host 2026-08-18: /sandbox/save-policy
  // returns 401 (route exists, auth rejected — see sandboxApiUrl's config
  // comment) vs 404 without the prefix, so unlike get-period/get-relative
  // this one genuinely is sandbox-specific.
  savePolicy(request: SavePolicyRequest): Promise<SavePolicyResponse> {
    return this.post<SavePolicyRequest, SavePolicyResponse>(
      '/save-policy',
      request,
      { sandboxPrefixed: true },
    );
  }

  // Sandbox path unconfirmed with Asia Insurance — assumed /sandbox-
  // prefixed like save-policy/get-period/get-relative until verified.
  getPolicy(request: GetPolicyRequest): Promise<GetPolicyResponse> {
    return this.post<GetPolicyRequest, GetPolicyResponse>(
      '/get-policy',
      request,
      { sandboxPrefixed: true },
    );
  }

  // Empirically confirmed against the sandbox host 2026-08-18: /get-period
  // returns 401 (route exists, auth rejected) without a /sandbox prefix but
  // 404 (no such route) with one — reference data shared with production,
  // same as get-calc-osago, despite the /sandbox/get-period URL Asia
  // Insurance's message listed (likely a copy/paste slip on their end).
  getPeriods(): Promise<GetPeriodResponse> {
    return this.get<GetPeriodResponse>('/get-period', {
      sandboxPrefixed: false,
    });
  }

  // Same finding as getPeriods() above — confirmed shared, not /sandbox-prefixed.
  getRelatives(): Promise<GetRelativeResponse> {
    return this.get<GetRelativeResponse>('/get-relative', {
      sandboxPrefixed: false,
    });
  }

  // Path unconfirmed for both production and sandbox — see the comment on
  // VehicleLookupRequest.
  lookupVehicle(request: VehicleLookupRequest): Promise<VehicleLookupResponse> {
    return this.post<VehicleLookupRequest, VehicleLookupResponse>(
      '/get-vehicle',
      request,
      { sandboxPrefixed: true },
    );
  }

  private isSandbox(): boolean {
    return (
      this.configService.get<string>('insurancePartner.mode') === 'sandbox'
    );
  }

  private baseUrl(): string {
    const configKey = this.isSandbox()
      ? 'insurancePartner.sandboxApiUrl'
      : 'insurancePartner.apiUrl';
    const apiUrl = this.configService.get<string>(configKey);
    if (!apiUrl) {
      throw new AsiaInsuranceApiError(0, `${configKey} sozlanmagan`);
    }
    return apiUrl;
  }

  // Asia Insurance's sandbox mirrors each production path under an extra
  // /sandbox segment — except get-calc-osago (sandboxPrefixed: false).
  private buildPath(path: string, sandboxPrefixed: boolean): string {
    return this.isSandbox() && sandboxPrefixed ? `/sandbox${path}` : path;
  }

  private authHeader(): Record<string, string> {
    const login = this.configService.get<string>('insurancePartner.login');
    const password = this.configService.get<string>(
      'insurancePartner.password',
    );
    if (!login || !password) {
      throw new AsiaInsuranceApiError(
        0,
        'INSURANCE_PARTNER_LOGIN/INSURANCE_PARTNER_PASSWORD sozlanmagan',
      );
    }
    const token = Buffer.from(`${login}:${password}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }

  private async post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    { sandboxPrefixed }: { sandboxPrefixed: boolean },
  ): Promise<TResponse> {
    const url = `${this.baseUrl()}${this.buildPath(path, sandboxPrefixed)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader(),
      },
      body: JSON.stringify(body),
    });
    return this.parse<TResponse>(res);
  }

  private async get<TResponse>(
    path: string,
    { sandboxPrefixed }: { sandboxPrefixed: boolean },
  ): Promise<TResponse> {
    const url = `${this.baseUrl()}${this.buildPath(path, sandboxPrefixed)}`;
    const res = await fetch(url, {
      headers: this.authHeader(),
    });
    return this.parse<TResponse>(res);
  }

  private async parse<TResponse>(res: Response): Promise<TResponse> {
    if (!res.ok) {
      throw new AsiaInsuranceApiError(
        res.status,
        `Asia Insurance API xatosi: ${res.status}`,
      );
    }
    return (await res.json()) as TResponse;
  }
}
