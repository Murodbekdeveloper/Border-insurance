// Which fields DocumentsService looks for depends on which physical
// document the photo is of — a tech passport and a driver's license carry
// different, similarly-shaped identifiers (series+number pairs) that would
// otherwise be ambiguous to tell apart from OCR text alone.
export const DOCUMENT_TYPES = [
  'vehicle_tech_passport',
  'driver_license',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
