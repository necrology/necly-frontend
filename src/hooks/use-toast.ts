"use client";

import { create } from "zustand";

type Toast = {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
};

type ToastState = {
  toasts: Toast[];
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
};

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (message, type = "success") =>
    set((state) => ({
      toasts: [...state.toasts, { id: Math.random().toString(36).slice(2), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function useToast() {
  const addToast = useToastStore((state) => state.addToast);
  return { toast: addToast };
}