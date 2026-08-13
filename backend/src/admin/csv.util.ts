// Cells starting with =, +, -, or @ are interpreted as formulas by
// Excel/Sheets when the CSV is opened — a user-controlled fullName/email
// like `=HYPERLINK("http://evil","x")` would otherwise execute for
// whichever admin opens the export. Prefixing with a single quote forces
// spreadsheet apps to treat the cell as plain text.
const FORMULA_TRIGGER = /^[=+\-@]/;

function escapeCsvCell(value: string): string {
  const safeValue = FORMULA_TRIGGER.test(value) ? `'${value}` : value;
  if (/[",\n]/.test(safeValue)) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvCell).join(','),
  );
  // Leading BOM so Excel opens UTF-8 (Uzbek/Cyrillic) text correctly.
  return '﻿' + lines.join('\r\n');
}
