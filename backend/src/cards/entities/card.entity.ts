import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../../users/entities/user.entity';

export enum CardType {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  UZCARD = 'uzcard',
  HUMO = 'humo',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: CardType })
  cardType: CardType;

  @Column({ length: 4 })
  maskedNumber: string;

  @Column()
  cardHolderName: string;

  @Column()
  expDate: string;

  // Opaque token returned by the Payme Cards API (cards.create) once the
  // real gateway is active. Never populated in mock mode. This — not the
  // PAN — is what gets charged, so the raw card number never needs to be
  // stored after this row is created. Excluded from API responses — it's a
  // live charge credential, the client only needs to know verification state.
  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  paymeToken: string | null;

  @Column({ default: false })
  paymeVerified: boolean;

  // Mirrors the exact check PaymentsService.pay() uses to block charging an
  // unverified Payme-tokenized card — lets the client know to run the SMS
  // verification step before offering this card for payment.
  @Expose()
  get requiresCardVerification(): boolean {
    return !!this.paymeToken && !this.paymeVerified;
  }

  @CreateDateColumn()
  createdAt: Date;
}
