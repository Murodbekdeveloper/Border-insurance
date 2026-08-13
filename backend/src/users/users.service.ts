import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ResidentType, User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PASSWORD_SALT_ROUNDS = 10;

interface CreateLocalUserInput {
  fullName: string;
  email: string;
  phone: string;
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
      .addSelect(['user.emailVerificationCode', 'user.emailVerificationCodeExpiresAt'])
      .where('user.email = :email', { email })
      .getOne();
  }

  async markEmailVerified(id: string): Promise<User> {
    await this.usersRepository.update(
      { id },
      { isEmailVerified: true, emailVerificationCode: null, emailVerificationCodeExpiresAt: null },
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
      { emailVerificationCode: code, emailVerificationCodeExpiresAt: expiresAt },
    );
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
