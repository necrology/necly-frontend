"use client";

import { create } from "zustand";

// Durasi default untuk auto-hide toast keranjang (5 detik).
const DEFAULT_CART_TOAST_DURATION = 5000;

type Toast = {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  /** Durasi auto-hide dalam ms. Jika tidak diset, toast tidak auto-hide. */
  duration?: number;
  /** Apakah menampilkan tombol close. Default true untuk kompatibilitas. */
  showClose?: boolean;
};

type ToastState = {
  toasts: Toast[];
  addToast: (message: string, type?: "success" | "error" | "info", options?: { duration?: number; showClose?: boolean }) => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  addToast: (message, type = "success", options = {}) => {
    const id = Math.random().toString(36).slice(2);
    const { duration, showClose = true } = options;
    const toast: Toast = { id, message, type, duration, showClose };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    // Auto-remove setelah duration jika diset
    if (duration && duration > 0) {
      setTimeout(() => {
        const current = get();
        if (current.toasts.some((t) => t.id === id)) {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  return { toast: addToast };
}