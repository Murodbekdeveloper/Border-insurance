import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Secrets that must never reach a production deployment unset — each maps
// to the fallback value configuration.ts uses when the env var is missing,
// so a misconfigured prod deploy fails loudly at startup instead of
// silently signing real tokens with a well-known secret.
const REQUIRED_IN_PRODUCTION: { path: string; devDefault: string }[] = [
  { path: 'jwt.accessSecret', devDefault: 'dev_access_secret' },
  { path: 'jwt.refreshSecret', devDefault: 'dev_refresh_secret' },
  { path: 'adminJwt.accessSecret', devDefault: 'dev_admin_access_secret' },
  { path: 'adminJwt.refreshSecret', devDefault: 'dev_admin_refresh_secret' },
  { path: 'insurancePartner.inboundToken', devDefault: 'dev_partner_token' },
  { path: 'insurancePartner.callbackToken', devDefault: 'dev_callback_token' },
];

function assertProductionSecretsConfigured(configService: ConfigService): void {
  if (configService.get<string>('env') !== 'production') return;
  const insecure = REQUIRED_IN_PRODUCTION.filter(
    ({ path, devDefault }) => configService.get<string>(path) === devDefault,
  );
  if (insecure.length > 0) {
    throw new Error(
      `Refusing to start in production with default dev secrets still set for: ${insecure
        .map((i) => i.path)
        .join(', ')}. Set real values for these via environment variables.`,
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  assertProductionSecretsConfigured(configService);

  // Needed for the Throttler/rate-limiter to key off the real client IP
  // instead of a reverse proxy's, when deployed behind one.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(helmet());
  // Needed to read the Google OAuth CSRF nonce cookie (see GoogleAuthGuard).
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string>('frontendUrl'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Strips @Exclude()-marked fields (e.g. User.passwordHash) from every
  // JSON response, regardless of which service constructed the object.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OSAGO Online API')
    .setDescription(
      "Avtomobil OSAGO sug'urta polisini onlayn sotib olish tizimi uchun API",
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('port') ?? 4000;
  await app.listen(port);

  console.log(`OSAGO API is running on http://localhost:${port}`);

  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
void bootstrap();
