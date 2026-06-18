// components/ui/Toaster.tsx
"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

// Helper functions for easy use
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "success", title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "error", title, message }),
  warning: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "warning", title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().add({ type: "info", title, message }),
};

function ToastItem({ toast: t }: { toast: Toast }) {
  const { remove } = useToastStore();

  useEffect(() => {
    const timer = setTimeout(() => remove(t.id), 4500);
    return () => clearTimeout(timer);
  }, [t.id, remove]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-indigo-400 flex-shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/30",
    error: "border-red-500/30",
    warning: "border-amber-500/30",
    info: "border-indigo-500/30",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 bg-gray-900 border rounded-lg p-4 shadow-xl w-80",
        "animate-in slide-in-from-right-5 duration-300",
        borders[t.type]
      )}
    >
      {icons[t.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100">{t.title}</p>
        {t.message && <p className="text-xs text-gray-400 mt-0.5">{t.message}</p>}
      </div>
      <button
        onClick={() => remove(t.id)}
        className="text-gray-600 hover:text-gray-400 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
