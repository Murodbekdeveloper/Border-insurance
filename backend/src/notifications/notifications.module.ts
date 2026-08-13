import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [EmailService, SmsService, NotificationsService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}
