import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface EskizLoginResponse {
  data: { token: string };
}

/**
 * Sends SMS via Eskiz.uz — the SMS gateway most Uzbek fintech/insurance
 * apps use (https://eskiz.uz). If no ESKIZ_EMAIL/ESKIZ_PASSWORD are
 * configured, falls back to logging the message instead of sending it,
 * so the notification flow stays testable without a real account —
 * the same pattern as MockPaymentGatewayService.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private token: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get configured(): boolean {
    return !!this.configService.get<string>('sms.eskizEmail');
  }

  private async login(): Promise<string> {
    const baseUrl = this.configService.get<string>('sms.eskizBaseUrl');
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.configService.get<string>('sms.eskizEmail'),
        password: this.configService.get<string>('sms.eskizPassword'),
      }),
    });
    const body = (await res.json()) as EskizLoginResponse;
    return body.data.token;
  }

  async send(phone: string, message: string): Promise<void> {
    if (!this.configured) {
      this.logger.log(
        `[SMS not configured] Would send to ${phone}: "${message}"`,
      );
      return;
    }

    if (!this.token) {
      this.token = await this.login();
    }

    const baseUrl = this.configService.get<string>('sms.eskizBaseUrl');
    const mobilePhone = phone.replace(/^\+/, '');
    const res = await fetch(`${baseUrl}/message/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        mobile_phone: mobilePhone,
        message,
        from: '4546',
      }),
    });

    if (res.status === 401) {
      // Token expired — retry once with a fresh one.
      this.token = await this.login();
      await fetch(`${baseUrl}/message/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          mobile_phone: mobilePhone,
          message,
          from: '4546',
        }),
      });
    }
  }
}
