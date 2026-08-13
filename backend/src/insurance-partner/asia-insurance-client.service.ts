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

  calculatePremium(request: CalcRequest): Promise<CalcResponse> {
    return this.post<CalcRequest, CalcResponse>('/get-calc-osago', request);
  }

  savePolicy(request: SavePolicyRequest): Promise<SavePolicyResponse> {
    return this.post<SavePolicyRequest, SavePolicyResponse>(
      '/save-policy',
      request,
    );
  }

  getPolicy(request: GetPolicyRequest): Promise<GetPolicyResponse> {
    return this.post<GetPolicyRequest, GetPolicyResponse>(
      '/get-policy',
      request,
    );
  }

  getPeriods(): Promise<GetPeriodResponse> {
    return this.get<GetPeriodResponse>('/get-period');
  }

  getRelatives(): Promise<GetRelativeResponse> {
    return this.get<GetRelativeResponse>('/get-relative');
  }

  private baseUrl(): string {
    const apiUrl = this.configService.get<string>('insurancePartner.apiUrl');
    if (!apiUrl) {
      throw new AsiaInsuranceApiError(
        0,
        'INSURANCE_PARTNER_API_URL sozlanmagan',
      );
    }
    return apiUrl;
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
  ): Promise<TResponse> {
    const res = await fetch(`${this.baseUrl()}${path}`, {
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
        `Asia Insurance API xatosi: ${res.status}`,
      );
    }
    return (await res.json()) as TResponse;
  }
}
