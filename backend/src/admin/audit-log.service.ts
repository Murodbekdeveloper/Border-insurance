import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepository: Repository<AdminAuditLog>,
  ) {}

  async record(
    adminId: string,
    adminEmail: string,
    action: string,
    targetType: string,
    targetId?: string,
    details?: string,
  ): Promise<void> {
    const entry = this.auditLogRepository.create({
      adminId,
      adminEmail,
      action,
      targetType,
      targetId: targetId ?? null,
      details: details ?? null,
    });
    await this.auditLogRepository.save(entry);
  }

  findAllPaginated(
    page: number,
    limit: number,
  ): Promise<[AdminAuditLog[], number]> {
    return this.auditLogRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
