import { useEffect, useState } from "react";
import { subscribeToasts, removeToast, type ToastType } from "@/stores/toastStore";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const COLORS: Record<ToastType, string> = {
  success: "var(--accent, #3fb950)",
  error: "var(--red, #f85149)",
  info: "var(--blue, #58a6ff)",
};

const BG_COLORS: Record<ToastType, string> = {
  success: "rgba(63,185,80,0.1)",
  error: "rgba(248,81,73,0.1)",
  info: "rgba(88,166,255,0.1)",
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);

  useEffect(() => {
    return subscribeToasts(setToasts);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-xs animate-in slide-in-from-right"
            style={{
              background: BG_COLORS[toast.type],
              border: `1px solid ${COLORS[toast.type]}30`,
              color: COLORS[toast.type],
              backdropFilter: "blur(8px)",
            }}
          >
            <Icon size={14} />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 rounded hover:opacity-70"
              style={{ color: COLORS[toast.type] }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
