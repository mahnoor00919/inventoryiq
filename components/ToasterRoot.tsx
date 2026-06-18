"use client";
// components/ToasterRoot.tsx
// Wraps the full toast system. Isolated here so layout.tsx (a Server Component)
// can import it without pulling in any browser-only code at the server level.
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

// ── Tiny inline store (no external deps beyond React) ─────────────────────────
type ToastType = "success" | "error" | "warning" | "info";
interface Toast { id: string; type: ToastType; title: string; message?: string }
type Listener = (toasts: Toast[]) => void;

let _toasts: Toast[] = [];
const _listeners = new Set<Listener>();
const notify = () => _listeners.forEach((l) => l([..._toasts]));

export const toast = {
  success: (title: string, message?: string) => _add("success", title, message),
  error:   (title: string, message?: string) => _add("error",   title, message),
  warning: (title: string, message?: string) => _add("warning", title, message),
  info:    (title: string, message?: string) => _add("info",    title, message),
};

function _add(type: ToastType, title: string, message?: string) {
  const id = Math.random().toString(36).slice(2);
  _toasts = [..._toasts, { id, type, title, message }];
  notify();
  setTimeout(() => _remove(id), 4500);
}

function _remove(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id);
  notify();
}

// ── Component ─────────────────────────────────────────────────────────────────
function Item({ t }: { t: Toast }) {
  const icons = {
    success: <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />,
    error:   <XCircle    className="h-4 w-4 text-red-400    flex-shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 text-amber-400  flex-shrink-0" />,
    info:    <Info       className="h-4 w-4 text-indigo-400 flex-shrink-0" />,
  };
  const borders = {
    success: "border-emerald-500/30",
    error:   "border-red-500/30",
    warning: "border-amber-500/30",
    info:    "border-indigo-500/30",
  };
  return (
    <div className={`flex items-start gap-3 bg-gray-900 border ${borders[t.type]} rounded-lg p-4 shadow-2xl w-80`}>
      {icons[t.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-100">{t.title}</p>
        {t.message && <p className="text-xs text-gray-400 mt-0.5">{t.message}</p>}
      </div>
      <button onClick={() => _remove(t.id)} className="text-gray-600 hover:text-gray-300 transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToasterRoot() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    _listeners.add(setToasts);
    return () => { _listeners.delete(setToasts); };
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto"><Item t={t} /></div>
      ))}
    </div>
  );
}
