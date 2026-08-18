import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Same static-bearer-token pattern as PartnerApiKeyGuard, but for a
// different caller (Asia Insurance's payall_url payment-completion
// callback, not the NAPP regulator) — kept as a separate guard/token pair
// so the two integrations can be rotated independently.
@Injectable()
export class PaymentCallbackApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.configService.get<string>(
      'insurancePartner.callbackToken',
    );
    if (!expectedToken) {
      throw new UnauthorizedException(
        'INSURANCE_PARTNER_CALLBACK_TOKEN sozlanmagan',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || token !== expectedToken) {
      throw new UnauthorizedException("Noto'g'ri yoki yo'q token");
    }
    return true;
  }
}
