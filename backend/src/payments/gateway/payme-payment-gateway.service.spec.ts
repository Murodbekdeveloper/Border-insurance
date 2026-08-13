import { PaymePaymentGatewayService } from './payme-payment-gateway.service';
import { PaymeClientService } from '../../payme/payme-client.service';
import { PaymeApiError } from '../../payme/payme-api.error';

describe('PaymePaymentGatewayService', () => {
  let service: PaymePaymentGatewayService;
  let paymeClient: { call: jest.Mock };

  beforeEach(() => {
    paymeClient = { call: jest.fn() };
    service = new PaymePaymentGatewayService(
      paymeClient as unknown as PaymeClientService,
    );
  });

  it('declines without calling Payme when no card token is present', async () => {
    const result = await service.charge({
      amount: 600_000,
      maskedNumber: '1111',
    });

    expect(result.success).toBe(false);
    expect(paymeClient.call).not.toHaveBeenCalled();
  });

  it('creates a receipt in tiyin and pays it with the card token', async () => {
    paymeClient.call
      .mockResolvedValueOnce({ receipt: { _id: 'receipt-1', state: 0 } })
      .mockResolvedValueOnce({ receipt: { _id: 'receipt-1', state: 4 } });

    const result = await service.charge({
      amount: 600_000,
      maskedNumber: '1111',
      cardToken: 'card-token-abc',
      orderId: 'policy-1',
    });

    expect(paymeClient.call).toHaveBeenNthCalledWith(1, 'receipts.create', {
      amount: 60_000_000,
      account: { order_id: 'policy-1' },
    });
    expect(paymeClient.call).toHaveBeenNthCalledWith(2, 'receipts.pay', {
      id: 'receipt-1',
      token: 'card-token-abc',
    });
    expect(result).toEqual({ success: true, providerReference: 'receipt-1' });
  });

  it('reports failure when the receipt state is not "paid"', async () => {
    paymeClient.call
      .mockResolvedValueOnce({ receipt: { _id: 'receipt-1', state: 0 } })
      .mockResolvedValueOnce({ receipt: { _id: 'receipt-1', state: 1 } });

    const result = await service.charge({
      amount: 600_000,
      maskedNumber: '1111',
      cardToken: 'card-token-abc',
      orderId: 'policy-1',
    });

    expect(result.success).toBe(false);
  });

  it('reports failure (not an exception) when Payme rejects the charge', async () => {
    paymeClient.call.mockRejectedValue(new PaymeApiError(-31630, 'declined'));

    const result = await service.charge({
      amount: 600_000,
      maskedNumber: '1111',
      cardToken: 'card-token-abc',
      orderId: 'policy-1',
    });

    expect(result.success).toBe(false);
  });

  it('rethrows unexpected (non-Payme) errors', async () => {
    paymeClient.call.mockRejectedValue(new Error('network down'));

    await expect(
      service.charge({
        amount: 600_000,
        maskedNumber: '1111',
        cardToken: 'card-token-abc',
        orderId: 'policy-1',
      }),
    ).rejects.toThrow('network down');
  });
});
