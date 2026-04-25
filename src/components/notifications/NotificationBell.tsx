import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui';

interface NotificationBellProps {
  count: number;
  onClick: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ count, onClick }) => {
  return (
    <Button
      type="button"
      variant="secondary"
      size="small"
      onClick={onClick}
      className="relative"
      icon={<Bell className="w-4 h-4" />}
    >
      Notifications
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
};
