import { ConfigService } from '@nestjs/config';
import { PaymeClientService } from './payme-client.service';
import { PaymeApiError } from './payme-api.error';

describe('PaymeClientService', () => {
  let service: PaymeClientService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    const configService = {
      get: (key: string) => {
        const values: Record<string, string> = {
          'payme.endpoint': 'https://checkout.test.paycom.uz/api',
          'payme.merchantId': 'merchant-1',
          'payme.key': 'secret-key',
        };
        return values[key];
      },
    } as unknown as ConfigService;

    service = new PaymeClientService(configService);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('POSTs a JSON-RPC 2.0 envelope with the Payme X-Auth header', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ result: { ok: true } }),
    });

    await service.call('cards.create', {
      card: { number: '8600495473316478', expire: '3012' },
      save: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://checkout.test.paycom.uz/api');
    expect(options.method).toBe('POST');
    const headers = options.headers as Record<string, string>;
    expect(headers['X-Auth']).toBe('merchant-1:secret-key');
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body as string) as {
      method: string;
      params: unknown;
    };
    expect(body.method).toBe('cards.create');
    expect(body.params).toEqual({
      card: { number: '8600495473316478', expire: '3012' },
      save: true,
    });
  });

  it('throws a PaymeApiError when Payme returns an error envelope', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          error: { code: -31630, message: 'Karta rad etildi' },
        }),
    });

    await expect(
      service.call('receipts.pay', { id: 'x', token: 'y' }),
    ).rejects.toMatchObject({
      code: -31630,
      message: 'Karta rad etildi',
    } satisfies Partial<PaymeApiError>);
  });

  it('returns the result payload on success', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({ result: { receipt: { _id: 'r1', state: 4 } } }),
    });

    const result = await service.call<
      { id: string; token: string },
      { receipt: { _id: string; state: number } }
    >('receipts.pay', { id: 'r1', token: 'card-token' });

    expect(result.receipt.state).toBe(4);
  });
});
