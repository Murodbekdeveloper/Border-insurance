// Shapes for Asia Insurance's "Apex_Box" OSAGO API — the universal issuer
// (both Uzbek and foreign citizens/vehicles), confirmed by Asia Insurance
// (2026-09-05) to live at https://online.asia-insurance.uz/apex/ins/ (NOT
// rest.aic.uz, an earlier/incorrect copy of this same spec). Field
// names/casing mirror their published spec exactly
// (swagger.asia-insurance.uz/swagger-files/old_osago.yaml) — this is their
// contract, not ours.
//
// Confirmed by Asia Insurance: unlike osago_v3 (ais.asia-insurance.uz,
// Uzbek citizens/vehicles only — that API looks up most data itself from
// government providers), Apex_Box requires EVERY field to be supplied by
// us; nothing is auto-filled. Per the spec description on
// passportData.pinfl: "Для иностранца residentOfUzb=2 ПИНФЛ должен быть
// пустым" — PINFL must be an EMPTY STRING for a foreign citizen, not
// omitted and not a placeholder like all-zeros.
//
// NOT YET CONFIRMED: whether `vehicle.govNumber`/`techPassport` can be
// anything other than a real Uzbek plate/tech-passport for a genuinely
// foreign-registered vehicle — the spec marks these required with no
// documented exception (unlike pinfl's explicit foreign-citizen carve-out).
// Until Asia Insurance confirms otherwise, treat foreign-*registered*
// vehicles (not just foreign citizens) as still unsupported — see
// RegistrationCountry.FOREIGN handling in InsurancePartnerService.

export enum ApexBoxResidentOfUzb {
  CITIZEN = '1',
  FOREIGNER = '2',
  STATELESS = '3',
  MILITARY = '4',
  FOREIGN_RESIDENT = '5',
}

export interface ApexBoxPassportData {
  // Empty string ("") when the person's residentOfUzb is FOREIGNER (2) —
  // see module-level comment. Always present as a key either way; their
  // schema marks it required, just conditionally blank.
  pinfl: string;
  seria: string;
  number: string;
  issuedBy?: string;
  issueDate?: string;
}

export interface ApexBoxFullName {
  firstname: string;
  lastname: string;
  middlename: string;
}

export interface ApexBoxPerson {
  passportData: ApexBoxPassportData;
  fullName: ApexBoxFullName;
  phoneNumber: string;
  gender: 'm' | 'f';
  birthDate: string;
  regionId: string;
  districtId: string;
}

export interface ApexBoxOrganization {
  inn: string;
  name: string;
  regCertificate: string;
  regCertificateIssueDate: string;
  bankMfo: string;
  checkingAccount: string;
  phoneNumber: string;
}

export interface ApexBoxApplicant {
  person?: ApexBoxPerson;
  organization?: ApexBoxOrganization;
  address: string;
  residentOfUzb: ApexBoxResidentOfUzb;
  // Required unless residentOfUzb === STATELESS — from /countries.
  citizenshipId?: string;
}

export interface ApexBoxOwnerPerson {
  passportData: ApexBoxPassportData;
  fullName: ApexBoxFullName;
}

export interface ApexBoxOwnerOrganization {
  inn: string;
  name: string;
}

export interface ApexBoxOwner {
  person?: ApexBoxOwnerPerson;
  organization?: ApexBoxOwnerOrganization;
  applicantIsOwner: boolean;
}

export interface ApexBoxDriver {
  passportData: ApexBoxPassportData;
  fullName: ApexBoxFullName;
  licenseNumber: string;
  licenseSeria: string;
  licenseIssueDate: string;
  birthDate: string;
  // Degree of kinship to the owner — from /osago_relative (sp_id).
  relative: string;
  residentOfUzb: ApexBoxResidentOfUzb;
}

export interface ApexBoxVehicle {
  techPassport: {
    number: string;
    seria: string;
    issueDate: string;
  };
  modelCustomName: string;
  engineNumber: string;
  // From /osago_references_vehicle_type.
  typeId: string;
  issueYear: string;
  govNumber: string;
  bodyNumber: string;
  // From /regionId.
  regionId: string;
}

export interface ApexBoxCost {
  discountId: string;
  discountSum?: number;
  insurancePremium: number;
  sumInsured: number;
  // From /osago_references_contractTermConclusionId.
  contractTermConclusionId: string;
  // From /osago_use_territory.
  useTerritoryId: string;
  commission: number;
  insurancePremiumPaidToInsurer: number;
  // From /osago_references_seasonal_insurances.
  seasonalInsuranceId: string;
  // From /osago_references_foreign_vehicles_policy_duration — despite the
  // name, no confirmed reference values yet; a pricing/category flag, not
  // a bypass for vehicle.govNumber/techPassport being required.
  foreignVehicleId: string;
}

export interface CreatePolicyRequest {
  applicant: ApexBoxApplicant;
  owner: ApexBoxOwner;
  details: {
    issueDate: string;
    startDate: string;
    endDate: string;
    driverNumberRestriction: boolean;
    transactionId: string;
  };
  cost: ApexBoxCost;
  vehicle: ApexBoxVehicle;
  drivers: ApexBoxDriver[];
}

export interface CreatePolicyResponse {
  result: number;
  result_message: string;
  contract_id: number;
  uuid: string;
  click_link: string;
  payme_link: string;
}

export interface CalculatePremiumRequest {
  owner: { person: { passportData: ApexBoxPassportData } };
  details: { driverNumberRestriction: boolean };
  cost: Pick<
    ApexBoxCost,
    | 'contractTermConclusionId'
    | 'useTerritoryId'
    | 'seasonalInsuranceId'
    | 'foreignVehicleId'
  >;
  vehicle: {
    techPassport: { number: string; seria: string };
    govNumber: string;
  };
  drivers: { passportData: ApexBoxPassportData }[];
}

export interface CalculatePremiumResponse {
  result: number;
  result_message: string;
  insurance_premium: string;
  insuranceRate: number;
}

export interface GetIssuedPolicyRequest {
  contract_id: number;
}

export interface GetIssuedPolicyResponse {
  result: number;
  result_message: string;
  contract_id: number;
  policy_no: string;
  policy_check: string;
}

export interface ApexBoxReferenceItem {
  id: number | string;
  name: string;
}
