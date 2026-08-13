import { Injectable, Logger } from '@nestjs/common';
import { PaymeClientService } from '../../payme/payme-client.service';
import { PaymeApiError } from '../../payme/payme-api.error';
import {
  PAYME_RECEIPT_STATE_PAID,
  ReceiptsCreateParams,
  ReceiptsCreateResult,
  ReceiptsPayParams,
  ReceiptsPayResult,
} from '../../payme/payme.types';
import {
  ChargeInput,
  ChargeResult,
  PaymentGateway,
} from './payment-gateway.interface';

// Payme amounts are always in tiyin (1 so'm = 100 tiyin).
function toTiyin(somAmount: number): number {
  return Math.round(somAmount * 100);
}

/**
 * Real Payme Cards API adapter: creates a one-off receipt for the policy
 * and pays it with the caller's already-tokenized, already-verified card
 * (see CardsService.create / confirmPaymeVerification). Selected instead
 * of MockPaymentGatewayService when PAYMENT_GATEWAY_PROVIDER=payme.
 */
@Injectable()
export class PaymePaymentGatewayService implements PaymentGateway {
  private readonly logger = new Logger(PaymePaymentGatewayService.name);

  constructor(private readonly paymeClient: PaymeClientService) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (!input.cardToken) {
      return { success: false };
    }

    try {
      const created = await this.paymeClient.call<
        ReceiptsCreateParams,
        ReceiptsCreateResult
      >('receipts.create', {
        amount: toTiyin(input.amount),
        account: { order_id: input.orderId ?? '' },
      });

      const paid = await this.paymeClient.call<
        ReceiptsPayParams,
        ReceiptsPayResult
      >('receipts.pay', {
        id: created.receipt._id,
        token: input.cardToken,
      });

      return {
        success: paid.receipt.state === PAYME_RECEIPT_STATE_PAID,
        providerReference: paid.receipt._id,
      };
    } catch (err) {
      if (err instanceof PaymeApiError) {
        this.logger.warn(`Payme charge declined: ${err.message}`);
        return { success: false };
      }
      throw err;
    }
  }
}
