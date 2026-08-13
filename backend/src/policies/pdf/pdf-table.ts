// Minimal bordered-table renderer for pdfkit, which has no table support of
// its own. Cell height is measured per-row (via heightOfString) so
// multi-line text doesn't get clipped or overlap the next row.
//
// Ligatures disabled on every cell — see NO_LIGATURES in pdf.service.ts for
// why (Noto Sans's default "fi"/"fl" ligature glyphs break text extraction).
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const NO_LIGATURES = { features: ['-liga'] as any };

export interface TableCell {
  text: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export function drawTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  columnWidths: number[],
  rows: TableCell[][],
  options: {
    fontSize?: number;
    cellPadding?: number;
    headerRows?: number;
  } = {},
): number {
  const fontSize = options.fontSize ?? 8;
  const padding = options.cellPadding ?? 4;
  const headerRows = options.headerRows ?? 0;
  let cursorY = y;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isHeader = r < headerRows;

    let rowHeight = 0;
    row.forEach((cell, i) => {
      doc
        .font(cell.bold || isHeader ? 'NotoSans-Bold' : 'NotoSans')
        .fontSize(fontSize);
      const h = doc.heightOfString(cell.text, {
        width: columnWidths[i] - padding * 2,
        align: cell.align ?? 'left',
        ...NO_LIGATURES,
      });
      rowHeight = Math.max(rowHeight, h + padding * 2);
    });

    let cellX = x;
    row.forEach((cell, i) => {
      doc.rect(cellX, cursorY, columnWidths[i], rowHeight).stroke('#94a3b8');
      if (isHeader) {
        doc.rect(cellX, cursorY, columnWidths[i], rowHeight).fill('#f1f5f9');
        doc.fillColor('#0f172a');
      }
      doc
        .font(cell.bold || isHeader ? 'NotoSans-Bold' : 'NotoSans')
        .fontSize(fontSize)
        .fillColor('#0f172a');
      doc.text(cell.text, cellX + padding, cursorY + padding, {
        width: columnWidths[i] - padding * 2,
        align: cell.align ?? 'left',
        ...NO_LIGATURES,
      });
      cellX += columnWidths[i];
    });

    cursorY += rowHeight;
  }

  return cursorY;
}
