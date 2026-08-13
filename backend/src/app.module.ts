import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { PoliciesModule } from './policies/policies.module';
import { CardsModule } from './cards/cards.module';
import { PaymentsModule } from './payments/payments.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { DocumentsModule } from './documents/documents.module';
import { InsurancePartnerModule } from './insurance-partner/insurance-partner.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        // Schema is managed exclusively through migrations (see src/migrations
        // and the migration:* npm scripts) — run `npm run migration:run`
        // before starting the app against a fresh database.
        synchronize: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
      }),
    }),
    AuthModule,
    UsersModule,
    VehiclesModule,
    PoliciesModule,
    CardsModule,
    PaymentsModule,
    HealthModule,
    AdminModule,
    DocumentsModule,
    InsurancePartnerModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
