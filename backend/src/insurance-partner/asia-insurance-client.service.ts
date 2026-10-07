import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AsiaInsuranceClientService.name);

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

  // CORRECTED 2026-09-10: confirmed empirically against the sandbox host —
  // /sandbox/get-policy 404s, plain /get-policy 200s (returns a normal
  // business-logic error for an unrecognized order_id/transaction_id,
  // proving the route itself exists) — shared with production like
  // get-calc-osago/get-period/get-relative, NOT /sandbox-prefixed like
  // save-policy.
  getPolicy(request: GetPolicyRequest): Promise<GetPolicyResponse> {
    return this.post<GetPolicyRequest, GetPolicyResponse>(
      '/get-policy',
      request,
      { sandboxPrefixed: false },
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

  // CONFIRMED 2026-09-21 against the sandbox host, both with and without
  // the /sandbox prefix: both return Oracle ORDS's own "NotFound" body
  // (code: "NotFound", type: tag:oracle.com,2020:error/NotFound) — the
  // signature this codebase already treats elsewhere as "route doesn't
  // exist at all" (vs. a 401 meaning the route exists but auth/payload was
  // rejected, or a real business-logic "not found" from Asia Insurance's
  // own app layer). So /get-vehicle isn't just unconfirmed, it's confirmed
  // absent — Asia Insurance has never published this endpoint (osago3.yaml
  // only documents get-calc-osago/save-policy/get-policy/get-period/
  // get-relative). Short-circuit instead of making a network call that can
  // only ever 404: VehiclesController already treats any
  // AsiaInsuranceApiError as "not found" and falls back to manual entry,
  // so this is behavior-neutral for users — just faster, and honest in
  // logs/monitoring instead of looking like a flaky call. Revert to the
  // real request once Asia Insurance confirms an actual path.
  lookupVehicle(
    _request: VehicleLookupRequest,
  ): Promise<VehicleLookupResponse> {
    return Promise.reject(
      new AsiaInsuranceApiError(
        404,
        "Asia Insurance /get-vehicle: rasman tasdiqlangan endpoint yo'q",
      ),
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

  private async get<TResponse>(
    path: string,
    { sandboxPrefixed }: { sandboxPrefixed: boolean },
  ): Promise<TResponse> {
    const url = `${this.baseUrl()}${this.buildPath(path, sandboxPrefixed)}`;
    const res = await this.doFetch(url, { headers: this.authHeader() });
    return this.parse<TResponse>(res, url);
  }

  // fetch() itself can reject — DNS failure, connection refused, TLS
  // error, timeout — before any HTTP response exists at all, which
  // parse()'s res.ok check never sees. Unlike a non-2xx response (a real,
  // logged AsiaInsuranceApiError), this used to propagate as a bare
  // TypeError: neither caught by wrap()'s instanceof check nor logged
  // anywhere, surfacing to the customer as Nest's generic, undiagnosable
  // "Internal server error" with zero trace of what actually failed.
  private async doFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.error(`${url} -> network error: ${detail}`);
      // -1 (distinct from authHeader()/baseUrl()'s 0 for "not configured
      // at all") — the request was attempted but the connection itself
      // failed, which PoliciesController.wrap() reports differently.
      throw new AsiaInsuranceApiError(
        -1,
        `Asia Insurance bilan tarmoq ulanishida xatolik: ${detail}`,
      );
    }
  }

  private async parse<TResponse>(
    res: Response,
    url: string,
  ): Promise<TResponse> {
    if (!res.ok) {
      // Asia Insurance's actual rejection reason (invalid plate format,
      // unknown vehicle, bad payload field, etc.) lives in the response
      // body — without logging it here, it's lost the moment this throws,
      // and the customer/Render logs only ever see a bare status code.
      const bodyText = await res.text().catch(() => '');
      this.logger.error(
        `${url} -> ${res.status}: ${bodyText.slice(0, 2000) || '(empty body)'}`,
      );
      throw new AsiaInsuranceApiError(
        res.status,
        `Asia Insurance API xatosi: ${res.status}${bodyText ? ` — ${bodyText.slice(0, 500)}` : ''}`,
      );
    }
    return (await res.json()) as TResponse;
  }
}
