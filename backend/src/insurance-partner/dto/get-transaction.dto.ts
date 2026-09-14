import { IsUUID } from 'class-validator';

// Body shape for PartnerTransactionsController — confirmed by Asia
// Insurance/the regulator (2026-09-11) to be POST with transactionId in the
// JSON body, not GET with a path param as this was originally built.
export class GetTransactionDto {
  @IsUUID()
  transactionId: string;
}
