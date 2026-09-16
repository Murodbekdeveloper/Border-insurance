import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { InsurancePolicy } from '../../policies/entities/insurance-policy.entity';
import { Card } from '../../cards/entities/card.entity';

export enum ResidentType {
  RESIDENT = 'resident',
  NON_RESIDENT = 'non_resident',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  googleId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  appleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: ResidentType, nullable: true })
  residentType: ResidentType | null;

  // "Applicant" fields for Asia Insurance's /save-policy contract
  // (SavePolicyRequest.applicant needs birth_date/pass_seria/pass_number
  // unconditionally) — collected once on the profile instead of on every
  // policy purchase, since the applicant is the logged-in user themselves.
  // Nullable: existing accounts and anyone who hasn't filled this in yet.
  @Column({ type: 'varchar', nullable: true })
  passportSeries: string | null;

  @Column({ type: 'varchar', nullable: true })
  passportNumber: string | null;

  @Column({ type: 'date', nullable: true })
  birthDate: string | null;

  // Apex_Box's applicant.citizenshipId (from GET /countries) — only
  // meaningful for a non-resident applicant; required to submit a foreign
  // citizen's policy through Apex_Box. Stored as a string since Asia
  // Insurance's own reference ids are strings throughout that API.
  @Column({ type: 'varchar', nullable: true })
  citizenshipId: string | null;

  // Set to false by an admin to block the account — checked at login and
  // on every authenticated request (see JwtStrategy), so blocking takes
  // effect immediately rather than only on the next login.
  @Column({ default: true })
  isActive: boolean;

  // Defaults to true at the DB level so existing/admin-created/Google
  // accounts are unaffected — only new local (email+password) registrations
  // explicitly start out false until the emailed code is confirmed.
  @Column({ default: true })
  isEmailVerified: boolean;

  // True only for accounts created via "Mehmon sifatida kirish" (see
  // AuthService.guest) — a placeholder, non-deliverable email/no password,
  // full access otherwise. Lets admin screens/reporting tell these apart
  // from real registered users.
  @Column({ default: false })
  isGuest: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 6, nullable: true, select: false })
  emailVerificationCode: string | null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true, select: false })
  emailVerificationCodeExpiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Vehicle, (vehicle) => vehicle.user)
  vehicles: Vehicle[];

  @OneToMany(() => InsurancePolicy, (policy) => policy.user)
  policies: InsurancePolicy[];

  @OneToMany(() => Card, (card) => card.user)
  cards: Card[];
}
