import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnerSubmission } from './entities/partner-submission.entity';
import { ApexBoxSubmission } from './entities/apex-box-submission.entity';
import { InsurancePartnerService } from './insurance-partner.service';
import { AsiaInsuranceClientService } from './asia-insurance-client.service';
import { ApexBoxClientService } from './apex-box-client.service';
import { ApexBoxService } from './apex-box.service';
import { PartnerTransactionsController } from './partner-transactions.controller';
import { InsurancePartnerController } from './insurance-partner.controller';
import { ApexBoxController } from './apex-box.controller';
import { PaymentCallbackController } from './payment-callback.controller';
import { PartnerApiKeyGuard } from './guards/partner-api-key.guard';
import { PaymentCallbackApiKeyGuard } from './guards/payment-callback-api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([PartnerSubmission, ApexBoxSubmission])],
  providers: [
    InsurancePartnerService,
    AsiaInsuranceClientService,
    ApexBoxClientService,
    ApexBoxService,
    PartnerApiKeyGuard,
    PaymentCallbackApiKeyGuard,
  ],
  controllers: [
    PartnerTransactionsController,
    InsurancePartnerController,
    ApexBoxController,
    PaymentCallbackController,
  ],
  exports: [
    InsurancePartnerService,
    AsiaInsuranceClientService,
    ApexBoxClientService,
    ApexBoxService,
  ],
})
export class InsurancePartnerModule {}
