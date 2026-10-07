import type { Locale } from '@/store/localeStore';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join('-') ?? digits;
}

export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

// BCP-47 tags for Intl formatting, and each locale's own word for the
// national currency (so'm) — callers that don't care about the active UI
// language (e.g. admin pages, which stay Uzbek-only) can omit `locale` and
// get the original uz-UZ/so'm behavior unchanged.
export const BCP47_LOCALE: Record<Locale, string> = {
  uz: 'uz-UZ',
  ru: 'ru-RU',
  en: 'en-US',
  ky: 'ky-KG',
  zh: 'zh-CN',
};

const CURRENCY_WORD: Record<Locale, string> = {
  uz: "so'm",
  ru: 'сум',
  en: 'UZS',
  ky: 'сом',
  zh: '苏姆',
};

export function formatCurrency(amount: number, locale: Locale = 'uz'): string {
  return `${new Intl.NumberFormat(BCP47_LOCALE[locale]).format(amount)} ${CURRENCY_WORD[locale]}`;
}

export function formatDate(dateStr: string, locale: Locale = 'uz'): string {
  return new Date(dateStr).toLocaleDateString(BCP47_LOCALE[locale]);
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

// Today's calendar date in the browser's own local timezone, as
// YYYY-MM-DD. Deliberately NOT `new Date().toISOString().split('T')[0]`
// (that's UTC's current date) — Uzbekistan is UTC+5 year-round, so
// between local midnight and ~05:00 the local calendar date has already
// advanced but UTC hasn't reached it yet, making the UTC-based string one
// day behind during that whole window.
export function todayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Compares a YYYY-MM-DD date-only string against today's local date as
// plain strings (ISO date strings sort correctly lexicographically) —
// avoids `new Date(dateOnlyString) <= new Date()`, which parses the
// left side as UTC midnight and compares it against the real UTC instant
// on the right, incorrectly rejecting today's date during the same
// UTC/local mismatch window described above.
export function isNotFutureLocalDate(value: string): boolean {
  return value <= todayLocalDateString();
}
