import { ConfigService } from '@nestjs/config';
import { AsiaInsuranceClientService } from './asia-insurance-client.service';
import { AsiaInsuranceApiError } from './asia-insurance-api.error';
import type { CalcRequest, SavePolicyRequest } from './asia-insurance.types';

describe('AsiaInsuranceClientService', () => {
  let service: AsiaInsuranceClientService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const configService = {
      get: (key: string) => {
        const values: Record<string, string> = {
          'insurancePartner.apiUrl': 'https://ais.asia-insurance.uz',
          'insurancePartner.login': 'test-login',
          'insurancePartner.password': 'test-password',
        };
        return values[key];
      },
    } as unknown as ConfigService;

    service = new AsiaInsuranceClientService(configService);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('POSTs /get-calc-osago with a Basic auth header and returns the parsed premium', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: true,
          message: 'success',
          response: { amount_uzs: 168000 },
        }),
    });

    const request: CalcRequest = {
      gos_number: '01G840ZB',
      tech_sery: 'AAG',
      tech_number: '1036199',
      period_id: 1,
      limited: false,
      owner: { person: { birth_date: '2000-01-01', pass_seria: 'AB', pass_number: '1234567' } },
      drivers: [],
    };

    const result = await service.calculatePremium(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ais.asia-insurance.uz/get-calc-osago');
    expect(options.method).toBe('POST');
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('test-login:test-password').toString('base64')}`,
    );
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body as string)).toEqual(request);
    expect(result.response.amount_uzs).toBe(168000);
  });

  it('POSTs /save-policy and returns the partner-issued uuid the regulator will later ask for', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: true,
          message: 'success',
          response: {
            amount_uzs: 40000,
            comission: 32000,
            order_id: 649651,
            transaction_id: 1234567,
            polis_uuid: 'c4a3e1d7-7c42-4d2b-9f7a-2b0b0e7f5c91',
            transaction_uuid: 'c4a3e1d7-7c42-4d2b-9f7a-2b0b0e7f5c91',
            payall_url: 'https://online.asia-insurance.uz',
          },
        }),
    });

    const request: SavePolicyRequest = {
      details: {
        transaction_id: 26546,
        start_date: '2025-10-27',
        period_id: 1,
        limited: false,
        phone_number: '998881234567',
        amount_uzs: 40000,
      },
      techPassport: { govNumber: '01X123XX', tech_sery: 'AAF', tech_number: '1234567' },
      drivers: [],
      owner: { person: { birth_date: '2000-01-01', pass_seria: 'AB', pass_number: '1234567' } },
      applicant: { birth_date: '2000-01-01', pass_seria: 'AB', pass_number: '1234567' },
    };

    const result = await service.savePolicy(request);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ais.asia-insurance.uz/save-policy');
    expect(result.response.transaction_uuid).toBe(
      'c4a3e1d7-7c42-4d2b-9f7a-2b0b0e7f5c91',
    );
  });

  it('GETs /get-period with just the auth header (no body)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ items: [{ period: 1, name: '1 yil' }] }),
    });

    const result = await service.getPeriods();

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ais.asia-insurance.uz/get-period');
    expect(options.method).toBeUndefined();
    expect(result.items[0].period).toBe(1);
  });

  it('throws AsiaInsuranceApiError with the HTTP status on a non-2xx response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    await expect(service.getRelatives()).rejects.toMatchObject({
      httpStatus: 401,
    } satisfies Partial<AsiaInsuranceApiError>);
  });

  it('throws before ever calling fetch when the login/password are not configured', async () => {
    const configService = {
      get: (key: string) =>
        key === 'insurancePartner.apiUrl' ? 'https://ais.asia-insurance.uz' : '',
    } as unknown as ConfigService;
    service = new AsiaInsuranceClientService(configService);

    await expect(service.getPeriods()).rejects.toThrow(AsiaInsuranceApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
