import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email via SMTP. If no SMTP_* credentials are
 * configured, falls back to logging the message instead of sending it,
 * so the notification flow stays testable without a real mail server —
 * the same pattern as MockPaymentGatewayService.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('smtp.host');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.configService.get<number>('smtp.port'),
          auth: {
            user: this.configService.get<string>('smtp.user'),
            pass: this.configService.get<string>('smtp.pass'),
          },
        })
      : null;
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[SMTP not configured] Would send email to ${message.to}: "${message.subject}"`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.configService.get<string>('smtp.from'),
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  }
}
