export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'osago',
    // Render's external Postgres endpoint (and most managed providers)
    // terminates TLS with a cert not in Node's default CA bundle — same
    // trust model as the partner API, hence rejectUnauthorized: false
    // rather than skipping TLS. Internal same-region connections don't
    // need this; leave DB_SSL unset for local/docker-compose Postgres.
    ssl: process.env.DB_SSL === 'true',
  },
  sentry: {
    dsn: process.env.SENTRY_DSN ?? '',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret',
    // Expressed in seconds (not "15m"/"7d") so it can be passed to
    // JwtSignOptions#expiresIn as a plain number, with no duration parsing.
    accessExpiresInSeconds: parseInt(
      process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? '900',
      10,
    ),
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret',
    refreshExpiresInSeconds: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? '604800',
      10,
    ),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:4000/auth/google/callback',
    // The mobile app's native iOS Google Sign-In flow authenticates against
    // a separate iOS-type OAuth client (required by Google's iOS SDK), so
    // ID tokens it returns carry that client as their audience instead of
    // the web client id above. Left empty, loginWithGoogleIdToken() simply
    // accepts only the web client's audience, same as before.
    iosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
  },
  payments: {
    // 'mock' keeps the built-in always-succeeds/card-ending-in-0000-declines
    // gateway used by the test suite. Set to 'payme' once real merchant
    // credentials (PAYME_MERCHANT_ID / PAYME_KEY) are available.
    provider: process.env.PAYMENT_GATEWAY_PROVIDER ?? 'mock',
  },
  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID ?? '',
    key: process.env.PAYME_KEY ?? '',
    // https://developer.help.paycom.uz/ — test endpoint by default so a
    // misconfigured PAYMENT_GATEWAY_PROVIDER=payme never hits production.
    endpoint:
      process.env.PAYME_ENDPOINT ?? 'https://checkout.test.paycom.uz/api',
  },
  smtp: {
    // Left empty by default — EmailService falls back to logging the
    // email instead of sending it, so notifications stay testable without
    // a real mail server.
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'OSAGO Online <no-reply@osago.local>',
  },
  apple: {
    // The mobile app's iOS Bundle ID — Sign in with Apple's native flow
    // uses this as the identity token's audience directly (unlike Google,
    // there's no separate OAuth client id to configure for the native
    // path, so nothing here needs a credential from the user).
    bundleId: process.env.APPLE_BUNDLE_ID ?? 'com.border.app',
  },
  insurancePartner: {
    // Outbound: Asia Insurance's OSAGO issuance API
    // (swagger.asia-insurance.uz/ui/osago3, spec at
    // swagger.asia-insurance.uz/swagger-files/osago3.yaml). Auth is HTTP
    // Basic (securitySchemes.BasicAuth in their spec) — login/password,
    // not a bearer token.
    apiUrl:
      process.env.INSURANCE_PARTNER_API_URL ?? 'https://ais.asia-insurance.uz',
    // Separate sandbox host+base-path Asia Insurance gave us for testing
    // (2026-08-18) — structurally different from apiUrl above, not just a
    // different hostname, so AsiaInsuranceClientService routes per-call
    // rather than swapping this in for apiUrl wholesale.
    // UNRESOLVED as of 2026-08-18: this host rejects the production
    // INSURANCE_PARTNER_LOGIN/PASSWORD with 401 on every route we could
    // reach (get-period, get-relative, sandbox/save-policy all 401;
    // get-calc-osago's route resolves but errors on our test payload) —
    // ask Asia Insurance whether the sandbox needs separate credentials
    // before relying on sandbox mode for anything.
    sandboxApiUrl:
      process.env.INSURANCE_PARTNER_SANDBOX_API_URL ??
      'https://online.asia-insurance.uz/apex/ins/osago_v3',
    // 'production' (default) or 'sandbox'. Never set this to 'sandbox' in
    // the real deployment's env vars — it exists for local/manual testing
    // against Asia Insurance's sandbox before relying on new behavior in
    // production.
    mode: process.env.INSURANCE_PARTNER_MODE ?? 'production',
    login: process.env.INSURANCE_PARTNER_LOGIN ?? '',
    password: process.env.INSURANCE_PARTNER_PASSWORD ?? '',
    // Inbound: the token WE hand to the regulator/partner so they can call
    // PartnerTransactionsController (GET /partner/transactions/:id) back.
    // Dev-only fallback below must be overridden in production — see the
    // same-pattern check main.ts already does for the JWT secrets.
    inboundToken:
      process.env.INSURANCE_PARTNER_INBOUND_TOKEN ?? 'dev_partner_token',
    // Separate static token WE generate for Asia Insurance's own
    // payall_url payment-completion callback (POST /partner/payment-
    // callback) — kept distinct from inboundToken above so a leak of one
    // doesn't compromise the other caller.
    callbackToken:
      process.env.INSURANCE_PARTNER_CALLBACK_TOKEN ?? 'dev_callback_token',
  },
  gemini: {
    // Google AI Studio API key — Gemini reads tech-passport/driving-license
    // photos uploaded from the web/mobile app and returns the relevant
    // fields directly as structured JSON (Interactions API, response_format
    // schema), no separate OCR+regex pass needed. Left empty by default —
    // DocumentsService then throws OCR_NOT_CONFIGURED instead of guessing
    // at fields, the same pattern as the other integrations below.
    apiKey: process.env.GEMINI_API_KEY ?? '',
  },
  sms: {
    // Eskiz.uz — the SMS gateway most Uzbek fintech/insurance apps use.
    // https://documenter.getpostman.com/view/663428/eskiz/2xzY6oM
    // Left empty by default — SmsService falls back to logging the SMS.
    eskizEmail: process.env.ESKIZ_EMAIL ?? '',
    eskizPassword: process.env.ESKIZ_PASSWORD ?? '',
    eskizBaseUrl: process.env.ESKIZ_BASE_URL ?? 'https://notify.eskiz.uz/api',
  },
  adminJwt: {
    // Deliberately separate secrets from the customer jwt.* config above —
    // an admin token must never be valid on customer endpoints or vice
    // versa. See AdminAuthService / AdminJwtStrategy.
    accessSecret:
      process.env.ADMIN_JWT_ACCESS_SECRET ?? 'dev_admin_access_secret',
    accessExpiresInSeconds: parseInt(
      process.env.ADMIN_JWT_ACCESS_EXPIRES_IN_SECONDS ?? '900',
      10,
    ),
    refreshSecret:
      process.env.ADMIN_JWT_REFRESH_SECRET ?? 'dev_admin_refresh_secret',
    refreshExpiresInSeconds: parseInt(
      process.env.ADMIN_JWT_REFRESH_EXPIRES_IN_SECONDS ?? '604800',
      10,
    ),
  },
});
