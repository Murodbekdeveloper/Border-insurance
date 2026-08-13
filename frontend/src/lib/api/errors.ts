import axios from 'axios';

interface BackendErrorBody {
  message?: string | string[];
  error?: string;
  code?: string;
  statusCode?: number;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | undefined;
    if (Array.isArray(body?.message)) return body.message[0] ?? fallback;
    if (typeof body?.message === 'string') return body.message;
  }
  return fallback;
}

// A stable machine-readable error identifier some endpoints attach (e.g.
// "EMAIL_NOT_VERIFIED") so the UI can branch on it instead of matching
// translated message text. Checks both a raw axios error and an ApiError
// already unwrapped by throwApiError() below, since api/*.ts functions
// normally re-throw as the latter.
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof ApiError) return error.code;
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | undefined;
    return body?.code;
  }
  return undefined;
}

// A plain Error subclass that also carries the backend's machine-readable
// `code`, if any — api/*.ts functions catch the raw axios error and
// re-throw one of these instead, so callers only ever deal with a normal
// Error (via .message) or, when they need to branch on it, getErrorCode().
export class ApiError extends Error {
  code?: string;
}

export function throwApiError(error: unknown, fallback: string): never {
  const wrapped = new ApiError(getErrorMessage(error, fallback));
  wrapped.code = getErrorCodeFromAxios(error);
  throw wrapped;
}

function getErrorCodeFromAxios(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as BackendErrorBody | undefined;
    return body?.code;
  }
  return undefined;
}
