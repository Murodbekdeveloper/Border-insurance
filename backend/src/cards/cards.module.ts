import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { PaymeModule } from '../payme/payme.module';

@Module({
  imports: [TypeOrmModule.forFeature([Card]), PaymeModule],
  providers: [CardsService],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
