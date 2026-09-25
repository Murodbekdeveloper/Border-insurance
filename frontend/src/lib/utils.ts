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
