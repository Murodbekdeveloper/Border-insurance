import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyCardDto {
  @ApiProperty({ example: '666666' })
  @IsString()
  @Length(4, 6)
  code: string;
}
