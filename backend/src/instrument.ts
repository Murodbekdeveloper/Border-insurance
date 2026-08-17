// Must be the first thing main.ts imports — Sentry.init() needs to run
// before any other module (Nest, Express, pg, etc.) is required so it can
// auto-instrument them. See https://docs.sentry.io/platforms/javascript/guides/nestjs/.
import * as dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const dsn = process.env.SENTRY_DSN;

// No-op everywhere until a real DSN is configured (see .env.example) —
// same "disabled until configured" pattern as the other optional
// integrations (SMTP, Eskiz, Vision) in config/configuration.ts.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.2,
    // Card numbers/passport photos never pass through Sentry — this is a
    // second layer, not a substitute for keeping them out of error payloads.
    sendDefaultPii: false,
  });
}
