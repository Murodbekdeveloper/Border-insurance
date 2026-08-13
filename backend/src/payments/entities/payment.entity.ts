import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InsurancePolicy } from '../../policies/entities/insurance-policy.entity';
import { Card } from '../../cards/entities/card.entity';

export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InsurancePolicy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'policyId' })
  policy: InsurancePolicy;

  @Column()
  policyId: string;

  @ManyToOne(() => Card, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cardId' })
  card: Card | null;

  @Column({ type: 'varchar', nullable: true })
  cardId: string | null;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus })
  status: PaymentStatus;

  @Column()
  transactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
