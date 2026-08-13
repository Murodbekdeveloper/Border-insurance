import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (type, message) =>
    set((state) => ({ toasts: [...state.toasts, { id: crypto.randomUUID(), type, message }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string) => useToastStore.getState().push('info', message),
};

export { useToastStore };
