import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Profile,
  Strategy,
  StrategyOptions,
  VerifyCallback,
} from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const options: StrategyOptions = {
      clientID:
        configService.get<string>('google.clientId') || 'not-configured',
      clientSecret:
        configService.get<string>('google.clientSecret') || 'not-configured',
      callbackURL: configService.get<string>('google.callbackUrl')!,
      scope: ['email', 'profile'],
    };
    super(options);
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(
        new Error(
          'Google hisobingizda email manzili topilmadi — boshqa usul bilan kiring',
        ),
      );
      return;
    }
    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email,
      fullName: profile.displayName,
    };
    done(null, googleProfile);
  }
}
