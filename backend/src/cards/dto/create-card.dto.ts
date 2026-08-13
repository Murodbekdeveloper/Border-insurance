import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateCardDto {
  @ApiProperty({ example: 'ALI VALIYEV' })
  @IsString()
  @MinLength(3)
  cardHolderName: string;

  @ApiProperty({
    example: '4111111111111111',
    description: '16 digit card number (never stored as-is)',
  })
  @Matches(/^\d{16}$/, { message: 'cardNumber must be exactly 16 digits' })
  cardNumber: string;

  @ApiProperty({ example: '12/30' })
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, {
    message: 'expDate must be in MM/YY format',
  })
  expDate: string;

  // Optional at the DTO level — Uzcard/Humo cards have no CVV printed on
  // them at all. CardsService enforces it as required only for Visa/
  // Mastercard, once the card type is known from the number.
  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @Matches(/^\d{3}$/, { message: 'cvv must be exactly 3 digits' })
  cvv?: string;
}
