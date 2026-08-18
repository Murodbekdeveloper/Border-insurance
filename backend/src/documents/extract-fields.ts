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
        description: "Texpasport seriyasi — 2-3 ta lotin harf, masalan 'AAB'",
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
      // No fixed format assumed — O'zbekiston eski pasporti (2 harf), yangi
      // ID-karta (faqat raqam, seriyasiz) va xorijiy pasportlar (davlatiga
      // qarab har xil) barchasi shu ikki maydonga tushadi. Series bo'lmasa
      // — bo'sh, number esa hujjatda yozilgan to'liq identifikatorni oladi.
      passportSeries: {
        type: 'string',
        description:
          "Hujjatdagi seriya qismi, AGAR alohida seriya mavjud bo'lsa " +
          "(masalan O'zbekiston eski pasportida 2 ta lotin harf). Ko'p " +
          "zamonaviy ID-karta/xorijiy pasportlarda alohida seriya yo'q — " +
          "bunday holda bo'sh qoldiring, uni raqam maydoniga qo'ymang.",
      },
      passportNumber: {
        type: 'string',
        description:
          'Hujjatning identifikatsiya raqami — millati/hujjat turidan ' +
          "qat'iy nazar, hujjatda aynan qanday yozilgan bo'lsa, harflar " +
          "va raqamlar bilan birga, o'sha ko'rinishda o'qing (uzunlik va " +
          "formatni cheklamang — O'zbekiston, xorijiy pasport, ID-karta, " +
          "istalgan davlat hujjati bo'lishi mumkin).",
      },
      licenseNumber: {
        type: 'string',
        description:
          'Haydovchilik guvohnomasi raqami — istalgan davlat formatida, ' +
          "hujjatda yozilganidek aynan o'qing (uzunlik/formatni cheklamang).",
      },
      licenseIssueDate: {
        type: 'string',
        description: 'Guvohnoma berilgan sana, YYYY-MM-DD formatida',
      },
    },
  },
};
