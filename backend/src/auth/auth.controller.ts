import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleTokenDto } from './dto/google-token.dto';
import { AppleTokenDto } from './dto/apple-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './decorators/current-user.decorator';
import type { GoogleProfile } from './strategies/google.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary:
      "Email va parol orqali ro'yxatdan o'tish (tasdiqlash kodi emailga yuboriladi)",
  })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'Email allaqachon band' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Emailga yuborilgan tasdiqlash kodini tekshirish' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 400, description: "Kod noto'g'ri yoki muddati tugagan" })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Tasdiqlash kodini qayta yuborish' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerificationCode(dto);
    return { message: "Agar hisob mavjud bo'lsa, kod qayta yuborildi" };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email va parol orqali kirish' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "Email yoki parol noto'g'ri" })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: "Google OAuth2 orqali kirishni boshlash (brauzerni yo'naltiradi)",
  })
  googleAuth() {
    // Handled by GoogleAuthGuard, which redirects to Google's consent screen.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  async googleCallback(
    @Req() req: { user: GoogleProfile; query: { state?: string } },
    @Res() res: Response,
  ) {
    const result = await this.authService.loginWithGoogle(req.user);

    if (req.query.state === 'mobile') {
      // Mobil ilova expo-web-browser orqali shu maxsus schemani ushlab qoladi —
      // haqiqiy sahifa yuklanmaydi, faqat URL query orqali tokenlar uzatiladi.
      const redirectUrl = `border://auth-callback?accessToken=${encodeURIComponent(result.accessToken)}&refreshToken=${encodeURIComponent(result.refreshToken)}`;
      res.redirect(redirectUrl);
      return;
    }

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const redirectUrl = new URL('/auth/callback', frontendUrl);
    redirectUrl.searchParams.set('accessToken', result.accessToken);
    redirectUrl.searchParams.set('refreshToken', result.refreshToken);
    res.redirect(redirectUrl.toString());
  }

  @Post('google/token')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Mobil ilovaning native Google Sign-In (qurilma akkaunt tanlash oynasi) orqali olingan ID token bilan kirish",
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "Google tokeni yaroqsiz" })
  async googleToken(@Body() dto: GoogleTokenDto) {
    return this.authService.loginWithGoogleIdToken(dto.idToken);
  }

  @Post('apple/token')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Mobil ilovaning native Sign in with Apple orqali olingan identityToken bilan kirish",
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "Apple tokeni yaroqsiz" })
  async appleToken(@Body() dto: AppleTokenDto) {
    return this.authService.loginWithAppleIdToken(
      dto.identityToken,
      dto.fullName,
    );
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Access tokenni yangilash' })
  refresh(@CurrentUser() currentUser: RequestUser) {
    return this.authService.refresh(currentUser.userId);
  }
}
