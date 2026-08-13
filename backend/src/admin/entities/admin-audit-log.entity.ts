import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Denormalizes the acting admin's email/name onto each row (rather than
// only a foreign key) so the log stays readable even if that admin
// account is later deleted.
@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  adminId: string;

  @Column()
  adminEmail: string;

  @Column()
  action: string;

  @Column()
  targetType: string;

  @Column({ type: 'varchar', nullable: true })
  targetId: string | null;

  @Column({ type: 'varchar', nullable: true })
  details: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
