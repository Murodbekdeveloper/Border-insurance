// Next.js server instrumentation entry point — runs once when a new
// server instance starts. See
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
import type { Instrumentation } from 'next';

export async function register() {
  // Edge runtime isn't used by this app; only the Node runtime needs Sentry.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  ...args
) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  await Sentry.captureRequestError(...args);
};
