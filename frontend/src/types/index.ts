export type ResidentType = 'resident' | 'non_resident';

export type WeightCategory = 'og\'ir' | 'yengil';

export type RegistrationCountry = 'UZ' | 'Xorij';

export type DriverRestriction = 'cheklangan' | 'cheklanmagan';

export type PolicyStatus =
  | 'draft'
  | 'pending_payment'
  | 'awaiting_partner_payment'
  | 'paid'
  | 'cancelled';

export type CardType = 'visa' | 'mastercard' | 'uzcard' | 'humo';

export type PaymentStatus = 'success' | 'failed' | 'pending';

export interface User {
  id: string;
  fullName: string;
  email: string;
  pendingEmail?: string | null;
  phone?: string;
  residentType?: ResidentType;
  passportSeries?: string | null;
  passportNumber?: string | null;
  birthDate?: string | null;
  citizenshipId?: string | null;
  googleId?: string | null;
  hasPassword?: boolean;
  isActive?: boolean;
  isGuest?: boolean;
  createdAt: string;
}

export type AdminRole = 'admin' | 'superadmin';

export interface Admin {
  id: string;
  fullName: string;
  email: string;
  role: AdminRole;
  createdAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
}

export interface AdminLoginAttempt {
  id: string;
  email: string;
  ipAddress: string | null;
  success: boolean;
  createdAt: string;
}

export interface PolicyVerification {
  policyNumber: string;
  valid: boolean;
  status: PolicyStatus;
  validFrom: string | null;
  validTo: string | null;
  plateNumber: string | null;
}

export interface Vehicle {
  id: string;
  userId: string;
  weightCategory: WeightCategory;
  registrationCountry: RegistrationCountry;
  plateNumber: string;
  techPassportSeries: string;
  techPassportNumber: string;
  model: string;
  vehicleType: string;
  techPassportIssueDate: string;
  manufactureYear: number;
  bodyNumber: string;
  engineNumber: string;
  city: string;
  phone: string;
  ownerIsApplicant: boolean;
  ownerPassportSeries?: string | null;
  ownerPassportNumber?: string | null;
  ownerBirthDate?: string | null;
}

export interface Driver {
  id: string;
  fullName: string;
  birthDate: string;
  passportSeries: string;
  passportNumber: string;
  licenseNumber: string;
  licenseIssueDate: string;
  drivingExperienceSince: number | null;
  relativeId?: number | null;
}

export interface InsurancePolicy {
  id: string;
  userId: string;
  vehicleId: string;
  vehicle: Vehicle;
  driverRestriction: DriverRestriction;
  drivers: Driver[];
  price: number;
  status: PolicyStatus;
  policyNumber: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
}

export interface Card {
  id: string;
  userId: string;
  cardType: CardType;
  maskedNumber: string;
  cardHolderName: string;
  expDate: string;
  paymeVerified: boolean;
  // True only when the card is Payme-tokenized and not yet SMS-verified —
  // it can't be charged until requestCardVerification/confirmCardVerification
  // (POST /cards/:id/payme/verify-request, /payme/verify) succeed.
  requiresCardVerification: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  policyId: string;
  cardId: string;
  amount: number;
  status: PaymentStatus;
  transactionId: string;
  createdAt: string;
  // Only present on admin endpoints (GET /admin/payments), which join
  // these relations for display.
  policy?: InsurancePolicy;
  card?: Card | null;
}
