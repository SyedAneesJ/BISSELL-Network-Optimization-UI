import React from 'react';

interface ToastProps {
  message: string;
  kind?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

const kindClasses: Record<NonNullable<ToastProps['kind']>, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  error: 'border-red-300 bg-red-50 text-red-900',
  info: 'border-blue-300 bg-blue-50 text-blue-900',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  kind = 'info',
  onClose,
}) => {
  return (
    <div className={`w-full rounded-lg border px-3 py-2 text-sm shadow ${kindClasses[kind]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="leading-5">{message}</span>
        <button
          type="button"
          className="text-xs font-semibold opacity-80 hover:opacity-100"
          onClick={onClose}
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
    </div>
  );
};
