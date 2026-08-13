import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymeApiError } from './payme-api.error';
import { PaymeJsonRpcRequest, PaymeJsonRpcResponse } from './payme.types';

/**
 * Thin JSON-RPC 2.0 client for Payme's merchant-initiated Cards API
 * (cards.create / cards.get_verify_code / cards.verify / receipts.*).
 * See https://developer.help.paycom.uz/ for the wire format this mirrors.
 *
 * This is the outbound direction (our backend calling Payme). It is
 * unrelated to Payme's inbound webhook API (Payme calling a merchant
 * endpoint with CheckPerformTransaction/PerformTransaction/etc.), which
 * this app does not implement since card charges are user-initiated here.
 */
@Injectable()
export class PaymeClientService {
  constructor(private readonly configService: ConfigService) {}

  async call<P extends object, R>(method: string, params: P): Promise<R> {
    const endpoint = this.configService.get<string>('payme.endpoint');
    const merchantId = this.configService.get<string>('payme.merchantId');
    const key = this.configService.get<string>('payme.key');

    const request: PaymeJsonRpcRequest<P> = {
      id: Date.now(),
      method,
      params,
    };

    const res = await fetch(endpoint as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': `${merchantId}:${key}`,
      },
      body: JSON.stringify(request),
    });

    const body = (await res.json()) as PaymeJsonRpcResponse<R>;

    if (body.error) {
      throw new PaymeApiError(body.error.code, body.error.message);
    }
    if (!body.result) {
      throw new PaymeApiError(-32603, 'Empty result from Payme');
    }
    return body.result;
  }
}
