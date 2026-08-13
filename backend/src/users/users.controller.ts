import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateResidentTypeDto } from './dto/update-resident-type.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private async withHasPassword(user: User) {
    const hasPassword = await this.usersService.hasPasswordSet(user.id);
    return { ...user, hasPassword };
  }

  @Get('me')
  @ApiOperation({ summary: "Joriy foydalanuvchi ma'lumotlarini olish" })
  async me(@CurrentUser() currentUser: RequestUser) {
    const user = await this.usersService.findById(currentUser.userId);
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    return this.withHasPassword(user);
  }

  @Patch('me')
  @ApiOperation({
    summary: "Profil ma'lumotlarini (F.I.O., telefon) tahrirlash",
  })
  async updateProfile(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(currentUser.userId, dto);
    return this.withHasPassword(user);
  }

  @Patch('me/password')
  @ApiOperation({ summary: "Parolni o'rnatish/almashtirish" })
  async changePassword(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = await this.usersService.changePassword(
      currentUser.userId,
      dto.currentPassword,
      dto.newPassword,
    );
    return this.withHasPassword(user);
  }

  @Patch('me/resident-type')
  @ApiOperation({ summary: 'Rezident turini belgilash' })
  async updateResidentType(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: UpdateResidentTypeDto,
  ) {
    const user = await this.usersService.updateResidentType(
      currentUser.userId,
      dto.residentType,
    );
    return this.withHasPassword(user);
  }
}
