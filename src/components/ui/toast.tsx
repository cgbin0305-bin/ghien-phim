"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight toast system. Toasts are announced to screen readers through
 * an `aria-live` region and never rely on colour alone.
 */
type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = React.createContext<{
  toast: (message: string, tone?: ToastTone) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((message: string, tone: ToastTone = "info") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2.5"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon =
            t.tone === "success"
              ? CheckCircle2
              : t.tone === "error"
                ? AlertTriangle
                : Info;
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-lift backdrop-blur-md animate-fade-rise",
                t.tone === "success" &&
                  "border-jade-500/60 bg-ink-900/95 text-jade-100 shadow-[0_8px_28px_-6px_rgba(67,161,134,0.35)]",
                t.tone === "error" &&
                  "border-rouge-500/60 bg-ink-900/95 text-rouge-200 shadow-[0_8px_28px_-6px_rgba(200,62,55,0.35)]",
                t.tone === "info" &&
                  "border-gold-500/50 bg-ink-900/95 text-parchment-100 shadow-glow",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  t.tone === "success" && "text-jade-300",
                  t.tone === "error" && "text-rouge-400",
                  t.tone === "info" && "text-gold-300",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 font-medium leading-snug">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Đóng thông báo"
                className="shrink-0 rounded p-0.5 text-mist-400 transition-colors hover:bg-ink-800 hover:text-parchment-100"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
