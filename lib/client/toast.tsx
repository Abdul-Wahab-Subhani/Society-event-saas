"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "neutral";
}

interface ToastContextValue {
  push: (message: string, tone?: Toast["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: Toast["tone"] = "neutral") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter pointer-events-auto max-w-sm rounded-lg border px-4 py-2.5 text-sm shadow-sm ${
              t.tone === "success"
                ? "border-success/20 bg-success-bg text-success"
                : t.tone === "error"
                ? "border-danger/20 bg-danger-bg text-danger"
                : "border-line bg-surface text-ink"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
