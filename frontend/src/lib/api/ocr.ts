import axios from 'axios';
import { apiClient } from '@/lib/api/client';

export class OcrNotConfiguredError extends Error {
  constructor() {
    super("Hujjatni avtomatik o'qish xizmati hali ulanmagan");
    this.name = 'OcrNotConfiguredError';
  }
}

export interface ExtractedVehicleData {
  plateNumber?: string;
  techPassportSeries?: string;
  techPassportNumber?: string;
  techPassportIssueDate?: string;
}

export interface ExtractedDriverData {
  fullName?: string;
  birthDate?: string;
  passportSeries?: string;
  passportNumber?: string;
  licenseNumber?: string;
  licenseIssueDate?: string;
}

const OCR_NOT_CONFIGURED_CODE = 'OCR_NOT_CONFIGURED';

// Uploads the picked photo to the backend, which forwards it to Gemini —
// the API key lives server-side only, never in the browser bundle. Field
// names in the response match the vehicle/driver form field names
// directly, so callers can pass them straight to react-hook-form's
// setValue() without any remapping.
async function extract(
  file: File,
  documentType: 'vehicle_tech_passport' | 'driver_license',
): Promise<Record<string, string>> {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);

  try {
    // No explicit Content-Type here on purpose — axios's browser adapter
    // auto-fills it (including the multipart boundary) for a FormData body
    // only when the header isn't already set.
    const { data } = await apiClient.post<{ rawText: string; fields: Record<string, string> }>('/documents/extract', form);
    return data.fields;
  } catch (err) {
    if (axios.isAxiosError(err) && (err.response?.data as { code?: string } | undefined)?.code === OCR_NOT_CONFIGURED_CODE) {
      throw new OcrNotConfiguredError();
    }
    throw err;
  }
}

export async function extractVehicleDocument(file: File): Promise<ExtractedVehicleData> {
  return extract(file, 'vehicle_tech_passport');
}

export async function extractDriverLicense(file: File): Promise<ExtractedDriverData> {
  return extract(file, 'driver_license');
}
