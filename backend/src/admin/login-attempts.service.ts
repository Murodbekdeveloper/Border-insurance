import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AdminLoginAttempt } from './entities/admin-login-attempt.entity';

@Injectable()
export class LoginAttemptsService {
  constructor(
    @InjectRepository(AdminLoginAttempt)
    private readonly attemptsRepository: Repository<AdminLoginAttempt>,
  ) {}

  async record(
    email: string,
    ipAddress: string | null,
    success: boolean,
  ): Promise<void> {
    const attempt = this.attemptsRepository.create({
      email,
      ipAddress,
      success,
    });
    await this.attemptsRepository.save(attempt);
  }

  // Used to lock out an email after repeated failures — counts only
  // failed attempts within the given window (see AdminAuthService.login()).
  countRecentFailures(email: string, since: Date): Promise<number> {
    return this.attemptsRepository.count({
      where: { email, success: false, createdAt: MoreThanOrEqual(since) },
    });
  }

  findAllPaginated(
    page: number,
    limit: number,
  ): Promise<[AdminLoginAttempt[], number]> {
    return this.attemptsRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
