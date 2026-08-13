import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin, AdminRole } from './entities/admin.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { LoginAttemptsService } from './login-attempts.service';

const SALT_ROUNDS = 10;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export interface AdminAuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginAttemptsService: LoginAttemptsService,
  ) {}

  findById(id: string): Promise<Admin | null> {
    return this.adminsRepository.findOne({ where: { id } });
  }

  private findByEmailWithPassword(email: string): Promise<Admin | null> {
    return this.adminsRepository
      .createQueryBuilder('admin')
      .addSelect('admin.passwordHash')
      .where('admin.email = :email', { email })
      .getOne();
  }

  async login(
    dto: AdminLoginDto,
    ipAddress: string | null = null,
  ): Promise<{ admin: Admin } & AdminAuthTokens> {
    const recentFailures = await this.loginAttemptsService.countRecentFailures(
      dto.email,
      new Date(Date.now() - LOCKOUT_WINDOW_MS),
    );
    if (recentFailures >= LOCKOUT_THRESHOLD) {
      throw new UnauthorizedException(
        "Juda ko'p noto'g'ri urinish qilindi. 15 daqiqadan so'ng qayta urinib ko'ring",
      );
    }

    const admin = await this.findByEmailWithPassword(dto.email);
    const matches = admin
      ? await bcrypt.compare(dto.password, admin.passwordHash)
      : false;

    await this.loginAttemptsService.record(dto.email, ipAddress, matches);

    if (!admin || !matches) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    if (!admin.isActive) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    return { admin, ...this.issueTokens(admin) };
  }

  async refresh(adminId: string): Promise<AdminAuthTokens> {
    const admin = await this.findById(adminId);
    if (!admin) {
      throw new UnauthorizedException('Administrator topilmadi');
    }
    if (!admin.isActive) {
      throw new ForbiddenException('Hisobingiz bloklangan');
    }
    return this.issueTokens(admin);
  }

  findAll(): Promise<Admin[]> {
    return this.adminsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async createAdmin(dto: CreateAdminDto): Promise<Admin> {
    const existing = await this.adminsRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        'Bu email manzili bilan administrator allaqachon mavjud',
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const admin = this.adminsRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role ?? AdminRole.ADMIN,
    });
    return this.adminsRepository.save(admin);
  }

  async deleteAdmin(id: string, requestingAdminId: string): Promise<void> {
    if (id === requestingAdminId) {
      throw new BadRequestException("O'zingizni o'chira olmaysiz");
    }
    const admin = await this.findById(id);
    if (!admin) {
      throw new BadRequestException('Administrator topilmadi');
    }
    if (admin.role === AdminRole.SUPERADMIN) {
      const superadminCount = await this.adminsRepository.count({
        where: { role: AdminRole.SUPERADMIN },
      });
      if (superadminCount <= 1) {
        throw new BadRequestException("Yagona superadminni o'chirib bo'lmaydi");
      }
    }
    await this.adminsRepository.remove(admin);
  }

  async updateProfile(
    id: string,
    dto: UpdateAdminProfileDto,
  ): Promise<Admin> {
    await this.adminsRepository.update({ id }, { fullName: dto.fullName });
    const admin = await this.findById(id);
    if (!admin) {
      throw new BadRequestException('Administrator topilmadi');
    }
    return admin;
  }

  async changePassword(
    id: string,
    dto: ChangeAdminPasswordDto,
  ): Promise<void> {
    const admin = await this.adminsRepository
      .createQueryBuilder('admin')
      .addSelect('admin.passwordHash')
      .where('admin.id = :id', { id })
      .getOne();
    if (!admin) {
      throw new BadRequestException('Administrator topilmadi');
    }
    const matches = await bcrypt.compare(
      dto.currentPassword,
      admin.passwordHash,
    );
    if (!matches) {
      throw new BadRequestException("Joriy parol noto'g'ri");
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.adminsRepository.update({ id }, { passwordHash });
  }

  private issueTokens(admin: Admin): AdminAuthTokens {
    const payload = { sub: admin.id, email: admin.email };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('adminJwt.accessSecret'),
      expiresIn: this.configService.get<number>(
        'adminJwt.accessExpiresInSeconds',
      ),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('adminJwt.refreshSecret'),
      expiresIn: this.configService.get<number>(
        'adminJwt.refreshExpiresInSeconds',
      ),
    });
    return { accessToken, refreshToken };
  }
}
