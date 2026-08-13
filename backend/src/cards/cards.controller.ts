import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { VerifyCardDto } from './dto/verify-card.dto';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: "Saqlangan kartalar ro'yxati" })
  findAll(@CurrentUser() currentUser: RequestUser) {
    return this.cardsService.findAllForUser(currentUser.userId);
  }

  @Post()
  @ApiOperation({
    summary: "Yangi karta qo'shish (maskalangan holda saqlanadi)",
  })
  create(@CurrentUser() currentUser: RequestUser, @Body() dto: CreateCardDto) {
    return this.cardsService.create(currentUser.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: "Kartani o'chirish" })
  async remove(
    @CurrentUser() currentUser: RequestUser,
    @Param('id') id: string,
  ) {
    await this.cardsService.remove(id, currentUser.userId);
  }

  @Post(':id/payme/verify-request')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Payme orqali kartani tasdiqlash uchun SMS kodini yuborish (faqat Payme gateway faol bo‘lganda)',
  })
  async requestPaymeVerification(
    @CurrentUser() currentUser: RequestUser,
    @Param('id') id: string,
  ) {
    await this.cardsService.requestPaymeVerification(id, currentUser.userId);
  }

  @Post(':id/payme/verify')
  @ApiOperation({ summary: 'SMS kod bilan kartani Payme orqali tasdiqlash' })
  confirmPaymeVerification(
    @CurrentUser() currentUser: RequestUser,
    @Param('id') id: string,
    @Body() dto: VerifyCardDto,
  ) {
    return this.cardsService.confirmPaymeVerification(
      id,
      currentUser.userId,
      dto.code,
    );
  }
}
