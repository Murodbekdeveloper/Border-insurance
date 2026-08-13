import { Injectable } from '@nestjs/common';
import {
  ChargeInput,
  ChargeResult,
  PaymentGateway,
} from './payment-gateway.interface';

/**
 * Stand-in for a real PCI-DSS compliant acquiring bank / 3D-Secure gateway
 * (e.g. Payme, Click, Uzcard). Swap this provider for a real implementation
 * of PaymentGateway once bank credentials are available — PaymentsService
 * only depends on the interface, not this class.
 *
 * A card whose last 4 digits are "0000" is treated as a decline so the
 * failure path stays reachable/testable without a real gateway.
 */
@Injectable()
export class MockPaymentGatewayService implements PaymentGateway {
  async charge(input: ChargeInput): Promise<ChargeResult> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (input.maskedNumber === '0000' || input.amount <= 0) {
      return { success: false };
    }

    return { success: true, providerReference: `MOCK-${Date.now()}` };
  }
}
