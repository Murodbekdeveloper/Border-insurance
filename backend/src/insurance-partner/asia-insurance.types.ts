// Shapes for Asia Insurance's OSAGO issuance API —
// swagger.asia-insurance.uz/ui/osago3. Field names/casing (including the
// "comission" spelling) mirror their Swagger schema exactly, not our
// naming conventions — this is their contract, not ours.

export interface AsiaInsurancePerson {
  birth_date: string;
  pass_seria: string;
  pass_number: string;
}

export interface AsiaInsuranceOrganization {
  inn: string;
}

// Both branches are optional in their schema (nullable: true on each) —
// callers send whichever one applies to the actual owner.
export interface AsiaInsuranceOwner {
  person?: AsiaInsurancePerson;
  organization?: AsiaInsuranceOrganization;
}

export interface CalcDriver {
  birth_date: string;
  pass_seria: string;
  pass_number: string;
}

export interface CalcRequest {
  gos_number: string;
  tech_sery: string;
  tech_number: string;
  period_id: number;
  // true = limited number of drivers, false = unlimited. When false,
  // `drivers` must be an empty array per their documented rule.
  limited: boolean;
  owner: AsiaInsuranceOwner;
  drivers: CalcDriver[];
}

export interface CalcResponse {
  result: boolean;
  message: string;
  response: { amount_uzs: number };
}

export interface SavePolicyDriver {
  pass_seria: string;
  pass_number: string;
  birth_date: string;
  // Degree of kinship to the vehicle owner, from GetRelativeResponse
  // (e.g. 1 = ОТЕЦ/father) — not something this app collects yet.
  relative: number;
}

export interface SavePolicyRequest {
  details: {
    // WE pick this (any unique int) — round-trips through GetPolicyRequest
    // later. Not the same as the uuid `transaction_uuid` NAPP cares about,
    // which only shows up in this call's *response*.
    transaction_id: number;
    start_date: string;
    period_id: number;
    limited: boolean;
    // Format per their spec: 998XXXXXXXXX (no "+", no leading zero after 998).
    phone_number: string;
    amount_uzs: number;
  };
  techPassport: {
    govNumber: string;
    tech_sery: string;
    tech_number: string;
  };
  drivers: SavePolicyDriver[];
  owner: AsiaInsuranceOwner;
  applicant: AsiaInsurancePerson;
}

export interface SavePolicyResponse {
  result: boolean;
  message: string;
  response: {
    amount_uzs: number;
    comission: number;
    order_id: number;
    transaction_id: number;
    polis_uuid: string;
    // "ID транзакции для НАПП" — this is the value
    // InsurancePartnerService.recordPartnerResult() stores as
    // PartnerSubmission.transactionId.
    transaction_uuid: string;
    payall_url: string;
  };
}

export interface GetPolicyRequest {
  order_id: number;
  transaction_id: number;
}

export interface GetPolicyResponse {
  // 0 on success per their example — NOT a boolean despite CalcResponse/
  // SavePolicyResponse using `result: boolean`. Inconsistent across their
  // own endpoints, not a mistake here.
  result: number;
  result_message: string;
  contract_id: number;
  contract_num: string;
  policy_no: string;
  // Observed example: "ISSUED" — likely also "TERMINATED"/"CANCELLED"
  // per the regulator letter's reconciliation flow, exact enum unconfirmed.
  policy_status: string;
  policy_check: string;
}

export interface PeriodItem {
  period: number;
  name: string;
}

export interface GetPeriodResponse {
  items: PeriodItem[];
}

export interface RelativeItem {
  relative: number;
  name: string;
}

export interface GetRelativeResponse {
  items: RelativeItem[];
}

// Vehicle-by-plate-number lookup — field names follow the same convention
// as CalcRequest/SavePolicyRequest above (gos_number/tech_sery/tech_number),
// but unlike those, this shape is NOT confirmed against Asia Insurance's
// published swagger (osago3.yaml only documents get-calc-osago, save-policy,
// get-policy, get-period, get-relative). Verify the actual path and
// response field names with Asia Insurance before relying on this in
// production — adjust both this type and the `/get-vehicle` path in
// AsiaInsuranceClientService.lookupVehicle() once confirmed.
export interface VehicleLookupRequest {
  gos_number: string;
  tech_sery: string;
  tech_number: string;
}

export interface VehicleLookupResponse {
  result: boolean;
  message: string;
  response: {
    model: string;
    manufacture_year: number;
    body_number: string;
    engine_number: string;
  };
}
