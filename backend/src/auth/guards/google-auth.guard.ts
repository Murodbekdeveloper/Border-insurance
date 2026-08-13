import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';

const OAUTH_NONCE_COOKIE = 'g_oauth_nonce';

interface GoogleStatePayload {
  nonce: string;
  client: 'mobile' | 'web';
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  private get stateSecret(): string {
    return this.configService.get<string>('jwt.accessSecret')!;
  }

  // Real CSRF protection for the OAuth login-CSRF pattern: a signed `state`
  // alone doesn't stop it (an attacker can also get our server to sign a
  // valid state for their own flow), so the nonce inside `state` is also
  // bound to an httpOnly cookie set on THIS SAME browser when the flow was
  // initiated. The callback is only trusted if both match.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & { __oauthNonce?: string }
    >();
    const res = context.switchToHttp().getResponse<Response>();
    const incomingState = req.query.state as string | undefined;

    if (!incomingState) {
      const nonce = randomBytes(16).toString('hex');
      res.cookie(OAUTH_NONCE_COOKIE, nonce, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.configService.get<string>('env') === 'production',
        maxAge: 5 * 60 * 1000,
      });
      req.__oauthNonce = nonce;
    } else {
      const decoded = this.decodeState(incomingState);
      const cookieNonce = req.cookies?.[OAUTH_NONCE_COOKIE] as
        | string
        | undefined;
      res.clearCookie(OAUTH_NONCE_COOKIE);
      if (!decoded || !cookieNonce || decoded.nonce !== cookieNonce) {
        throw new UnauthorizedException(
          "Google orqali kirishda xavfsizlik tekshiruvidan o'tmadi — qaytadan urinib ko'ring",
        );
      }
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  // Threads a `client=mobile` query param through Google's `state` param so the
  // callback route knows whether to redirect back to the mobile app's custom
  // URL scheme or to the web frontend.
  //
  // Also overrides the OAuth callbackURL for mobile: from inside an Android
  // emulator/device, "localhost" resolves to the device itself, not this
  // machine, so the default GOOGLE_CALLBACK_URL (localhost) is unreachable
  // there. 10.0.2.2 is the stable Android-emulator alias for the host
  // machine — it must also be added to the OAuth client's "Authorized
  // redirect URIs" in Google Cloud Console for this to work.
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<
      Request & { __oauthNonce?: string }
    >();
    const incomingState = req.query.state as string | undefined;

    // On the initial /auth/google request we know via ?client=mobile; on the
    // /auth/google/callback leg, decode our own previously-signed+validated
    // state instead of trusting the raw query param.
    const decoded = incomingState ? this.decodeState(incomingState) : null;
    const isMobile = decoded
      ? decoded.client === 'mobile'
      : req.query.client === 'mobile';

    const state = decoded
      ? incomingState
      : this.jwtService.sign(
          { nonce: req.__oauthNonce, client: isMobile ? 'mobile' : 'web' },
          { secret: this.stateSecret, expiresIn: '5m' },
        );

    return {
      state,
      // Google odatda joriy brauzer sessiyasidagi akkaunt bilan jimgina
      // davom etadi (yoki bitta akkaunt bo'lsa, uni avtomatik tanlaydi) —
      // shu tufayli foydalanuvchi qaysi hisob bilan kirayotganini ko'rmay
      // qolishi mumkin edi. select_account akkaunt tanlash oynasini har
      // safar majburiy ko'rsatadi.
      prompt: 'select_account',
      ...(isMobile && {
        callbackURL: 'http://10.0.2.2:4000/auth/google/callback',
      }),
    };
  }

  private decodeState(state: string): GoogleStatePayload | null {
    try {
      return this.jwtService.verify<GoogleStatePayload>(state, {
        secret: this.stateSecret,
      });
    } catch {
      return null;
    }
  }
}
