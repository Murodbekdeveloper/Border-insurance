import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Records every admin login attempt, successful or not, so a suspicious
// pattern (repeated failures against one email, or from one IP) is visible
// without needing server log access.
@Entity('admin_login_attempts')
export class AdminLoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column()
  success: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
