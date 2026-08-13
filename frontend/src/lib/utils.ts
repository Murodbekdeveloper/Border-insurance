import { CardType } from '@/types';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Mastercard also issues in the 2221-2720 BIN range (since 2017), in
// addition to the classic 51-55 range.
function isMastercard2Series(digits: string): boolean {
  const prefix = Number(digits.slice(0, 4));
  return prefix >= 2221 && prefix <= 2720;
}

// Domestic Uzbek BINs, checked before the international ranges below.
// 8600/6262 are plain Uzcard; 5614 is the "UzCard-Mastercard" cobadge BIN —
// the same 16 digits work as Mastercard abroad and as Uzcard (no CVV,
// domestic-only) at home, and 5614 also falls inside Mastercard's classic
// 51-55 range. For this app (domestic OSAGO payments) that card is an
// Uzcard, so the Uzcard/Humo check must win over the generic range check.
const UZCARD_PREFIXES = ['8600', '5614', '6262'];
const HUMO_PREFIXES = ['9860'];

export function detectCardType(cardNumber: string): CardType | null {
  const digits = cardNumber.replace(/\D/g, '');
  if (UZCARD_PREFIXES.some((p) => digits.startsWith(p))) return 'uzcard';
  if (HUMO_PREFIXES.some((p) => digits.startsWith(p))) return 'humo';

  if (digits.startsWith('4')) return 'visa';
  const prefix2 = Number(digits.slice(0, 2));
  if (prefix2 >= 51 && prefix2 <= 55) return 'mastercard';
  if (isMastercard2Series(digits)) return 'mastercard';
  return null;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join('-') ?? digits;
}

export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
}

export function generatePolicyNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `OSG-${year}-${random}`;
}

export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function addYears(dateStr: string, years: number): string {
  const date = new Date(dateStr);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}
