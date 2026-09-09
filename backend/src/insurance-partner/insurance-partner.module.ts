import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerSubmission } from './entities/partner-submission.entity';
import { InsurancePartnerService } from './insurance-partner.service';
import { AsiaInsuranceClientService } from './asia-insurance-client.service';
import { ApexBoxClientService } from './apex-box-client.service';
import { PartnerTransactionsController } from './partner-transactions.controller';
import { InsurancePartnerController } from './insurance-partner.controller';
import { PaymentCallbackController } from './payment-callback.controller';
import { PartnerApiKeyGuard } from './guards/partner-api-key.guard';
import { PaymentCallbackApiKeyGuard } from './guards/payment-callback-api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerSubmission])],
  providers: [
    InsurancePartnerService,
    AsiaInsuranceClientService,
    ApexBoxClientService,
    PartnerApiKeyGuard,
    PaymentCallbackApiKeyGuard,
  ],
  controllers: [
    PartnerTransactionsController,
    InsurancePartnerController,
    PaymentCallbackController,
  ],
  exports: [
    InsurancePartnerService,
    AsiaInsuranceClientService,
    ApexBoxClientService,
  ],
})
export class InsurancePartnerModule {}
