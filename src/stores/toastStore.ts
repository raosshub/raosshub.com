type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];
let nextId = 1;

function emit() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function showToast(message: string, type: ToastType = "info") {
  const toast: Toast = { id: nextId++, message, type };
  toasts = [...toasts, toast];
  emit();
  // Auto-dismiss
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    emit();
  }, 4000);
}

export function subscribeToasts(fn: (toasts: Toast[]) => void) {
  listeners.push(fn);
  fn([...toasts]);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
