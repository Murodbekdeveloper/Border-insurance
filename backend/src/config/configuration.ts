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
    apiUrl: process.env.INSURANCE_PARTNER_API_URL ?? 'https://ais.asia-insurance.uz',
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
  vision: {
    // Google Cloud Vision REST API key (not a service account) used to OCR
    // tech-passport/driving-license photos uploaded from the mobile app.
    // Left empty by default — DocumentsService then throws OCR_NOT_CONFIGURED
    // instead of guessing at fields, the same pattern as the other
    // integrations below.
    apiKey: process.env.GOOGLE_VISION_API_KEY ?? '',
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
