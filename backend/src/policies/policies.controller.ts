import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { PoliciesService } from './policies.service';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { AsiaInsuranceApiError } from '../insurance-partner/asia-insurance-api.error';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchining barcha polislari' })
  findAll(@CurrentUser() currentUser: RequestUser) {
    return this.policiesService.findAllForUser(currentUser.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi ariza (qoralama polis) yaratish' })
  create(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: CreatePolicyDto,
  ) {
    return this.policiesService.create(currentUser.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta arizani (polisni) olish' })
  findOne(
    @CurrentUser() currentUser: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.findByIdForUser(id, currentUser.userId);
  }

  @Get(':id/price')
  @ApiOperation({ summary: 'Ariza uchun narxni hisoblash' })
  async getPrice(
    @CurrentUser() currentUser: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const price = await this.wrap(() =>
      this.policiesService.getPrice(id, currentUser.userId),
    );
    return { price };
  }

  @Post(':id/submit-to-partner')
  @ApiOperation({
    summary: "Asia Insurance'ga ariza yuborish va to'lov havolasini olish",
  })
  submitToPartner(
    @CurrentUser() currentUser: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.wrap(() =>
      this.policiesService.submitToPartner(id, currentUser.userId),
    );
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: "To'lovdan keyin polisni tasdiqlash" })
  confirm(
    @CurrentUser() currentUser: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.policiesService.confirm(id, currentUser.userId);
  }

  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Polis PDF faylini yuklab olish' })
  async getPdf(
    @CurrentUser() currentUser: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.policiesService.generatePdf(
      id,
      currentUser.userId,
    );
    res.set({
      'Content-Disposition': `attachment; filename="${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // Mirrors ApexBoxController/InsurancePartnerController's own wrap() —
  // getPrice/submitToPartner both end up calling whichever partner client
  // (Asia Insurance or Apex_Box) is relevant for the policy's vehicle, and
  // either one throws this same AsiaInsuranceApiError(0, ...) when its
  // credentials aren't configured. Without this, that surfaced as a raw,
  // unhandled 500 instead of a clean, actionable error.
  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof AsiaInsuranceApiError && err.httpStatus === 0) {
        throw new ServiceUnavailableException(
          "Sug'urta kompaniyasi bilan integratsiya hali sozlanmagan",
        );
      }
      // Any other AsiaInsuranceApiError means the partner's HTTP response
      // itself wasn't ok (a real status + response body, already logged by
      // AsiaInsuranceClientService.parse()). Surfaced as a clean 502 instead
      // of falling through to Nest's generic, undiagnosable 500 — check the
      // Render logs for the logged response body to see their actual reason.
      if (err instanceof AsiaInsuranceApiError) {
        throw new BadGatewayException(
          "Sug'urta kompaniyasi (Asia Insurance) so'rovni rad etdi. Transport va fuqaro ma'lumotlarini tekshirib, birozdan so'ng qayta urinib ko'ring.",
        );
      }
      throw err;
    }
  }
}
