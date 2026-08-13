import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { SearchQueryDto } from './dto/search-query.dto';
import { UsersService } from '../users/users.service';
import { PoliciesService } from '../policies/policies.service';
import { PaymentsService } from '../payments/payments.service';

const RESULTS_PER_TYPE = 5;

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/search')
export class AdminSearchController {
  constructor(
    private readonly usersService: UsersService,
    private readonly policiesService: PoliciesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Foydalanuvchi, so'rov va to'lovlar bo'yicha global qidiruv",
  })
  async search(@Query() query: SearchQueryDto) {
    const [users, policies, payments] = await Promise.all([
      this.usersService.searchTop(query.q, RESULTS_PER_TYPE),
      this.policiesService.searchTop(query.q, RESULTS_PER_TYPE),
      this.paymentsService.searchTop(query.q, RESULTS_PER_TYPE),
    ]);
    return { users, policies, payments };
  }
}
