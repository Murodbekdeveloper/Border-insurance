import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehicleLookupQueryDto } from './dto/vehicle-lookup-query.dto';
import { AsiaInsuranceClientService } from '../insurance-partner/asia-insurance-client.service';
import { AsiaInsuranceApiError } from '../insurance-partner/asia-insurance-api.error';

export const VEHICLE_LOOKUP_NOT_CONFIGURED_CODE =
  'VEHICLE_LOOKUP_NOT_CONFIGURED';
export const VEHICLE_LOOKUP_NOT_FOUND_CODE = 'VEHICLE_LOOKUP_NOT_FOUND';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly asiaInsuranceClient: AsiaInsuranceClientService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchining barcha transport vositalari' })
  findAll(@CurrentUser() currentUser: RequestUser) {
    return this.vehiclesService.findAllForUser(currentUser.userId);
  }

  // Davlat raqami + texpasport bo'yicha Asia Insurance'dan qolgan transport
  // ma'lumotlarini (model, yili, kuzov/dvigatel raqami) olib, foydalanuvchi
  // ularni qo'lda kiritmasin deb frontendga qaytaradi. Topilmasa yoki
  // integratsiya hali sozlanmagan bo'lsa — xato emas, shunchaki "topilmadi"
  // qaytaradi, frontend qo'lda to'ldirishga tushib qoladi.
  @Get('lookup')
  @ApiOperation({
    summary:
      "Davlat raqami va texpasport bo'yicha transport ma'lumotlarini Asia Insurance'dan olish",
  })
  async lookup(@Query() query: VehicleLookupQueryDto) {
    try {
      const result = await this.asiaInsuranceClient.lookupVehicle({
        gos_number: query.plateNumber,
        tech_sery: query.techPassportSeries,
        tech_number: query.techPassportNumber,
      });
      if (!result.result) {
        throw new NotFoundException({
          code: VEHICLE_LOOKUP_NOT_FOUND_CODE,
          message: result.message || 'Transport vositasi topilmadi',
        });
      }
      return {
        model: result.response.model,
        manufactureYear: result.response.manufacture_year,
        bodyNumber: result.response.body_number,
        engineNumber: result.response.engine_number,
      };
    } catch (err) {
      if (err instanceof AsiaInsuranceApiError && err.httpStatus === 0) {
        throw new ServiceUnavailableException({
          code: VEHICLE_LOOKUP_NOT_CONFIGURED_CODE,
          message: 'Asia Insurance API hali ulanmagan',
        });
      }
      // Har qanday boshqa yuqori tomon xatosi (haqiqiy 404, autentifikatsiya
      // xatosi va h.k.) ham "topilmadi" sifatida qaytariladi — frontend
      // uchun natija bir xil: qo'lda to'ldirishga o'tish.
      if (err instanceof AsiaInsuranceApiError) {
        throw new NotFoundException({
          code: VEHICLE_LOOKUP_NOT_FOUND_CODE,
          message: 'Transport vositasi topilmadi',
        });
      }
      throw err;
    }
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
