export function maskDigits(value: string, maxLen: number): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}

export function maskLetters(value: string, maxLen: number): string {
  return value
    .replace(/[^A-Za-zА-Яа-яЎўҚқҒғҲҳ'\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maxLen);
}

export function maskLettersStrict(value: string, maxLen: number): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, maxLen);
}

export function maskAlnumUpper(value: string, maxLen: number): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLen);
}

export function maskLettersUpper(value: string, maxLen: number): string {
  return value
    .toUpperCase()
    .replace(/[^A-ZА-ЯЎҚҒҲ'\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maxLen);
}

export function maskPlateNumber(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 12);
}

export function maskExpDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length === 0) return '';

  let month = digits.slice(0, 2);
  if (month.length === 2) {
    const monthNum = Number(month);
    if (monthNum === 0) month = '01';
    else if (monthNum > 12) month = '12';
  } else if (month.length === 1 && Number(month) > 1) {
    month = `0${month}`;
  }

  const year = digits.slice(2, 4);
  return year.length > 0 ? `${month}/${year}` : month;
}

export function maskYear(value: string): string {
  return maskDigits(value, 4);
}

export function maskPhoneUZ(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  return `+998${digits}`;
}
