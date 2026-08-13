import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from './document-type';
import { extractFields, ExtractedFields } from './extract-fields';

export const OCR_NOT_CONFIGURED_CODE = 'OCR_NOT_CONFIGURED';

interface VisionAnnotateResponse {
  responses?: {
    fullTextAnnotation?: { text: string };
    error?: { message: string };
  }[];
}

/**
 * OCR via the Google Cloud Vision REST API (an API key, not a service
 * account — simplest to rotate/scope for a single "read text off a photo"
 * use case). Left unconfigured by default, the same pattern as
 * SmsService/EmailService/PaymePaymentGatewayService: throws a stable
 * OCR_NOT_CONFIGURED code the mobile app already knows how to render as
 * "fill this in manually" instead of a generic error.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('vision.apiKey') ?? '';
  }

  async extract(
    file: Express.Multer.File,
    documentType: DocumentType,
  ): Promise<{ rawText: string; fields: ExtractedFields }> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException({
        code: OCR_NOT_CONFIGURED_CODE,
        message: 'Google Vision API hali ulanmagan',
      });
    }

    const rawText = await this.detectText(file.buffer);
    return { rawText, fields: extractFields(rawText, documentType) };
  }

  private async detectText(buffer: Buffer): Promise<string> {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: buffer.toString('base64') },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            },
          ],
        }),
      },
    );

    const body = (await res.json()) as VisionAnnotateResponse;
    const first = body.responses?.[0];
    if (first?.error) {
      this.logger.warn(`Vision API error: ${first.error.message}`);
      throw new Error(first.error.message);
    }
    return first?.fullTextAnnotation?.text ?? '';
  }
}
