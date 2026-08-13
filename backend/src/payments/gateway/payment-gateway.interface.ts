export interface ChargeInput {
  amount: number;
  maskedNumber: string;
  // Only populated when the Payme gateway is active — the card's Payme
  // token (see Card.paymeToken) and a merchant-side reference for the
  // receipt (the policy id). MockPaymentGatewayService ignores both.
  cardToken?: string;
  orderId?: string;
}

export interface ChargeResult {
  success: boolean;
  providerReference?: string;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>;
}
