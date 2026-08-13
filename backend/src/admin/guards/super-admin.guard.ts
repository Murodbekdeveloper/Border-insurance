import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AdminAuthService } from '../admin-auth.service';
import { AdminRole } from '../entities/admin.entity';
import type { RequestAdmin } from '../decorators/current-admin.decorator';

// Must run after AdminJwtAuthGuard. Restricts admin-account management
// (creating/removing other admins) to superadmins only.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: RequestAdmin }>();
    const admin = await this.adminAuthService.findById(request.user.adminId);
    if (!admin || admin.role !== AdminRole.SUPERADMIN) {
      throw new ForbiddenException('Faqat superadmin uchun');
    }
    return true;
  }
}
