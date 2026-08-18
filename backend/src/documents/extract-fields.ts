import { DocumentType } from './document-type';

export type ExtractedFields = Record<string, string>;

// Gemini structured-output schema (OpenAPI 3.0 subset) per document type —
// field names match the vehicle/driver form field names directly, so
// callers can pass the response straight to react-hook-form's setValue()
// without any remapping. Descriptions double as the extraction instructions
// for each field.
export const FIELD_SCHEMAS: Record<DocumentType, object> = {
  vehicle_tech_passport: {
    type: 'object',
    properties: {
      plateNumber: {
        type: 'string',
        description:
          "Davlat raqami, masalan '01 A 123 AA' formatida (2 raqam, 1 harf, 3 raqam, 2 harf)",
      },
      techPassportSeries: {
        type: 'string',
        description:
          "Texpasport seriyasi — 2-3 ta lotin harf, masalan 'AAB'",
      },
      techPassportNumber: {
        type: 'string',
        description: 'Texpasport raqami — 7 ta raqam',
      },
      techPassportIssueDate: {
        type: 'string',
        description: 'Texpasport berilgan sana, YYYY-MM-DD formatida',
      },
    },
  },
  // Covers both documents a driver uploads (passport photo and driving
  // license photo) with one schema — whichever photo comes in, only the
  // fields actually visible on it get filled; DocumentsService already
  // drops anything the model couldn't read confidently.
  driver_license: {
    type: 'object',
    properties: {
      fullName: {
        type: 'string',
        description:
          "Pasportdagi to'liq F.I.O. (familiya ism sharif), hujjatda yozilganidek",
      },
      birthDate: {
        type: 'string',
        description: "Tug'ilgan sana, YYYY-MM-DD formatida",
      },
      passportSeries: {
        type: 'string',
        description: 'Fuqaro pasporti seriyasi — 2 ta lotin harf',
      },
      passportNumber: {
        type: 'string',
        description: 'Fuqaro pasporti raqami — 7 ta raqam',
      },
      licenseNumber: {
        type: 'string',
        description: "Haydovchilik guvohnomasi raqami (8-12 ta belgi)",
      },
      licenseIssueDate: {
        type: 'string',
        description: 'Guvohnoma berilgan sana, YYYY-MM-DD formatida',
      },
    },
  },
};
