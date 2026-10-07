import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Driver } from './entities/driver.entity';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';
import { PolicyVerificationController } from './policy-verification.controller';
import { PdfService } from './pdf/pdf.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RenewalRemindersCron } from './renewal-reminders.cron';
import { PartnerPolicySyncCron } from './partner-policy-sync.cron';
import { StaleDraftCleanupCron } from './stale-draft-cleanup.cron';
import { InsurancePartnerModule } from '../insurance-partner/insurance-partner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InsurancePolicy, Driver]),
    VehiclesModule,
    UsersModule,
    NotificationsModule,
    InsurancePartnerModule,
  ],
  providers: [
    PoliciesService,
    PdfService,
    RenewalRemindersCron,
    PartnerPolicySyncCron,
    StaleDraftCleanupCron,
  ],
  controllers: [PoliciesController, PolicyVerificationController],
  exports: [PoliciesService],
})
export class PoliciesModule {}
