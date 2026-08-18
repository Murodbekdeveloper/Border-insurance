import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import * as appleSignin from 'apple-signin-auth';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleProfile } from './strategies/google.strategy';
import { renderVerificationCodeEmail } from '../notifications/email-template';

export interface AppleProfile {
  appleId: string;
  email: string;
  fullName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const SALT_ROUNDS = 10;
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

// Thrown by login() when credentials are correct but the account's email
// hasn't been confirmed yet — the mobile app checks this specific code to
// route the user to the verification screen instead of showing a plain
// error toast.
const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';

function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('google.clientId'),
    );
  }

  private async sendVerificationCodeEmail(
    email: string,
    code: string,
  ): Promise<void> {
    await this.emailService.send({
      to: email,
      subject: 'OSAGO — emailni tasdiqlash kodi',
      html: renderVerificationCodeEmail(code),
    });
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ email: string; message: string }> {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const code = generateVerificationCode();
    const user = await this.usersService.createLocalUser({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      isEmailVerified: false,
      emailVerificationCode: code,
      emailVerificationCodeExpiresAt: new Date(
        Date.now() + VERIFICATION_CODE_TTL_MS,
      ),
    });
    await this.sendVerificationCodeEmail(user.email, code);
    return {
      email: user.email,
      message: 'Tasdiqlash kodi emailingizga yuborildi',
    };
  }

  async login(dto: LoginDto): Promise<{ user: User } & AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    if (!user.isActive) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    // TEMP (2026-08-19): SKIP_EMAIL_VERIFICATION_CHECK lets login bypass the
    // isEmailVerified gate — for testing the Asia Insurance submission flow
    // while SMTP deliverability to Gmail is still being diagnosed. Defaults
    // to unset/false everywhere; must be turned back off once done.
    const skipCheck = this.configService.get<boolean>(
      'skipEmailVerificationCheck',
    );
    if (!user.isEmailVerified && !skipCheck) {
      throw new ForbiddenException({
        code: EMAIL_NOT_VERIFIED_CODE,
        message: 'Email hali tasdiqlanmagan — tasdiqlash kodini kiriting',
      });
    }
    return { user, ...this.issueTokens(user) };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ user: User } & AuthTokens> {
    const user = await this.usersService.findByEmailWithVerificationCode(
      dto.email,
    );
    if (
      !user ||
      !user.emailVerificationCode ||
      !user.emailVerificationCodeExpiresAt
    ) {
      throw new BadRequestException(
        "Tasdiqlash kodi so'ralmagan yoki eskirgan",
      );
    }
    if (user.emailVerificationCodeExpiresAt < new Date()) {
      throw new BadRequestException(
        "Tasdiqlash kodi muddati tugagan — yangi kod so'rang",
      );
    }
    if (user.emailVerificationCode !== dto.code) {
      throw new BadRequestException("Tasdiqlash kodi noto'g'ri");
    }
    const verified = await this.usersService.markEmailVerified(user.id);
    return { user: verified, ...this.issueTokens(verified) };
  }

  async resendVerificationCode(dto: ResendVerificationDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);
    // Emailning ro'yxatdan o'tganini oshkor qilmaslik uchun, topilmasa ham
    // yoki allaqachon tasdiqlangan bo'lsa ham xato qaytarmaymiz — jim-jit
    // muvaffaqiyat qaytaramiz.
    if (!user || user.isEmailVerified) return;
    const code = generateVerificationCode();
    await this.usersService.setEmailVerificationCode(
      user.id,
      code,
      new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
    );
    await this.sendVerificationCodeEmail(user.email, code);
  }

  async loginWithGoogle(
    profile: GoogleProfile,
  ): Promise<{ user: User } & AuthTokens> {
    let user = await this.usersService.findByGoogleId(profile.googleId);
    if (!user) {
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        // Matched by email, not by googleId — persist it now so future
        // Google logins for this account resolve directly via googleId.
        user = await this.usersService.linkGoogleId(user.id, profile.googleId);
      }
    }
    if (!user) {
      user = await this.usersService.createGoogleUser({
        fullName: profile.fullName,
        email: profile.email,
        googleId: profile.googleId,
      });
    }
    if (!user.isActive) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    return { user, ...this.issueTokens(user) };
  }

  // Mobil ilova (Android: Credential Manager, iOS: GoogleSignIn-iOS SDK)
  // qurilmaning o'z akkaunt tanlash oynasidan foydalanib ID token oladi
  // (brauzersiz) — shu tokenni bu yerda tekshirib, xuddi brauzer-oqimidagidek
  // user topamiz/yaratamiz. Ikkala platforma bir xil web client id'ni
  // audience sifatida ishlatmaydi — iOS SDK o'zining alohida iOS client
  // id'i bilan token qaytaradi, shuning uchun ikkalasi ham qabul qilinadi.
  async loginWithGoogleIdToken(
    idToken: string,
  ): Promise<{ user: User } & AuthTokens> {
    const webClientId = this.configService.get<string>('google.clientId');
    const iosClientId = this.configService.get<string>('google.iosClientId');
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: [webClientId, iosClientId].filter((id): id is string => !!id),
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException("Google tokenini tasdiqlab bo'lmadi");
    }
    return this.loginWithGoogle({
      googleId: payload.sub,
      email: payload.email,
      fullName: payload.name ?? payload.email,
    });
  }

  async loginWithApple(
    profile: AppleProfile,
  ): Promise<{ user: User } & AuthTokens> {
    let user = await this.usersService.findByAppleId(profile.appleId);
    if (!user) {
      user = await this.usersService.findByEmail(profile.email);
      if (user) {
        // Matched by email, not by appleId — persist it now so future
        // Apple logins for this account resolve directly via appleId.
        user = await this.usersService.linkAppleId(user.id, profile.appleId);
      }
    }
    if (!user) {
      user = await this.usersService.createAppleUser({
        fullName: profile.fullName,
        email: profile.email,
        appleId: profile.appleId,
      });
    }
    if (!user.isActive) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    return { user, ...this.issueTokens(user) };
  }

  // The native Sign in with Apple flow (AuthenticationServices on iOS)
  // returns a signed identityToken directly — verified here against
  // Apple's public keys, no client secret needed. Unlike Google, Apple
  // only ever sends the user's name on the *first* authorization (never
  // inside the token itself), so the client must capture and forward it
  // that one time; every login after that, fullName is undefined here and
  // the already-stored account name is kept as-is.
  async loginWithAppleIdToken(
    identityToken: string,
    fullName?: string,
  ): Promise<{ user: User } & AuthTokens> {
    const bundleId = this.configService.get<string>('apple.bundleId')!;
    let payload: appleSignin.AppleIdTokenType;
    try {
      payload = await appleSignin.verifyIdToken(identityToken, {
        audience: bundleId,
        issuer: 'https://appleid.apple.com',
      });
    } catch {
      throw new UnauthorizedException("Apple tokenini tasdiqlab bo'lmadi");
    }
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException("Apple tokenini tasdiqlab bo'lmadi");
    }
    return this.loginWithApple({
      appleId: payload.sub,
      email: payload.email,
      fullName: fullName ?? payload.email,
    });
  }

  async refresh(userId: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    return this.issueTokens(user);
  }

  private issueTokens(user: User): AuthTokens {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<number>('jwt.accessExpiresInSeconds'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<number>('jwt.refreshExpiresInSeconds'),
    });
    return { accessToken, refreshToken };
  }
}
