import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import {
  DriverRestriction,
  InsurancePolicy,
} from '../entities/insurance-policy.entity';
import { Driver } from '../entities/driver.entity';
import { User } from '../../users/entities/user.entity';
import { drawTable, TableCell } from './pdf-table';
import { numberToWordsUz } from './number-to-words-uz';

// Layout/content mirrors the real ЕРСП (ersp.e-osgo.uz) OSAGO policy PDF
// format the product owner supplied as a reference (frontend/pdfshablon/
// export-to-pdf.pdf). A few fields that document shows aren't collected by
// this app yet, and are called out at the point they're used below:
//   - ПИНФЛ (JSHSHIR) — not on User; the row is simply omitted.
//   - "Sug'urta summasi" (statutory payout limit, shown as 40,000,000 so'm
//     in the reference) — Uzbekistan's actual current OSAGO law figure
//     isn't something this app can source reliably; OSAGO_INSURANCE_SUM
//     below mirrors the reference document's value and needs confirming
//     against the current qonun/reglament before this goes live.
//   - The davlat gerbi (state emblem) image in the header — no
//     redistribution-safe copy of that asset is available here; the space
//     is left blank rather than guessing at one.
//   - Driver F.I.O./license split and "qarindoshlik darajasi" name — see
//     splitFio()/splitLicense() and the relativeId handling in
//     buildDriverRows() below.
const OSAGO_INSURANCE_SUM = 40_000_000;

const FONT_REGULAR = 'NotoSans';
const FONT_BOLD = 'NotoSans-Bold';
const INK = '#0f172a';
const MUTED = '#475569';

// Noto Sans has a default-on "fi"/"fl" ligature (GSUB 'liga') — pdfkit/
// fontkit apply it automatically, which leaves those glyph pairs without a
// ToUnicode mapping back to plain "f"+"i"/"f"+"l". The PDF still *looks*
// right, but copy-pasting or extracting text from it drops those letters
// (e.g. "filiali" -> "fliali", "muvofiq" -> "muvofq") — real risk for a
// legal document. Every .text() call below disables it explicitly.
// The "-liga" (disable) syntax is fontkit's own convention and works at
// runtime, but @types/pdfkit's OpenTypeFeatures union only lists bare
// enable-style tags ("liga", not exported for reuse here either) — hence
// the `any`.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const NO_LIGATURES = { features: ['-liga'] as any };

function formatDateUz(date: Date | null): {
  day: string;
  month: string;
  year: string;
} {
  const MONTHS_UZ = [
    'Yanvar',
    'Fevral',
    'Mart',
    'Aprel',
    'May',
    'Iyun',
    'Iyul',
    'Avgust',
    'Sentabr',
    'Oktabr',
    'Noyabr',
    'Dekabr',
  ];
  if (!date) return { day: '-', month: '-', year: '-' };
  const d = new Date(date);
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS_UZ[d.getMonth()],
    year: String(d.getFullYear()),
  };
}

function formatSom(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount);
}

// Naive "Familiya Ism Otasining ismi" split — this app collects a driver's
// name as one free-text field, unlike the reference document's three
// separate F/I/O columns. Works for the common 3-token Uzbek name order;
// anything shorter/longer just leaves O blank or folds extra tokens into it.
function splitFio(fullName: string): { f: string; i: string; o: string } {
  const parts = fullName.trim().split(/\s+/);
  return { f: parts[0] ?? '', i: parts[1] ?? '', o: parts.slice(2).join(' ') };
}

// This app stores a driver's license as one free-text field
// (e.g. "LIC123456"), not the reference document's separate series+number.
// Splits it when it looks like "<letters><digits>"; otherwise the whole
// string is shown as the number with an empty series.
function splitLicense(licenseNumber: string | null): {
  series: string;
  number: string;
} {
  // Only collected for a foreign-registered vehicle's drivers now — see
  // Driver.licenseNumber's comment — so a domestic driver may not have one.
  if (!licenseNumber) return { series: '', number: '' };
  const match = /^([A-Za-z]{1,3})\s*([0-9]+)$/.exec(licenseNumber.trim());
  return match
    ? { series: match[1].toUpperCase(), number: match[2] }
    : { series: '', number: licenseNumber };
}

@Injectable()
export class PdfService {
  constructor(private readonly configService: ConfigService) {}

  async generatePolicyPdf(
    policy: InsurancePolicy,
    user: User,
  ): Promise<Buffer> {
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const verifyUrl = `${frontendUrl}/verify/${policy.policyNumber}`;
    const qrCodeBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 90,
      margin: 0,
    });

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.registerFont(
      FONT_REGULAR,
      join(__dirname, 'fonts/NotoSans-Regular.ttf'),
    );
    doc.registerFont(FONT_BOLD, join(__dirname, 'fonts/NotoSans-Bold.ttf'));
    doc.font(FONT_REGULAR);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    const pageWidth = doc.page.width;
    const marginX = doc.page.margins.left;
    const contentWidth = pageWidth - marginX * 2;

    this.renderPage1(doc, policy, user, qrCodeBuffer, marginX, contentWidth);
    doc.addPage();
    this.renderPage2(doc, policy, marginX, contentWidth);

    doc.end();
    return done;
  }

  private renderPage1(
    doc: PDFKit.PDFDocument,
    policy: InsurancePolicy,
    user: User,
    qrCodeBuffer: Buffer,
    marginX: number,
    contentWidth: number,
  ): void {
    const vehicle = policy.vehicle;
    const limited = policy.driverRestriction === DriverRestriction.RESTRICTED;

    // --- Header: system name (left), state emblem (center), QR (right) ---
    doc
      .font(FONT_BOLD)
      .fontSize(10)
      .fillColor(INK)
      .text('YAGONA', marginX, 36, { width: 200, lineGap: -2, ...NO_LIGATURES })
      .text('AVTOMATLASHTIRILGAN', marginX, doc.y, {
        width: 200,
        lineGap: -2,
        ...NO_LIGATURES,
      })
      .text('AXBOROT TIZIMI', marginX, doc.y, {
        width: 200,
        lineGap: -2,
        ...NO_LIGATURES,
      });
    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(MUTED)
      .text('ersp.e-osgo.uz', marginX, doc.y + 2, NO_LIGATURES);

    doc.image(
      join(__dirname, 'assets/emblem-uz.png'),
      marginX + contentWidth / 2 - 40,
      30,
      { width: 80 },
    );

    doc.image(qrCodeBuffer, marginX + contentWidth - 90, 36, { width: 90 });

    // Starts below the QR block (36 + 90 height + padding) — a fixed y=100
    // here would sit under the QR code instead of below it.
    let y = 136;
    doc
      .font(FONT_BOLD)
      .fontSize(10)
      .fillColor(INK)
      .text(`Seriya/Серия EAPL № ${policy.policyNumber ?? '-'}`, marginX, y, {
        width: contentWidth,
        align: 'right',
        ...NO_LIGATURES,
      });
    y = doc.y + 10;

    // Note: an earlier attempt underlined just the CHEKLANGAN/ОГРАНИЧЕННЫМ
    // word using pdfkit's `continued` text chaining — pdfkit's line-wrapping
    // for `continued` runs doesn't compose correctly with `align: 'center'`
    // once the paragraph wraps to a second line (segments overlap instead
    // of flowing), so that's reverted here in favor of correct, legible
    // (non-underlined) text over a broken "1:1" detail.
    const limitedWordUz = limited ? 'CHEKLANGAN' : 'CHEKLANMAGAN';
    const limitedWordRu = limited ? 'ОГРАНИЧЕННЫМ' : 'НЕОГРАНИЧЕННЫМ';
    doc
      .font(FONT_BOLD)
      .fontSize(10)
      .fillColor(INK)
      .text(
        `Transport vositalari egalarining fuqarolik javobgarligini majburiy sug'urta qilish bo'yicha haydovchilar soni «${limitedWordUz}» holda foydalanish sharti bilan rasmiylashtirilgan`,
        marginX,
        y,
        { width: contentWidth, align: 'center', ...NO_LIGATURES },
      );
    y = doc.y + 4;
    doc
      .font(FONT_BOLD)
      .fontSize(13)
      .text("SUG'URTA POLISI", marginX, y, {
        width: contentWidth,
        align: 'center',
        ...NO_LIGATURES,
      });
    y = doc.y + 6;
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `по обязательному страхованию гражданской ответственности владельцев транспортных средств, оформленный на условиях использования «${limitedWordRu}» количеством водителей`,
        marginX,
        y,
        { width: contentWidth, align: 'center', ...NO_LIGATURES },
      );
    y = doc.y + 4;
    doc
      .font(FONT_BOLD)
      .fontSize(11)
      .fillColor(INK)
      .text('СТРАХОВОЙ ПОЛИС', marginX, y, {
        width: contentWidth,
        align: 'center',
        ...NO_LIGATURES,
      });
    y = doc.y + 10;

    const validFrom = formatDateUz(policy.validFrom);
    const validTo = formatDateUz(policy.validTo);
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .text(
        `Sug'urta polisining amal qilish muddati/Период действия страхового полиса: с «${validFrom.day}» ${validFrom.month} ${validFrom.year} y./г. dan по «${validTo.day}» ${validTo.month} ${validTo.year} y./г. gacha`,
        marginX,
        y,
        { width: contentWidth, align: 'center', ...NO_LIGATURES },
      );
    y = doc.y + 14;

    // --- Section 1: Insurer (static company details — see file-level note) ---
    y = this.numberedField(
      doc,
      marginX,
      y,
      contentWidth,
      '1.',
      '"APEX INSURANCE" AJ TOSHKENT SHAHRI, MIROBOD TUMANI, MINGO\'RIK MFY, SODIQ AZIMOV KO\'CHASI, 77-UY\nр.с. 20208000100906785001 ИНН 305684696 МФО 01041 ОПЕРУ АКБ "InFinBank"',
      "Sug'urtalovchining to'liq nomi va rekvizitlari/Полное наименование и реквизиты страховщика",
    );

    // --- Section 2: Insured person ---
    const passport =
      user.passportSeries && user.passportNumber
        ? `${user.passportSeries} ${user.passportNumber}`
        : '';
    y = this.numberedField(
      doc,
      marginX,
      y,
      contentWidth,
      '2.',
      `${user.fullName}${passport ? ` ${passport}` : ''}`,
      "Sug'urta qildiruvchining to'liq nomi (F.I.O.) va rekvizitlari/Полное наименование (Ф.И.О.) и реквизиты страхователя",
    );

    // --- Section 3: Phone — one digit per box, matching the reference layout ---
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(INK)
      .text(
        "3. Sug'urta qildiruvchining telefon raqami /Номер телефона страхователя:",
        marginX,
        y,
        { width: 230, ...NO_LIGATURES },
      );
    const digits = (user.phone ?? '').replace(/\D/g, '').split('');
    this.drawDigitBoxes(doc, marginX + 235, y, digits, contentWidth - 235);
    y = doc.y + 14;

    // --- Section 4: Vehicle ---
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(INK)
      .text(
        "4. Transport vositasi to'g'risidagi ma'lumotlar/Сведения о транспортном средстве:",
        marginX,
        y,
        NO_LIGATURES,
      );
    y = doc.y + 4;
    const vCols = [
      contentWidth * 0.22,
      contentWidth * 0.14,
      contentWidth * 0.24,
      contentWidth * 0.22,
      contentWidth * 0.18,
    ];
    y = drawTable(
      doc,
      marginX,
      y,
      vCols,
      [
        [
          { text: 'Markasi va modeli/\nМарка и модель', bold: true },
          { text: 'Ishlab chiqarilgan yili/ Год выпуска', bold: true },
          { text: 'Dvigatel raqami/ Номер двигателя', bold: true },
          { text: 'Kuzov (shassi) raqami/\nНомер кузова (шасси)', bold: true },
          {
            text: 'Davlat raqami belgisi/\nГосударственный регистрационный номер',
            bold: true,
          },
        ],
        [
          { text: vehicle.model },
          { text: String(vehicle.manufactureYear), align: 'center' },
          { text: vehicle.engineNumber, align: 'center' },
          { text: vehicle.bodyNumber, align: 'center' },
          { text: vehicle.plateNumber, align: 'center' },
        ],
      ],
      { fontSize: 8, headerRows: 1 },
    );
    y += 10;

    // --- Section 5: Faoliyat turi (not collected by this app — left blank, matching the reference's own blank row) ---
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(INK)
      .text(
        "5. Sug'urta qildiruvchining faoliyat turi/Вид деятельности страхователя:",
        marginX,
        y,
        NO_LIGATURES,
      );
    y = doc.y + 16;
    doc
      .moveTo(marginX, y - 4)
      .lineTo(marginX + contentWidth, y - 4)
      .stroke('#cbd5e1');

    // --- Section 6: Drivers ---
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(INK)
      .text(
        "6. Transport vositasini boshqarishga qo'yilgan shaxslar/Лица, допущенные к управлению транспортным средством:",
        marginX,
        y,
        { width: contentWidth, ...NO_LIGATURES },
      );
    y = doc.y + 4;
    const dCols = [
      contentWidth * 0.08,
      contentWidth * 0.42,
      contentWidth * 0.28,
      contentWidth * 0.22,
    ];
    y = drawTable(
      doc,
      marginX,
      y,
      dCols,
      this.buildDriverRows(policy.drivers ?? []),
      { fontSize: 8, headerRows: 1 },
    );
    y += 6;

    doc
      .font(FONT_REGULAR)
      .fontSize(6.5)
      .fillColor(MUTED)
      .text(
        '* yaqin qarindoshlari — "ota", "ona", "er" ("xotin"), "o\'g\'il", "qiz", "aka", "uka", "opa", "singil" deb ko\'rsatiladi, qarindosh bo\'lmagan shaxslar uchun ushbu ustun to\'ldirilmaydi.\n' +
          '* близкие родственники — «отец», «мать», «муж» («жена»), «сын», «дочь», «братья», «сестры», для лиц, не являющихся родственниками эта графа не заполняется.',
        marginX,
        y,
        { width: contentWidth, ...NO_LIGATURES },
      );
  }

  private renderPage2(
    doc: PDFKit.PDFDocument,
    policy: InsurancePolicy,
    marginX: number,
    contentWidth: number,
  ): void {
    let y = 40;

    // --- Section 7: Insurance sum & premium ---
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(INK)
      .text(
        "7. Sug'urta summasi va sug'urta mukofoti/Страховая сумма и страховая премия.",
        marginX,
        y,
        NO_LIGATURES,
      );
    y = doc.y + 6;

    const premium = policy.price;
    const discount = 0;
    const cols7 = [
      contentWidth * 0.42,
      contentWidth * 0.2,
      contentWidth * 0.38,
    ];
    const rows7: TableCell[][] = [
      [
        { text: "Ko'rsatkichlar/Показатели", bold: true },
        { text: 'Son bilan/Цифрами', bold: true },
        { text: "So'z bilan/Прописью", bold: true },
      ],
      [
        { text: "Sug'urta summasi / Страховая сумма" },
        { text: formatSom(OSAGO_INSURANCE_SUM), align: 'center' },
        { text: `${numberToWordsUz(OSAGO_INSURANCE_SUM)} so'm` },
      ],
      [
        { text: "Sug'urta mukofoti / Страховая премия" },
        { text: formatSom(premium), align: 'center' },
        { text: `${numberToWordsUz(premium)} so'm` },
      ],
      [
        {
          text: "Sug'urta mukofoti bo'yicha siylov/ Скидка по страховой премии",
        },
        { text: formatSom(discount), align: 'center' },
        { text: `${numberToWordsUz(discount)} so'm` },
      ],
      [
        {
          text: "Sug'urtalovchiga to'lanadigan sug'urta mukofoti/ Страховая премия, уплачиваемая страховщику",
        },
        { text: formatSom(premium), align: 'center' },
        { text: `${numberToWordsUz(premium)} so'm` },
      ],
    ];
    y = drawTable(doc, marginX, y, cols7, rows7, {
      fontSize: 8,
      headerRows: 1,
    });
    y += 12;

    // --- Section 8: Legal boilerplate ---
    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(INK)
      .text(
        "8. Transport vositasidan foydalanishda jabrlanuvchining hayoti, sog'lig'i va (yoki) mol-mulkiga zarar yetkazilganligi uchun mazkur sug'urta polisiga muvofiq javobgarligi sug'urtalangan shaxsning fuqarolik javobgarligi yuzaga kelishi ushbu sug'urta polisi bo'yicha sug'urta hodisasi hisoblanadi.\n" +
          'Страховым случаем по настоящему страховому полису является наступление гражданской ответственности лица, ответственность которого застрахована в соответствии с настоящим страховым полисом, за причинение вреда жизни, здоровью и (или) имуществу потерпевших при использовании транспортного средства.',
        marginX,
        y,
        { width: contentWidth, ...NO_LIGATURES },
      );
    y = doc.y + 10;

    // --- Section 9: Insurer branch offices (static — same on every policy) ---
    doc
      .font(FONT_REGULAR)
      .fontSize(8)
      .fillColor(INK)
      .text(
        "9. Sug'urtalovchining pochta manzili, shuningdek uning barcha filiallari, ular bilan aloqa vositalari va ularning ish vaqti to'g'risidagi ma'lumotlar.\n" +
          'Сведения о почтовом адресе страховщика, всех его филиалов, средствах связи с ними и о режиме их работы;',
        marginX,
        y,
        { width: contentWidth, ...NO_LIGATURES },
      );
    y = doc.y + 6;
    const cols9 = [
      contentWidth * 0.22,
      contentWidth * 0.22,
      contentWidth * 0.56,
    ];
    const branchRows: TableCell[][] = [
      [
        { text: 'Hudud/Регион', bold: true },
        {
          text: "Hududiy bo'linmalar nomi/\nНаименование региональных подразделений",
          bold: true,
        },
        {
          text: 'Manzil va telefon raqami/\nАдрес и номер телефона',
          bold: true,
        },
      ],
      ...BRANCH_OFFICES.map((b): TableCell[] => [
        { text: b.region },
        { text: b.name },
        { text: b.address },
      ]),
    ];
    y = drawTable(doc, marginX, y, cols9, branchRows, {
      fontSize: 6.5,
      headerRows: 1,
    });
    y += 14;

    const issued = formatDateUz(policy.validFrom ?? policy.createdAt);
    const issuedTime = new Date(policy.createdAt);
    doc
      .font(FONT_REGULAR)
      .fontSize(9)
      .fillColor(INK)
      .text(
        `Berilgan sanasi / Дата выдачи: «${issued.day}» ${issued.month} ${issued.year} y./г.`,
        marginX,
        y,
        { width: contentWidth, align: 'right', ...NO_LIGATURES },
      );
    doc.text(
      `Berilgan vaqti / Время выдачи: ${String(issuedTime.getHours()).padStart(2, '0')} soat/часов ${String(issuedTime.getMinutes()).padStart(2, '0')} daqiqa/минут.`,
      marginX,
      doc.y + 2,
      { width: contentWidth, align: 'right', ...NO_LIGATURES },
    );
  }

  private numberedField(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    number: string,
    value: string,
    caption: string,
  ): number {
    doc
      .font(FONT_BOLD)
      .fontSize(9)
      .fillColor(INK)
      .text(number, x, y, { continued: true, width, ...NO_LIGATURES });
    doc
      .font(FONT_REGULAR)
      .text(` ${value}`, { width: width - 16, ...NO_LIGATURES });
    doc
      .font(FONT_REGULAR)
      .fontSize(6.5)
      .fillColor(MUTED)
      .text(caption, x + 16, doc.y + 1, { width: width - 16, ...NO_LIGATURES });
    return doc.y + 8;
  }

  private drawDigitBoxes(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    digits: string[],
    maxWidth: number,
  ): void {
    const boxSize = Math.min(18, maxWidth / Math.max(digits.length, 1));
    doc.font(FONT_BOLD).fontSize(10).fillColor(INK);
    digits.forEach((d, i) => {
      const bx = x + i * boxSize;
      doc.rect(bx, y - 2, boxSize - 2, 18).stroke('#94a3b8');
      doc.text(d, bx, y + 2, {
        width: boxSize - 2,
        align: 'center',
        ...NO_LIGATURES,
      });
    });
  }

  private buildDriverRows(drivers: Driver[]): TableCell[][] {
    const header: TableCell[] = [
      { text: 'Т/р', bold: true },
      {
        text: 'Faqat quyidagi haydovchilar:/\nТолько нижеследующие водители:',
        bold: true,
      },
      {
        text: 'Haydovchilik guvohnomasi/\nВодительское удостоверение',
        bold: true,
      },
      { text: 'Qarindoshlik darajasi/ Степень родства*', bold: true },
    ];
    const rows: TableCell[][] = [header];
    const maxRows = 5;
    for (let i = 0; i < maxRows; i++) {
      const driver = drivers[i];
      if (!driver) {
        rows.push([
          { text: String(i + 1) },
          { text: '' },
          { text: '' },
          { text: '' },
        ]);
        continue;
      }
      const { f, i: ism, o } = splitFio(driver.fullName);
      const license = splitLicense(driver.licenseNumber);
      rows.push([
        { text: String(i + 1) },
        {
          text: `F: ${f.toUpperCase()}\nI: ${ism.toUpperCase()}\nO: ${o.toUpperCase()}`,
        },
        { text: `Seriya/Серия ${license.series} № ${license.number}` },
        // relativeId is only a numeric id from Asia Insurance's /get-relative
        // lookup (no name cached locally yet) — shown as-is until that
        // lookup is wired into policy retrieval, see file-level note.
        { text: driver.relativeId != null ? String(driver.relativeId) : '' },
      ]);
    }
    return rows;
  }
}

// Transcribed verbatim from the reference document (frontend/pdfshablon/
// export-to-pdf.pdf, section 9) — the insurer's own branch network, same
// on every issued policy.
const BRANCH_OFFICES: { region: string; name: string; address: string }[] = [
  {
    region: 'Toshkent shahri/\nГород Ташкент',
    name: 'Toshkent shahri filiali',
    address:
      "TOSHKENT SHAHRI, MIROBOD TUMANI, MINGO'RIK MFY, SODIQ AZIMOV KO'CHASI, 77-UY , Тел.: +998 (71) 203-08-08",
  },
  {
    region: 'Xorazm viloyati/\nХорезмская обл.',
    name: 'Xorazm viloyati filiali',
    address: 'г.Ургенч, ул.Тинчлик, дом № 5, Тел.: +998 (71) 203-08-08',
  },
  {
    region: "Qoraqalpog'iston resp./\nРесп. Каракалпакстан",
    name: "Qoraqalpog'iston resp. filiali",
    address: 'г.Нукус ,ул.60 лет, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Toshkent viloyati /\nТашкентская обл.',
    name: 'Toshkent viloyati filiali',
    address:
      'г. Ташкент, Юнусабадский район, ул. Богишамол, дом 1, Тел.: +998 (71)203-08-08',
  },
  {
    region: "Farg'ona viloyati/\nФерганская обл.",
    name: "Farg'ona viloyati filiali",
    address: 'г.Фергана ул.А.Яссавий дом № 29, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Buxoro viloyati/\nБухарская обл.',
    name: 'Buxoro viloyati filiali',
    address: 'г.Бухара, ул. Х.Т. Бухорий, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Qashqadaryo viloyati/\nКашкадарьинская обл.',
    name: 'Qashqadaryo viloyati filiali',
    address:
      'г.Карши, ул. И.Каримова, дом 262/2, Тел.: +998 (71) 203-08-08, +998 (91) 262-19-91',
  },
  {
    region: 'Jizzax viloyati/\nДжизакская обл.',
    name: 'Jizzax viloyati filiali',
    address: 'г.Джизак, ул.М.Хужаев, дом №24, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Navoiy viloyati/\nНавоийская обл.',
    name: 'Navoiy viloyati filiali',
    address: 'г. Навоий, ул. А. Темура, 30, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Surxondaryo viloyati/\nСурхандарьинская обл.',
    name: 'Surxondaryo viloyati filiali',
    address: 'г. Термез, ул. А. Навои, 31А, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Namangan viloyati/\nНаманганская обл.',
    name: 'Namangan viloyati filiali',
    address: 'г.Наманган, ул.Маргилон, дом № 7, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Samarqand viloyati /\nСамаркандская обл.',
    name: 'Samarqand viloyati filiali',
    address:
      'г. Самарканд, ул. Рудакий, 179, Тел.: +998 (71) 203-08-08, +998 (97) 030-01-11',
  },
  {
    region: 'Sirdaryo viloyati/\nСырдарьинская обл.',
    name: 'Sirdaryo viloyati filiali',
    address: 'г.Гулистан, ул.Х.Дустлиги, дом № 30, Тел.: +998 (71) 203-08-08',
  },
  {
    region: 'Andijon viloyati/\nАндижанская обл.',
    name: 'Andijon viloyati filiali',
    address: 'г.Андижан, ул.А.Темур 2 В, Тел.: +998 (71) 203-08-08',
  },
];
