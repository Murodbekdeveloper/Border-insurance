import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Admin } from './entities/admin.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminLoginAttempt } from './entities/admin-login-attempt.entity';
import { AdminAuthService } from './admin-auth.service';
import { AuditLogService } from './audit-log.service';
import { LoginAttemptsService } from './login-attempts.service';
import { AdminReportService } from './admin-report.service';
import { MonthlyReportCron } from './monthly-report.cron';
import { AdminAuthController } from './admin-auth.controller';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminPoliciesController } from './admin-policies.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminAdminsController } from './admin-admins.controller';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminSecurityController } from './admin-security.controller';
import { AdminSearchController } from './admin-search.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminJwtRefreshStrategy } from './strategies/admin-jwt-refresh.strategy';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { UsersModule } from '../users/users.module';
import { PoliciesModule } from '../policies/policies.module';
import { PaymentsModule } from '../payments/payments.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, AdminAuditLog, AdminLoginAttempt]),
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    PoliciesModule,
    PaymentsModule,
    VehiclesModule,
    NotificationsModule,
  ],
  providers: [
    AdminAuthService,
    AuditLogService,
    LoginAttemptsService,
    AdminReportService,
    MonthlyReportCron,
    AdminJwtStrategy,
    AdminJwtRefreshStrategy,
    SuperAdminGuard,
  ],
  controllers: [
    AdminAuthController,
    AdminController,
    AdminUsersController,
    AdminPoliciesController,
    AdminPaymentsController,
    AdminAdminsController,
    AdminAuditLogController,
    AdminSecurityController,
    AdminSearchController,
    AdminReportsController,
  ],
})
export class AdminModule {}
