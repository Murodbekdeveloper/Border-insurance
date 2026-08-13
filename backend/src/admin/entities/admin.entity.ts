import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum AdminRole {
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

// Deliberately a separate table from `users` — admin/staff accounts are
// not customer accounts and must never share identity, auth, or tokens
// with the customer-facing system (see AdminAuthModule).
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  // Soft-disable switch — deleting an admin doesn't invalidate their
  // already-issued JWTs (see AdminJwtStrategy), so this flag is what
  // actually revokes access on the next authenticated request.
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
