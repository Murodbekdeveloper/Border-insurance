import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchining barcha transport vositalari' })
  findAll(@CurrentUser() currentUser: RequestUser) {
    return this.vehiclesService.findAllForUser(currentUser.userId);
  }

  @Post()
  @ApiOperation({ summary: "Transport vositasi ma'lumotlarini saqlash" })
  create(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(currentUser.userId, dto);
  }
}
