import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    fullName: 'Aziz Karimov',
    email: 'aziz@example.com',
    pendingEmail: null,
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

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    const configService = {
      get: () => 'test-secret',
    } as unknown as ConfigService;
    strategy = new JwtStrategy(
      configService,
      usersService as unknown as UsersService,
    );
  });

  it('accepts an active user and returns the request principal', async () => {
    usersService.findById.mockResolvedValue(buildUser());

    const result = await strategy.validate({
      sub: 'user-1',
      email: 'aziz@example.com',
    });

    expect(result).toEqual({ userId: 'user-1', email: 'aziz@example.com' });
  });

  it('rejects a blocked user even with a valid, unexpired token', async () => {
    usersService.findById.mockResolvedValue(buildUser({ isActive: false }));

    await expect(
      strategy.validate({ sub: 'user-1', email: 'aziz@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token for a user that no longer exists', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'user-1', email: 'aziz@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
