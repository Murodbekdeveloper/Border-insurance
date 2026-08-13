import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminJwtPayload } from './admin-jwt.strategy';

@Injectable()
export class AdminJwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'admin-jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('adminJwt.refreshSecret')!,
    });
  }

  validate(payload: AdminJwtPayload) {
    return { adminId: payload.sub, email: payload.email };
  }
}
