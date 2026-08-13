// Shapes for Payme's Cards (Subscribe) API — https://developer.help.paycom.uz/
// Only the fields this app actually reads are declared.

export interface PaymeJsonRpcRequest<P> {
  id: number;
  method: string;
  params: P;
}

export interface PaymeJsonRpcErrorBody {
  code: number;
  message: string | Record<string, string>;
}

export interface PaymeJsonRpcResponse<R> {
  result?: R;
  error?: PaymeJsonRpcErrorBody;
}

export interface PaymeCard {
  token: string;
  number: string;
  expire: string;
  recurrent: boolean;
  verify: boolean;
}

export interface CardsCreateParams {
  card: { number: string; expire: string };
  save: boolean;
}
export interface CardsCreateResult {
  card: PaymeCard;
}

export interface CardsGetVerifyCodeParams {
  token: string;
}
export type CardsGetVerifyCodeResult = Record<string, never>;

export interface CardsVerifyParams {
  token: string;
  code: string;
}
export interface CardsVerifyResult {
  card: PaymeCard;
}

export interface ReceiptsCreateParams {
  amount: number;
  account: Record<string, string>;
}
export interface PaymeReceipt {
  _id: string;
  state: number;
}
export interface ReceiptsCreateResult {
  receipt: PaymeReceipt;
}

export interface ReceiptsPayParams {
  id: string;
  token: string;
}
export interface ReceiptsPayResult {
  receipt: PaymeReceipt;
}

// https://developer.help.paycom.uz/error-codes — receipt state 4 == paid.
export const PAYME_RECEIPT_STATE_PAID = 4;
