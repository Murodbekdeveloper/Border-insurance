import { timingSafeEqual } from 'crypto';

// Plain `===` on secret tokens leaks timing information proportional to how
// many leading characters match. Used by the two static-bearer-token guards
// (PartnerApiKeyGuard, PaymentCallbackApiKeyGuard) that gate money-affecting
// writes from external callers.
export function timingSafeEqualStrings(
  a: string | undefined,
  b: string | undefined,
): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths — different-length tokens
  // are trivially unequal, and length alone isn't the secret being protected.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
