import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

// Shape confirmed by Asia Insurance (2026-08-10): identical to
// GetPolicyResponse (see ../asia-insurance.types.ts) — they push the same
// body here once payment at payall_url completes, instead of us having to
// poll GET /get-policy ourselves.
export class PaymentCallbackDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  result: number;

  @ApiProperty({ example: 'Успешная обработка запроса.' })
  @IsString()
  result_message: string;

  @ApiProperty({ example: 649651 })
  @IsInt()
  contract_id: number;

  @ApiProperty({ example: 'XXXX/XXXX/X/XXXXXXXX' })
  @IsString()
  contract_num: string;

  @ApiProperty({ example: 'EAPL 1234567' })
  @IsString()
  policy_no: string;

  @ApiProperty({ example: 'ISSUED' })
  @IsString()
  policy_status: string;

  @ApiProperty({ example: 'https://ersp.e-osgo.uz/ru/site/export-to-pdf?id=...' })
  @IsString()
  policy_check: string;
}
