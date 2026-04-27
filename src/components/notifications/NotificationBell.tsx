import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  count: number;
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ count, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      className="relative inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition flex-shrink-0"
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};
