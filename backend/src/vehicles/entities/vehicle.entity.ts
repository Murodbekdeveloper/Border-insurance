import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum WeightCategory {
  LIGHT = 'yengil',
  HEAVY = "og'ir",
}

export enum RegistrationCountry {
  UZ = 'UZ',
  FOREIGN = 'Xorij',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: WeightCategory })
  weightCategory: WeightCategory;

  @Column({ type: 'enum', enum: RegistrationCountry })
  registrationCountry: RegistrationCountry;

  @Column()
  plateNumber: string;

  @Column()
  techPassportSeries: string;

  @Column()
  techPassportNumber: string;

  @Column()
  model: string;

  @Column()
  vehicleType: string;

  @Column({ type: 'date' })
  techPassportIssueDate: string;

  @Column()
  manufactureYear: number;

  @Column()
  bodyNumber: string;

  @Column()
  engineNumber: string;

  // Only actually required for a foreign-registered vehicle — Asia
  // Insurance's Apex_Box contract sends it on as applicant.address
  // (see ApexBoxService). Their domestic osago_v3 API has no such field at
  // all, so an Uzbek-registered vehicle's city is nullable.
  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column()
  phone: string;

  // Asia Insurance's /save-policy contract needs a vehicle `owner`
  // (person or organization) separate from the `applicant` — usually the
  // same person as the logged-in user, hence the default. When false, the
  // three fields below hold the actual owner's own passport+birth date;
  // when true they stay null and the owner is derived from the user's own
  // profile fields (User.passportSeries/passportNumber/birthDate) instead.
  @Column({ default: true })
  ownerIsApplicant: boolean;

  @Column({ type: 'varchar', nullable: true })
  ownerPassportSeries: string | null;

  @Column({ type: 'varchar', nullable: true })
  ownerPassportNumber: string | null;

  @Column({ type: 'date', nullable: true })
  ownerBirthDate: string | null;
}
