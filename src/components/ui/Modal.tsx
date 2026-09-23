import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const effectiveSize = (size || maxWidth || 'lg') as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

  const maxWidthStyles: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  const chosenWidth = maxWidthStyles[effectiveSize] || 'max-w-lg';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${chosenWidth} max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] sm:max-h-[85vh] bg-white rounded-lg border border-slate-200 shadow-lg flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 my-auto`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h3 id="modal-title" className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors shrink-0 -mr-1"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
