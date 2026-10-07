// Mirrors PaymeApiError's shape (see ../payme/payme-api.error.ts) for the
// same reason: callers can catch one error type instead of inspecting
// HTTP status codes themselves. httpStatus is Asia Insurance's own code —
// 401 (invalid token) and 555 (their internal error) are the two
// documented in swagger.asia-insurance.uz/ui/osago3; others are possible.
// Two synthetic values the real API never returns: 0 means we never even
// attempted the request (missing login/password/apiUrl config), -1 means
// the request was attempted but the connection itself failed (DNS,
// timeout, refused, TLS — see AsiaInsuranceClientService.doFetch).
export class AsiaInsuranceApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'AsiaInsuranceApiError';
  }
}
