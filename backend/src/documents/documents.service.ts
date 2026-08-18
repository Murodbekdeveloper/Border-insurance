import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from './document-type';
import { ExtractedFields, FIELD_SCHEMAS } from './extract-fields';

export const OCR_NOT_CONFIGURED_CODE = 'OCR_NOT_CONFIGURED';

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_API_REVISION = '2026-05-20';

interface InteractionsResponse {
  steps?: {
    type: string;
    content?: { type: string; text?: string }[];
  }[];
  errors?: { message: string }[];
}

const PROMPT: Record<DocumentType, string> = {
  vehicle_tech_passport:
    "Bu rasm(lar)da O'zbekiston transport vositasi texnik pasporti bor — " +
    "old va orqa tomonining ikkalasi ham berilgan bo'lishi mumkin, ikkalasini " +
    "ham diqqat bilan ko'rib chiqing. Davlat raqami, texpasport seriyasi, " +
    "texpasport raqami va texpasport berilgan sanani o'qib, so'ralgan JSON " +
    "sxemasi bo'yicha qaytaring.",
  driver_license:
    "Bu rasm(lar)da O'zbekiston fuqarosi pasporti/ID-kartasi YOKI haydovchilik " +
    "guvohnomasi bor (qaysi biri ekanini rasmning o'zidan aniqlang) — old va " +
    "orqa tomonining ikkalasi ham berilgan bo'lishi mumkin, ikkalasini ham " +
    "diqqat bilan ko'rib chiqing, chunki F.I.O. va tug'ilgan sana ko'pincha " +
    "rasm(lar)ning bir qismida, seriya/raqam esa boshqa qismida bo'lishi " +
    "mumkin. Agar pasport/ID-karta bo'lsa — to'liq F.I.O.ni lotin " +
    "(krill emas) alifbosida, tug'ilgan sanani, pasport seriyasi va " +
    "raqamini o'qing. Agar haydovchilik guvohnomasi bo'lsa — guvohnoma " +
    "raqami va berilgan sanasini o'qing. Hujjatda umuman ko'rinmagan " +
    "maydonlarni bo'sh qoldiring — taxmin qilmang.",
};

const COMMON_INSTRUCTION =
  ' Har bir maydonni faqat aniq va ishonchli o\'qiy olsangiz to\'ldiring — ' +
  'aks holda bo\'sh satr ("") qoldiring, taxmin qilmang. Sana maydonlarini ' +
  'faqat YYYY-MM-DD (ISO 8601) formatida qaytaring.';

/**
 * Structured extraction via the Gemini Interactions API (an AI Studio API
 * key, not a service account — simplest to rotate/scope for a single
 * "read fields off a document photo" use case). Left unconfigured by
 * default, the same pattern as SmsService/EmailService/
 * PaymePaymentGatewayService: throws a stable OCR_NOT_CONFIGURED code the
 * mobile/web app already knows how to render as "fill this in manually"
 * instead of a generic error.
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string {
    return this.configService.get<string>('gemini.apiKey') ?? '';
  }

  async extract(
    files: Express.Multer.File[],
    documentType: DocumentType,
  ): Promise<{ rawText: string; fields: ExtractedFields }> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException({
        code: OCR_NOT_CONFIGURED_CODE,
        message: "Hujjatni avtomatik o'qish xizmati hali ulanmagan",
      });
    }

    const outputText = await this.callGemini(files, documentType);
    return { rawText: outputText, fields: this.parseFields(outputText) };
  }

  private async callGemini(
    files: Express.Multer.File[],
    documentType: DocumentType,
  ): Promise<string> {
    const imageParts = files.map((file) => ({
      type: 'image' as const,
      data: file.buffer.toString('base64'),
      mime_type: file.mimetype,
    }));

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/interactions',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Api-Revision': GEMINI_API_REVISION,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: [
            { type: 'text', text: PROMPT[documentType] + COMMON_INSTRUCTION },
            ...imageParts,
          ],
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: FIELD_SCHEMAS[documentType],
          },
        }),
      },
    );

    const body = (await res.json()) as InteractionsResponse;
    if (body.errors?.length) {
      const message = body.errors.map((e) => e.message).join('; ');
      this.logger.warn(`Gemini Interactions API error: ${message}`);
      throw new Error(message);
    }
    return this.extractOutputText(body);
  }

  // The REST response has no top-level "output_text" convenience field (that's
  // an SDK-only addition) — the model's answer lives in the last
  // model_output step's text content.
  private extractOutputText(body: InteractionsResponse): string {
    const modelOutputs = (body.steps ?? []).filter(
      (step) => step.type === 'model_output',
    );
    const last = modelOutputs[modelOutputs.length - 1];
    const text = last?.content?.find((c) => c.type === 'text')?.text;
    return text ?? '{}';
  }

  private parseFields(outputText: string): ExtractedFields {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(outputText) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Gemini returned non-JSON output: ${outputText}`);
      return {};
    }

    const fields: ExtractedFields = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim() !== '') {
        fields[key] = value;
      }
    }
    return fields;
  }
}
