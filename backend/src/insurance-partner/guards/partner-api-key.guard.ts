import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

// Static bearer-token check for the regulator/partner calling *into* us
// (PartnerTransactionsController) — unlike every other guard in this app,
// there's no JWT/session on the other end, just a fixed token we hand
// them out of band. Token lives in insurancePartner.inboundToken
// (INSURANCE_PARTNER_INBOUND_TOKEN env var); rotate it there if it leaks.
@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.configService.get<string>(
      'insurancePartner.inboundToken',
    );
    if (!expectedToken) {
      throw new UnauthorizedException(
        'INSURANCE_PARTNER_INBOUND_TOKEN sozlanmagan',
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
