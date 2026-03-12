import React from 'react';

type Status = 'Draft' | 'Running' | 'Completed' | 'Reviewed' | 'Published' | 'Archived' | 'Working' | 'OK' | 'Warn' | 'Error';

interface StatusBadgeProps {
  status: Status;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'medium' }) => {
  const getStatusStyles = (status: Status): string => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Running':
        return 'bg-blue-100 text-blue-700 border-blue-300 animate-pulse';
      case 'Completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Reviewed':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Published':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'Archived':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'Working':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'OK':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Warn':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'Error':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center ${sizeClasses} font-medium rounded border ${getStatusStyles(status)}`}>
      {status}
    </span>
  );
};
