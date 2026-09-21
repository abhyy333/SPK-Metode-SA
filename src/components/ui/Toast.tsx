import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastMessage = { id, type, title, message, duration };
      setToasts(prev => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastPortal = mounted && typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-3 right-3 sm:left-auto sm:right-6 sm:top-6 z-[9999] flex flex-col gap-2.5 max-w-none sm:max-w-md w-auto sm:w-full pointer-events-none no-print"
      role="region"
      aria-live="polite"
      aria-label="Notifikasi sistem"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          id={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-xl transition-all duration-200 bg-white/98 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 ${
            toast.type === 'success'
              ? 'border-emerald-200 text-slate-800 ring-1 ring-emerald-500/10'
              : toast.type === 'error'
              ? 'border-rose-200 text-slate-800 ring-1 ring-rose-500/10'
              : toast.type === 'warning'
              ? 'border-amber-200 text-slate-800 ring-1 ring-amber-500/10'
              : 'border-blue-200 text-slate-800 ring-1 ring-blue-500/10'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-600" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug whitespace-normal break-words">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed whitespace-normal break-words [overflow-wrap:anywhere]">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 -mr-1"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {toastPortal}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
