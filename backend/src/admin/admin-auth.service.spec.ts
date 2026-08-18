import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminAuthService } from './admin-auth.service';
import { Admin, AdminRole } from './entities/admin.entity';
import { LoginAttemptsService } from './login-attempts.service';

function buildAdmin(overrides: Partial<Admin> = {}): Admin {
  return {
    id: 'admin-1',
    fullName: 'Murodbek',
    email: 'developermurodbek@gmail.com',
    passwordHash: '',
    role: AdminRole.SUPERADMIN,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let repository: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    count: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
  };
  let loginAttemptsService: {
    record: jest.Mock;
    countRecentFailures: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    repository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder),
      create: jest.fn((input: Partial<Admin>) => input),
      save: jest.fn((input: Partial<Admin>) =>
        Promise.resolve({ id: 'new-admin', ...input }),
      ),
      remove: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };
    loginAttemptsService = {
      record: jest.fn().mockResolvedValue(undefined),
      countRecentFailures: jest.fn().mockResolvedValue(0),
    };

    const jwtService = new JwtService();
    const configService = {
      get: (key: string) => {
        const values: Record<string, string | number> = {
          'adminJwt.accessSecret': 'test-admin-access-secret',
          'adminJwt.accessExpiresInSeconds': 900,
          'adminJwt.refreshSecret': 'test-admin-refresh-secret',
          'adminJwt.refreshExpiresInSeconds': 604800,
        };
        return values[key];
      },
    } as unknown as ConfigService;

    service = new AdminAuthService(
      repository as unknown as Repository<Admin>,
      jwtService,
      configService,
      loginAttemptsService as unknown as LoginAttemptsService,
    );
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      queryBuilder.getOne.mockResolvedValue(buildAdmin({ passwordHash: hash }));

      await expect(
        service.login({
          email: 'developermurodbek@gmail.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns the admin and tokens for a correct password', async () => {
      const hash = await bcrypt.hash('20061214develop.M', 10);
      queryBuilder.getOne.mockResolvedValue(buildAdmin({ passwordHash: hash }));

      const result = await service.login({
        email: 'developermurodbek@gmail.com',
        password: '20061214develop.M',
      });

      expect(result.admin.email).toBe('developermurodbek@gmail.com');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.accessToken).not.toBe(result.refreshToken);
    });

    it('records both failed and successful login attempts', async () => {
      queryBuilder.getOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(loginAttemptsService.record).toHaveBeenCalledWith(
        'nobody@example.com',
        null,
        false,
      );

      const hash = await bcrypt.hash('20061214develop.M', 10);
      queryBuilder.getOne.mockResolvedValue(buildAdmin({ passwordHash: hash }));
      await service.login(
        { email: 'developermurodbek@gmail.com', password: '20061214develop.M' },
        '127.0.0.1',
      );
      expect(loginAttemptsService.record).toHaveBeenCalledWith(
        'developermurodbek@gmail.com',
        '127.0.0.1',
        true,
      );
    });

    it('locks out after too many recent failures, even with the right password', async () => {
      loginAttemptsService.countRecentFailures.mockResolvedValue(5);
      const hash = await bcrypt.hash('20061214develop.M', 10);
      queryBuilder.getOne.mockResolvedValue(buildAdmin({ passwordHash: hash }));

      await expect(
        service.login({
          email: 'developermurodbek@gmail.com',
          password: '20061214develop.M',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(loginAttemptsService.record).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      queryBuilder.getOne.mockResolvedValue(buildAdmin({ passwordHash: hash }));

      await expect(
        service.changePassword('admin-1', {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hashes and saves the new password when the current one matches', async () => {
      const hash = await bcrypt.hash('correct-password', 10);
      queryBuilder.getOne.mockResolvedValue(buildAdmin({ passwordHash: hash }));

      await service.changePassword('admin-1', {
        currentPassword: 'correct-password',
        newPassword: 'new-password',
      });

      expect(repository.update).toHaveBeenCalledWith(
        { id: 'admin-1' },
        { passwordHash: expect.any(String) as string },
      );
    });
  });

  describe('createAdmin', () => {
    it('rejects an email that already belongs to an admin', async () => {
      repository.findOne.mockResolvedValue(buildAdmin());

      await expect(
        service.createAdmin({
          fullName: 'New Admin',
          email: 'developermurodbek@gmail.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('hashes the password and defaults to the admin role', async () => {
      repository.findOne.mockResolvedValue(null);

      const created = await service.createAdmin({
        fullName: 'New Admin',
        email: 'new@osago.uz',
        password: 'password123',
      });

      expect(created.role).toBe(AdminRole.ADMIN);
      expect(created.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', created.passwordHash)).toBe(
        true,
      );
    });
  });

  describe('deleteAdmin', () => {
    it('rejects deleting your own account', async () => {
      await expect(
        service.deleteAdmin('admin-1', 'admin-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects removing the last superadmin', async () => {
      repository.findOne.mockResolvedValue(buildAdmin({ id: 'admin-2' }));
      repository.count.mockResolvedValue(1);

      await expect(
        service.deleteAdmin('admin-2', 'admin-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('allows removing a regular admin', async () => {
      const target = buildAdmin({ id: 'admin-2', role: AdminRole.ADMIN });
      repository.findOne.mockResolvedValue(target);

      await service.deleteAdmin('admin-2', 'admin-1');

      expect(repository.remove).toHaveBeenCalledWith(target);
    });

    it('allows removing a superadmin when another one remains', async () => {
      const target = buildAdmin({ id: 'admin-2' });
      repository.findOne.mockResolvedValue(target);
      repository.count.mockResolvedValue(2);

      await service.deleteAdmin('admin-2', 'admin-1');

      expect(repository.remove).toHaveBeenCalledWith(target);
    });
  });

  describe('refresh', () => {
    it('rejects when the admin no longer exists', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.refresh('missing-admin')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues new tokens for an existing admin', async () => {
      repository.findOne.mockResolvedValue(buildAdmin());

      const result = await service.refresh('admin-1');

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });
  });
});
