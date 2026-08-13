import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PAYMENT_GATEWAY } from './gateway/payment-gateway.interface';
import type { PaymentGateway } from './gateway/payment-gateway.interface';
import { MockPaymentGatewayService } from './gateway/mock-payment-gateway.service';
import { PaymePaymentGatewayService } from './gateway/payme-payment-gateway.service';
import { CardsModule } from '../cards/cards.module';
import { PoliciesModule } from '../policies/policies.module';
import { PaymeModule } from '../payme/payme.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    CardsModule,
    PoliciesModule,
    PaymeModule,
  ],
  providers: [
    PaymentsService,
    MockPaymentGatewayService,
    PaymePaymentGatewayService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [
        ConfigService,
        MockPaymentGatewayService,
        PaymePaymentGatewayService,
      ],
      useFactory: (
        configService: ConfigService,
        mockGateway: MockPaymentGatewayService,
        paymeGateway: PaymePaymentGatewayService,
      ): PaymentGateway =>
        configService.get<string>('payments.provider') === 'payme'
          ? paymeGateway
          : mockGateway,
    },
  ],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
