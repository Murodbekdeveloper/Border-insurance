import { InsurancePolicy, Payment } from '@/types';

export const POLICY_STATUS_LABELS: Record<InsurancePolicy['status'], { label: string; className: string }> = {
  draft: { label: 'Qoralama', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  pending_payment: { label: "To'lov kutilmoqda", className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  awaiting_partner_payment: { label: "Sug'urta kompaniyasida to'lov kutilmoqda", className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  paid: { label: "To'langan", className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  cancelled: { label: 'Bekor qilingan', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
};

export const PAYMENT_STATUS_LABELS: Record<Payment['status'], { label: string; className: string }> = {
  success: { label: 'Muvaffaqiyatli', className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' },
  failed: { label: 'Rad etilgan', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  pending: { label: 'Kutilmoqda', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
};
