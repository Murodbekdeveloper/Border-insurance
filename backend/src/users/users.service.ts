import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { EmailService } from '../notifications/email.service';
import { renderEmailChangeCodeEmail } from '../notifications/email-template';
import { generateVerificationCode } from '../common/verification-code';
import { ResidentType, User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PASSWORD_SALT_ROUNDS = 10;
const EMAIL_CHANGE_CODE_TTL_MS = 15 * 60 * 1000;

function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string; driverError?: { code?: string } })?.code ??
    (err as { driverError?: { code?: string } })?.driverError?.code;
  return code === '23505';
}

interface CreateLocalUserInput {
  fullName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  isEmailVerified: boolean;
  emailVerificationCode: string;
  emailVerificationCodeExpiresAt: Date;
}

interface CreateGoogleUserInput {
  fullName: string;
  email: string;
  googleId: string;
}

interface CreateAppleUserInput {
  fullName: string;
  email: string;
  appleId: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  findByAppleId(appleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { appleId } });
  }

  findByEmailWithVerificationCode(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.emailVerificationCode',
        'user.emailVerificationCodeExpiresAt',
      ])
      .where('user.email = :email', { email })
      .getOne();
  }

  async markEmailVerified(id: string): Promise<User> {
    await this.usersRepository.update(
      { id },
      {
        isEmailVerified: true,
        emailVerificationCode: null,
        emailVerificationCodeExpiresAt: null,
      },
    );
    const user = await this.findById(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async setEmailVerificationCode(
    id: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(
      { id },
      {
        emailVerificationCode: code,
        emailVerificationCodeExpiresAt: expiresAt,
      },
    );
  }

  private findByIdWithPendingEmail(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect([
        'user.emailVerificationCode',
        'user.emailVerificationCodeExpiresAt',
      ])
      .where('user.id = :id', { id })
      .getOne();
  }

  // Lets a guest or phone-only account add/replace their email from the
  // profile page — stores it as pendingEmail until confirmEmailChange()
  // checks the emailed code, so the confirmed `email` column (used for
  // login) never changes to something not yet proven deliverable.
  async requestEmailChange(id: string, newEmail: string): Promise<void> {
    const existing = await this.findByEmail(newEmail);
    if (existing) {
      throw new ConflictException(
        "Bu email manzili bilan foydalanuvchi allaqachon ro'yxatdan o'tgan",
      );
    }
    const code = generateVerificationCode();
    await this.usersRepository.update(
      { id },
      {
        pendingEmail: newEmail,
        emailVerificationCode: code,
        emailVerificationCodeExpiresAt: new Date(
          Date.now() + EMAIL_CHANGE_CODE_TTL_MS,
        ),
      },
    );
    await this.emailService.send({
      to: newEmail,
      subject: 'OSAGO — emailni tasdiqlash kodi',
      html: renderEmailChangeCodeEmail(code),
    });
  }

  async confirmEmailChange(id: string, code: string): Promise<User> {
    const user = await this.findByIdWithPendingEmail(id);
    if (
      !user ||
      !user.pendingEmail ||
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
    if (user.emailVerificationCode !== code) {
      throw new BadRequestException("Tasdiqlash kodi noto'g'ri");
    }
    try {
      await this.usersRepository.update(
        { id },
        {
          email: user.pendingEmail,
          pendingEmail: null,
          isEmailVerified: true,
          emailVerificationCode: null,
          emailVerificationCodeExpiresAt: null,
        },
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          "Bu email manzili bilan foydalanuvchi allaqachon ro'yxatdan o'tgan",
        );
      }
      throw err;
    }
    const updated = await this.findById(id);
    if (!updated) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return updated;
  }

  private findByIdWithPassword(id: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async hasPasswordSet(id: string): Promise<boolean> {
    const user = await this.findByIdWithPassword(id);
    return !!user?.passwordHash;
  }

  async createLocalUser(input: CreateLocalUserInput): Promise<User> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException(
        "Bu email manzili bilan foydalanuvchi allaqachon ro'yxatdan o'tgan",
      );
    }
    const user = this.usersRepository.create({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash: input.passwordHash,
      isEmailVerified: input.isEmailVerified,
      emailVerificationCode: input.emailVerificationCode,
      emailVerificationCodeExpiresAt: input.emailVerificationCodeExpiresAt,
    });
    return this.usersRepository.save(user);
  }

  // "Mehmon sifatida kirish" — a fully-usable account with no real email or
  // password, so it skips register()'s email-verification step entirely.
  // The generated email is never sent to and can't collide with a real
  // registration (guest.<uuid>@guest.borderinsurance.uz isn't a domain
  // anyone else can register under), so no uniqueness check is needed here.
  async createGuestUser(): Promise<User> {
    const user = this.usersRepository.create({
      fullName: 'Mehmon',
      email: `guest.${randomUUID()}@guest.borderinsurance.uz`,
      isEmailVerified: true,
      isGuest: true,
    });
    return this.usersRepository.save(user);
  }

  async createGoogleUser(input: CreateGoogleUserInput): Promise<User> {
    const user = this.usersRepository.create({
      fullName: input.fullName,
      email: input.email,
      googleId: input.googleId,
    });
    return this.usersRepository.save(user);
  }

  // Persists googleId onto a user who was matched by email (not by an
  // existing googleId) during a Google login — otherwise every subsequent
  // Google login for that account repeats the same email-fallback lookup
  // and googleId never actually gets recorded.
  async linkGoogleId(id: string, googleId: string): Promise<User> {
    await this.usersRepository.update({ id }, { googleId });
    const user = await this.findById(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async createAppleUser(input: CreateAppleUserInput): Promise<User> {
    const user = this.usersRepository.create({
      fullName: input.fullName,
      email: input.email,
      appleId: input.appleId,
    });
    return this.usersRepository.save(user);
  }

  // Mirrors linkGoogleId — see that method's comment.
  async linkAppleId(id: string, appleId: string): Promise<User> {
    await this.usersRepository.update({ id }, { appleId });
    const user = await this.findById(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async updateResidentType(
    id: string,
    residentType: ResidentType,
  ): Promise<User> {
    await this.usersRepository.update({ id }, { residentType });
    const user = await this.findById(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    await this.usersRepository.update({ id }, dto);
    const user = await this.findById(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async changePassword(
    id: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<User> {
    const user = await this.findByIdWithPassword(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Joriy parolni kiriting');
      }
      const matches = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!matches) {
        throw new BadRequestException("Joriy parol noto'g'ri");
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await this.usersRepository.update({ id }, { passwordHash });
    const updated = await this.findById(id);
    if (!updated) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return updated;
  }

  countAll(): Promise<number> {
    return this.usersRepository.count();
  }

  findAllPaginated(
    page: number,
    limit: number,
    search?: string,
  ): Promise<[User[], number]> {
    if (!search) {
      return this.usersRepository.findAndCount({
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    }
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.fullName ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      })
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  findAllMatching(search?: string): Promise<User[]> {
    if (!search) {
      return this.usersRepository.find({ order: { createdAt: 'DESC' } });
    }
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.fullName ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    await this.usersRepository.update({ id }, { isActive });
    const user = await this.findById(id);
    if (!user) {
      throw new ConflictException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  countCreatedSince(since: Date): Promise<number> {
    return this.usersRepository.count({
      where: { createdAt: MoreThanOrEqual(since) },
    });
  }

  countCreatedBetween(start: Date, end: Date): Promise<number> {
    return this.usersRepository.count({
      where: { createdAt: Between(start, end) },
    });
  }

  findRecent(limit: number): Promise<User[]> {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  searchTop(query: string, limit: number): Promise<User[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.fullName ILIKE :search OR user.email ILIKE :search', {
        search: `%${query}%`,
      })
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }
}
