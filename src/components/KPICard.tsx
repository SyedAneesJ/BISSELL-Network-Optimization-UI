import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  format?: 'currency' | 'percent' | 'number' | 'decimal';
  size?: 'small' | 'medium' | 'large';
  tooltip?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  delta,
  deltaLabel,
  format = 'number',
  size = 'medium',
  tooltip,
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'decimal':
        return val.toFixed(2);
      default:
        return val.toLocaleString('en-US');
    }
  };

  const sizeClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  const valueSizeClasses = {
    small: 'text-xl',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  return (
    <div className={`bg-white/80 rounded-xl border border-slate-200 shadow-sm ${sizeClasses[size]} hover:shadow-lg hover:-translate-y-0.5 transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-600">{label}</p>
            {tooltip && (
              <div className="group relative">
                <div className="cursor-help text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-slate-900 text-white text-xs rounded shadow-lg z-10">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          <p className={`${valueSizeClasses[size]} font-semibold text-slate-900 mt-1`}>
            {formatValue(value)}
          </p>
          {delta !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-sm font-medium ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {delta > 0 ? '+' : ''}{format === 'percent' ? delta.toFixed(1) : delta.toFixed(2)}
                {format === 'percent' ? 'pp' : ''}
              </span>
              {deltaLabel && <span className="text-xs text-slate-500">{deltaLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
