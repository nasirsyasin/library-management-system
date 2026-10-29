import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface ToastContextValue {
  notify: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return (
    <ToastContext.Provider value={{ notify: setMessage }}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 max-w-sm">
        {message ? <p role="status" className="rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">{message}</p> : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}