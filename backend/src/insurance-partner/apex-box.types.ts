// Shapes for Asia Insurance's "Apex_Box" OSAGO API — the universal issuer
// (both Uzbek and foreign citizens/vehicles), confirmed by Asia Insurance to
// live at https://online.asia-insurance.uz/apex/ins/apex_box/ (NOT
// rest.aic.uz, an earlier/incorrect copy of this same spec — and NOT the
// bare .../apex/ins/ path either, missing the /apex_box segment, which is
// what their own first-shared documentation had and what caused every
// endpoint to 404 until Asia Insurance corrected it on 2026-09-09). Field
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
// CONFIRMED 2026-10-14: a genuinely foreign-registered vehicle (e.g. a
// Kyrgyzstan plate) failed /osago_calculation with "Apex_Box: Ошибка в
// получении типа TC" — Asia Insurance was deriving the vehicle type from
// `govNumber` against their own (Uzbek) registry, which has no entry for a
// foreign plate. Asia Insurance has since added `vehicle.typeId` to
// /osago_calculation's own spec/Postman collection (it already existed on
// /osago, see VEHICLE_TYPE_ID_MAP) specifically so callers can supply it
// directly instead of relying on that lookup — see
// ApexBoxService.buildCalculatePremiumRequest.

// CONFIRMED 2026-09-15 against Asia Insurance's own Swagger UI: this field
// is typed `integer`, not the string we were sending ("2" instead of 2) —
// that mismatch was silently swallowed by their validation layer and
// surfaced instead as an unrelated, misleading period/date error (see the
// NOT YET RESOLVED comment history in ApexBoxService — resolved now that
// this is a number).
export enum ApexBoxResidentOfUzb {
  CITIZEN = 1,
  FOREIGNER = 2,
  STATELESS = 3,
  MILITARY = 4,
  FOREIGN_RESIDENT = 5,
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
  // CONFIRMED 2026-09-15: required here too, not just on applicant — a
  // request without it on the owner was rejected the same way as sending
  // it as a string (see the enum's own comment).
  residentOfUzb: ApexBoxResidentOfUzb;
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
  // CONFIRMED 2026-09-10 against the live /osago endpoint: despite the
  // published spec showing these four money fields as `number`, the live
  // API rejects them with 422 ("must be a string") unless sent as
  // stringified numbers ("100000", not 100000).
  insurancePremium: string;
  sumInsured: string;
  // From /osago_references_contractTermConclusionId. id "3" = "На срок
  // временного использования ТС, зарегистрированного в иностранных
  // государствах" — the foreign-vehicle contract term.
  contractTermConclusionId: string;
  // From /osago_use_territory. id "3" = "Для иностранцев".
  useTerritoryId: string;
  commission: string;
  insurancePremiumPaidToInsurer: string;
  // From /osago_references_seasonal_insurances. CONFIRMED 2026-09-10:
  // must be omitted/empty when contractTermConclusionId === '3' (foreign
  // vehicle) — the API rejects a non-empty value with error_code 8
  // ("для полиса на иностранное ТС поле seasonalInsuranceId должно быть
  // пустым"). Only set this for the non-foreign contract terms.
  seasonalInsuranceId: string;
  // CONFIRMED 2026-09-10: NOT a foreign-vehicle yes/no flag despite the
  // name — this is the foreign-vehicle POLICY DURATION selector, sourced
  // from /osago_references_foreign_vehicles_policy_duration (e.g. "1" =
  // "до 15 дней"). Only meaningful (and presumably only accepted) when
  // contractTermConclusionId === '3'; still doesn't bypass
  // vehicle.govNumber/techPassport being required fields (Asia Insurance
  // confirmed those just aren't validated against the registry for a
  // non-resident applicant — residents' vehicle data still is).
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
  // CONFIRMED 2026-09-17: added alongside click_link/payme_link — Apex_Box
  // now also returns a single "universal" link (osago_v3's payall_url
  // equivalent), plus the premium/commission it previously only exposed
  // via a separate /osago_calculation call.
  transaction_uuid: string;
  commission: number;
  premium: number;
  payall_url: string;
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
    typeId: string;
  };
  drivers: { passportData: ApexBoxPassportData }[];
}

export interface CalculatePremiumResponse {
  result: number;
  result_message: string;
  // CONFIRMED 2026-09-15: both of these come back as locale-formatted
  // strings like "224 000,00 UZS" (thousands-space, comma decimal,
  // currency suffix) — NOT a plain number despite looking numeric at a
  // glance. Must be parsed before use; see parseApexBoxAmount().
  insurance_premium: string;
  // Required for CreatePolicyRequest.cost.sumInsured — sending a fixed
  // default there (e.g. always 40000000) was rejected (result: 17,
  // "Ошибка в страховой сумме") for a vehicle whose calculated sum
  // differs (e.g. a heavy truck's 80,000,000).
  insurance_sum: string;
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
