import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  footer,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    small: 'max-w-full sm:max-w-md',
    medium: 'max-w-full sm:max-w-2xl',
    large: 'max-w-full lg:max-w-4xl',
    xlarge: 'max-w-full xl:max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-4">
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" onClick={onClose} />

        <div className={`relative min-w-0 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden flex flex-col border border-white/40 fade-in`}>
          <div className="flex min-w-0 items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-200">
            <h2 className="min-w-0 break-words text-xl font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {children}
          </div>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-3 p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
