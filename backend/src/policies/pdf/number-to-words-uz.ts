// Converts an integer so'm amount to its Uzbek word form, matching the
// exact style used on official OSAGO policy documents (ersp.e-osgo.uz),
// e.g. 40_000_000 -> "Qirq million", 56_000 -> "Ellik olti ming", 0 -> "Nol".
const ONES = [
  '',
  'bir',
  'ikki',
  'uch',
  "to'rt",
  'besh',
  'olti',
  'yetti',
  'sakkiz',
  "to'qqiz",
];
const TENS = [
  '',
  "o'n",
  'yigirma',
  "o'ttiz",
  'qirq',
  'ellik',
  'oltmish',
  'yetmish',
  'sakson',
  "to'qson",
];
const SCALES: { value: number; word: string }[] = [
  { value: 1_000_000_000, word: 'milliard' },
  { value: 1_000_000, word: 'million' },
  { value: 1_000, word: 'ming' },
];

function threeDigitsToWords(num: number): string {
  const hundreds = Math.floor(num / 100);
  const remainder = num % 100;
  const parts: string[] = [];
  if (hundreds > 0) {
    parts.push(hundreds > 1 ? `${ONES[hundreds]} yuz` : 'yuz');
  }
  if (remainder > 0) {
    const tensDigit = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;
    if (tensDigit > 0) parts.push(TENS[tensDigit]);
    if (onesDigit > 0) parts.push(ONES[onesDigit]);
  }
  return parts.join(' ');
}

export function numberToWordsUz(amount: number): string {
  if (amount === 0) return 'Nol';

  let remaining = Math.floor(amount);
  const parts: string[] = [];
  for (const scale of SCALES) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining %= scale.value;
      parts.push(`${threeDigitsToWords(count)} ${scale.word}`.trim());
    }
  }
  if (remaining > 0) {
    parts.push(threeDigitsToWords(remaining));
  }

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
