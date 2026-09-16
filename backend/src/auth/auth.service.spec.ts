import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { User } from '../users/entities/user.entity';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    fullName: 'Aziz Karimov',
    email: 'aziz@example.com',
    passwordHash: null,
    googleId: null,
    appleId: null,
    phone: '+998901234567',
    residentType: null,
    passportSeries: null,
    passportNumber: null,
    birthDate: null,
    citizenshipId: null,
    isActive: true,
    isEmailVerified: true,
    isGuest: false,
    emailVerificationCode: null,
    emailVerificationCodeExpiresAt: null,
    createdAt: new Date(),
    vehicles: [],
    policies: [],
    cards: [],
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    createLocalUser: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    findByGoogleId: jest.Mock;
    findByEmail: jest.Mock;
    findByEmailWithVerificationCode: jest.Mock;
    markEmailVerified: jest.Mock;
    setEmailVerificationCode: jest.Mock;
    createGoogleUser: jest.Mock;
    linkGoogleId: jest.Mock;
    findById: jest.Mock;
  };
  let emailService: { send: jest.Mock };

  beforeEach(async () => {
    usersService = {
      createLocalUser: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithVerificationCode: jest.fn(),
      markEmailVerified: jest.fn((id: string) =>
        Promise.resolve(buildUser({ id, isEmailVerified: true })),
      ),
      setEmailVerificationCode: jest.fn(),
      createGoogleUser: jest.fn(),
      linkGoogleId: jest.fn((id: string, googleId: string) =>
        Promise.resolve(buildUser({ id, googleId })),
      ),
      findById: jest.fn(),
    };
    emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: EmailService, useValue: emailService },
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const values: Record<string, string | number> = {
                'jwt.accessSecret': 'test-access-secret',
                'jwt.accessExpiresInSeconds': 900,
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.refreshExpiresInSeconds': 604800,
              };
              return values[key];
            },
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password before storing the user', async () => {
      const savedUser = buildUser({
        passwordHash: 'stored-hash',
        isEmailVerified: false,
      });
      usersService.createLocalUser.mockResolvedValue(savedUser);

      await service.register({
        fullName: 'Aziz Karimov',
        email: 'aziz@example.com',
        phone: '+998901234567',
        password: 'password123',
      });

      const [args] = usersService.createLocalUser.mock.calls[0] as [
        { passwordHash: string },
      ];
      expect(args.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', args.passwordHash)).toBe(true);
    });

    it('creates the user unverified with a 6-digit code and emails it, without issuing tokens', async () => {
      const savedUser = buildUser({ isEmailVerified: false });
      usersService.createLocalUser.mockResolvedValue(savedUser);

      const result = await service.register({
        fullName: 'Aziz Karimov',
        email: 'aziz@example.com',
        phone: '+998901234567',
        password: 'password123',
      });

      const [args] = usersService.createLocalUser.mock.calls[0] as [
        { isEmailVerified: boolean; emailVerificationCode: string },
      ];
      expect(args.isEmailVerified).toBe(false);
      expect(args.emailVerificationCode).toMatch(/^\d{6}$/);
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'aziz@example.com' }),
      );
      expect(result).toEqual({
        email: 'aziz@example.com',
        message: expect.any(String) as string,
      });
      expect((result as { accessToken?: string }).accessToken).toBeUndefined();
    });
  });

  describe('login', () => {
    it('rejects when no user exists for the email', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nouser@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a Google-only account (no password set)', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: null }),
      );

      await expect(
        service.login({ email: 'aziz@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: hash }),
      );

      await expect(
        service.login({
          email: 'aziz@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns tokens for a correct password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: hash }),
      );

      const result = await service.login({
        email: 'aziz@example.com',
        password: 'correct-password',
      });

      expect(result.user.email).toBe('aziz@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('rejects a blocked account even with the correct password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: hash, isActive: false }),
      );

      await expect(
        service.login({
          email: 'aziz@example.com',
          password: 'correct-password',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an unverified account even with the correct password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      usersService.findByEmailWithPassword.mockResolvedValue(
        buildUser({ passwordHash: hash, isEmailVerified: false }),
      );

      await expect(
        service.login({
          email: 'aziz@example.com',
          password: 'correct-password',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('verifyEmail', () => {
    it('rejects when no code was ever requested', async () => {
      usersService.findByEmailWithVerificationCode.mockResolvedValue(
        buildUser({ emailVerificationCode: null }),
      );

      await expect(
        service.verifyEmail({ email: 'aziz@example.com', code: '123456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired code', async () => {
      usersService.findByEmailWithVerificationCode.mockResolvedValue(
        buildUser({
          emailVerificationCode: '123456',
          emailVerificationCodeExpiresAt: new Date(Date.now() - 1000),
        }),
      );

      await expect(
        service.verifyEmail({ email: 'aziz@example.com', code: '123456' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a mismatched code', async () => {
      usersService.findByEmailWithVerificationCode.mockResolvedValue(
        buildUser({
          emailVerificationCode: '123456',
          emailVerificationCodeExpiresAt: new Date(Date.now() + 10_000),
        }),
      );

      await expect(
        service.verifyEmail({ email: 'aziz@example.com', code: '000000' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the account verified and issues tokens for a matching, unexpired code', async () => {
      usersService.findByEmailWithVerificationCode.mockResolvedValue(
        buildUser({
          emailVerificationCode: '123456',
          emailVerificationCodeExpiresAt: new Date(Date.now() + 10_000),
          isEmailVerified: false,
        }),
      );

      const result = await service.verifyEmail({
        email: 'aziz@example.com',
        code: '123456',
      });

      expect(usersService.markEmailVerified).toHaveBeenCalledWith('user-1');
      expect(result.user.isEmailVerified).toBe(true);
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });
  });

  describe('resendVerificationCode', () => {
    it('does nothing when no account matches the email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await service.resendVerificationCode({ email: 'nouser@example.com' });

      expect(usersService.setEmailVerificationCode).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('does nothing when the account is already verified', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUser({ isEmailVerified: true }),
      );

      await service.resendVerificationCode({ email: 'aziz@example.com' });

      expect(usersService.setEmailVerificationCode).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('generates and emails a new code for an unverified account', async () => {
      usersService.findByEmail.mockResolvedValue(
        buildUser({ isEmailVerified: false }),
      );

      await service.resendVerificationCode({ email: 'aziz@example.com' });

      expect(usersService.setEmailVerificationCode).toHaveBeenCalledWith(
        'user-1',
        expect.stringMatching(/^\d{6}$/),
        expect.any(Date),
      );
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'aziz@example.com' }),
      );
    });
  });

  describe('loginWithGoogle', () => {
    it('reuses an existing user matched by googleId', async () => {
      const existing = buildUser({ googleId: 'google-123' });
      usersService.findByGoogleId.mockResolvedValue(existing);

      const result = await service.loginWithGoogle({
        googleId: 'google-123',
        email: 'aziz@example.com',
        fullName: 'Aziz Karimov',
      });

      expect(result.user).toBe(existing);
      expect(usersService.createGoogleUser).not.toHaveBeenCalled();
    });

    it('falls back to matching by email, linking googleId, before creating a new user', async () => {
      const existing = buildUser({ googleId: null });
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(existing);

      const result = await service.loginWithGoogle({
        googleId: 'google-123',
        email: 'aziz@example.com',
        fullName: 'Aziz Karimov',
      });

      expect(usersService.linkGoogleId).toHaveBeenCalledWith(
        existing.id,
        'google-123',
      );
      expect(result.user.googleId).toBe('google-123');
      expect(usersService.createGoogleUser).not.toHaveBeenCalled();
    });

    it('creates a new user when no match is found', async () => {
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      const created = buildUser({ googleId: 'google-123' });
      usersService.createGoogleUser.mockResolvedValue(created);

      const result = await service.loginWithGoogle({
        googleId: 'google-123',
        email: 'new@example.com',
        fullName: 'New User',
      });

      expect(result.user).toBe(created);
      expect(usersService.createGoogleUser).toHaveBeenCalledWith({
        fullName: 'New User',
        email: 'new@example.com',
        googleId: 'google-123',
      });
    });
  });

  describe('refresh', () => {
    it('rejects when the user no longer exists', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('missing-user')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues new tokens for an existing user', async () => {
      usersService.findById.mockResolvedValue(buildUser());

      const result = await service.refresh('user-1');

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });
  });
});
