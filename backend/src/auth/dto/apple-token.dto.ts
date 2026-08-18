import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class AppleTokenDto {
  @ApiProperty({
    description: 'Sign in with Apple tomonidan qaytarilgan identityToken',
  })
  @IsString()
  @MinLength(1)
  identityToken: string;

  // Apple bu maydonni faqat foydalanuvchi shu ilovaga BIRINCHI marta ruxsat
  // berganda va faqat qurilmaning o'zida qaytaradi — identityToken ichida
  // umuman kelmaydi. Keyingi kirishlarda bo'sh qoldiriladi.
  @ApiPropertyOptional({
    description: 'Faqat birinchi kirishda mobil ilova yuboradi',
  })
  @IsOptional()
  @IsString()
  fullName?: string;
}
