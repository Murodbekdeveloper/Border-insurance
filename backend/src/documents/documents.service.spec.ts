import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { DocumentsService, OCR_NOT_CONFIGURED_CODE } from './documents.service';

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    buffer: Buffer.from('fake-image-bytes'),
    mimetype: 'image/jpeg',
    ...overrides,
  } as Express.Multer.File;
}

// Shapes a fake Interactions API response the way the real REST endpoint
// does: the answer lives in the last model_output step, not a top-level
// "output_text" field (that's an SDK-only convenience, absent from raw
// REST responses).
function modelOutputResponse(fields: Record<string, unknown>) {
  return {
    steps: [
      { type: 'thought' },
      {
        type: 'model_output',
        content: [{ type: 'text', text: JSON.stringify(fields) }],
      },
    ],
  };
}

describe('DocumentsService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function makeService(apiKey: string): DocumentsService {
    const configService = {
      get: (key: string) => (key === 'gemini.apiKey' ? apiKey : undefined),
    } as unknown as ConfigService;
    return new DocumentsService(configService);
  }

  it('throws OCR_NOT_CONFIGURED when no API key is set', async () => {
    const service = makeService('');

    await expect(service.extract([makeFile()], 'vehicle_tech_passport')).rejects.toMatchObject({
      response: { code: OCR_NOT_CONFIGURED_CODE },
    });
    await expect(
      service.extract([makeFile()], 'vehicle_tech_passport'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('calls the Gemini Interactions API and returns parsed fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () =>
        modelOutputResponse({
          plateNumber: '01 A 123 AA',
          techPassportSeries: 'AAB',
          techPassportNumber: '1234567',
          techPassportIssueDate: '2022-05-10',
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = makeService('test-key');
    const result = await service.extract([makeFile()], 'vehicle_tech_passport');

    expect(result.fields).toEqual({
      plateNumber: '01 A 123 AA',
      techPassportSeries: 'AAB',
      techPassportNumber: '1234567',
      techPassportIssueDate: '2022-05-10',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(init.headers['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gemini-flash-latest');
    expect(body.response_format.mime_type).toBe('application/json');
  });

  it('drops empty-string fields the model could not read confidently', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () =>
        modelOutputResponse({
          passportSeries: 'AB',
          passportNumber: '',
          licenseNumber: '',
          licenseIssueDate: '2020-01-15',
        }),
    }) as unknown as typeof fetch;

    const service = makeService('test-key');
    const result = await service.extract([makeFile()], 'driver_license');

    expect(result.fields).toEqual({
      passportSeries: 'AB',
      licenseIssueDate: '2020-01-15',
    });
  });

  it('returns fullName/birthDate when the photo is a passport, not a license', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () =>
        modelOutputResponse({
          fullName: 'Ali Valiyev',
          birthDate: '1990-01-01',
          passportSeries: 'AB',
          passportNumber: '1234567',
          licenseNumber: '',
          licenseIssueDate: '',
        }),
    }) as unknown as typeof fetch;

    const service = makeService('test-key');
    const result = await service.extract([makeFile()], 'driver_license');

    expect(result.fields).toEqual({
      fullName: 'Ali Valiyev',
      birthDate: '1990-01-01',
      passportSeries: 'AB',
      passportNumber: '1234567',
    });
  });

  it('sends every uploaded file (e.g. front + back) as a separate image part', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => modelOutputResponse({ fullName: 'Ali Valiyev' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = makeService('test-key');
    await service.extract(
      [makeFile({ mimetype: 'image/jpeg' }), makeFile({ mimetype: 'image/png' })],
      'driver_license',
    );

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    const imageParts = body.input.filter((part: { type: string }) => part.type === 'image');
    expect(imageParts).toHaveLength(2);
    expect(imageParts[0].mime_type).toBe('image/jpeg');
    expect(imageParts[1].mime_type).toBe('image/png');
  });

  it('throws when Gemini returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ errors: [{ message: 'quota exceeded' }] }),
    }) as unknown as typeof fetch;

    const service = makeService('test-key');
    await expect(service.extract([makeFile()], 'driver_license')).rejects.toThrow(
      'quota exceeded',
    );
  });
});
