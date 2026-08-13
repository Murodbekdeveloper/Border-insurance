import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  message: string;
}
