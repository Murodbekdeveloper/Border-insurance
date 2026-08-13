export class PaymeApiError extends Error {
  constructor(
    public readonly code: number,
    rawMessage: string | Record<string, string>,
  ) {
    super(
      typeof rawMessage === 'string'
        ? rawMessage
        : (rawMessage.ru ?? rawMessage.en ?? JSON.stringify(rawMessage)),
    );
    this.name = 'PaymeApiError';
  }
}
