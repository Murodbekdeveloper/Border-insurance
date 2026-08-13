import { Module } from '@nestjs/common';
import { PaymeClientService } from './payme-client.service';

@Module({
  providers: [PaymeClientService],
  exports: [PaymeClientService],
})
export class PaymeModule {}
