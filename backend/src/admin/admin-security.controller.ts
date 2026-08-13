import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { LoginAttemptsService } from './login-attempts.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/security')
export class AdminSecurityController {
  constructor(private readonly loginAttemptsService: LoginAttemptsService) {}

  @Get('login-attempts')
  @ApiOperation({ summary: "Admin panelga kirish urinishlari tarixi" })
  async list(@Query() query: PaginationQueryDto) {
    const [data, total] = await this.loginAttemptsService.findAllPaginated(
      query.page,
      query.limit,
    );
    return { data, total, page: query.page, limit: query.limit };
  }
}
