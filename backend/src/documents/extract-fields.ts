import { DocumentType } from './document-type';

export type ExtractedFields = Record<string, string>;

// Uzbek plates read "01 A 123 AA" — 2-digit region, 1 letter, 3 digits, 2
// letters — with inconsistent spacing depending on how the plate was cut
// out of the photo, hence the optional \s? between every group.
const PLATE_REGEX = /\b(\d{2}\s?[A-Z]\s?\d{3}\s?[A-Z]{2})\b/;

// dd.mm.yyyy or dd/mm/yyyy — the date format printed on both tech
// passports and driving licenses.
const DATE_REGEX = /\b(\d{2})[./](\d{2})[./](\d{4})\b/;

// Tech passport series is 2-3 Latin letters (e.g. "AAB"); the "№" the
// document prints before the number is optional since OCR often drops it.
const TECH_PASSPORT_REGEX = /\b([A-Z]{2,3})\s?№?\s?(\d{7})\b/;

// A resident's passport series is always exactly 2 letters (unlike the
// tech passport's 2-3) — this is what tells the two apart in OCR text.
const PASSPORT_REGEX = /\b([A-Z]{2})\s?№?\s?(\d{7})\b/;

// Driving license numbers are alphanumeric, 8-12 characters, no fixed
// series/number split the way passports have.
const LICENSE_NUMBER_CANDIDATE_REGEX = /\b[A-Z0-9]{8,12}\b/g;

function toIsoDate(day: string, month: string, year: string): string {
  return `${year}-${month}-${day}`;
}

// A plain 8-12 char alphanumeric match also catches header words printed
// in caps (e.g. "HAYDOVCHILIK") — requiring at least one digit rules those
// out, since a license number is never pure letters.
function findLicenseNumber(text: string): string | undefined {
  const candidates = text.match(LICENSE_NUMBER_CANDIDATE_REGEX) ?? [];
  return candidates.find((c) => /\d/.test(c));
}

// Best-effort only — real documents vary too much in photo quality and
// exact layout to trust blindly. The mobile app pre-fills whatever comes
// back here into editable fields rather than submitting it directly, so a
// missed or wrong match just means the user types it in themselves.
export function extractFields(
  rawText: string,
  documentType: DocumentType,
): ExtractedFields {
  const text = rawText.toUpperCase().replace(/\s+/g, ' ');
  const fields: ExtractedFields = {};

  const dateMatch = text.match(DATE_REGEX);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const isoDate = toIsoDate(day, month, year);
    if (documentType === 'vehicle_tech_passport') {
      fields.techPassportIssueDate = isoDate;
    } else {
      fields.licenseIssueDate = isoDate;
    }
  }

  if (documentType === 'vehicle_tech_passport') {
    const plateMatch = text.match(PLATE_REGEX);
    if (plateMatch)
      fields.plateNumber = plateMatch[1].replace(/\s+/g, ' ').trim();

    const techPassportMatch = text.match(TECH_PASSPORT_REGEX);
    if (techPassportMatch) {
      fields.techPassportSeries = techPassportMatch[1];
      fields.techPassportNumber = techPassportMatch[2];
    }
  } else {
    const passportMatch = text.match(PASSPORT_REGEX);
    if (passportMatch) {
      fields.passportSeries = passportMatch[1];
      fields.passportNumber = passportMatch[2];
    }

    const licenseNumber = findLicenseNumber(text);
    if (licenseNumber) fields.licenseNumber = licenseNumber;
  }

  return fields;
}
