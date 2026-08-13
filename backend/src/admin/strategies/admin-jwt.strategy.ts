import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminAuthService } from '../admin-auth.service';

export interface AdminJwtPayload {
  sub: string;
  email: string;
}

// Registered under the 'admin-jwt' passport strategy name — a completely
// separate token namespace from the customer 'jwt' strategy, using its
// own secret (adminJwt.accessSecret). A customer access token will not
// validate here, and this token will not validate on customer routes.
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly adminAuthService: AdminAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('adminJwt.accessSecret')!,
    });
  }

  // Re-checked on every authenticated request (not just login/refresh) —
  // otherwise a deleted or disabled admin keeps a fully working token until
  // it naturally expires, since deleteAdmin() has no other way to revoke it.
  async validate(payload: AdminJwtPayload) {
    const admin = await this.adminAuthService.findById(payload.sub);
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Administrator topilmadi yoki bloklangan');
    }
    return { adminId: payload.sub, email: payload.email };
  }
}
