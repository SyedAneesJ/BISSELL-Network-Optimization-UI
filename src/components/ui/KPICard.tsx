import React, { useEffect, useState } from 'react';

export const useAnimatedValue = (targetValue: number | string, duration = 800) => {
  const [currentValue, setCurrentValue] = useState<number | string>(() => {
    if (typeof targetValue === 'number') return 0;
    const cleanStr = String(targetValue).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleanStr);
    if (!isNaN(num)) return 0;
    return targetValue;
  });

  useEffect(() => {
    if (typeof targetValue === 'number') {
      let startTimestamp: number | null = null;
      const startValue = 0;
      const endValue = targetValue;
      if (endValue === 0) {
        setCurrentValue(0);
        return;
      }
      let animationFrameId: number;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easedProgress = progress * (2 - progress); // easeOutQuad
        const current = startValue + easedProgress * (endValue - startValue);
        setCurrentValue(current);
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setCurrentValue(endValue);
        }
      };
      animationFrameId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animationFrameId);
    } else {
      const prefix = String(targetValue).match(/^[^\d.-]*/)?.[0] || '';
      const suffix = String(targetValue).match(/[^\d%]*$/)?.[0] || '';
      const cleanStr = String(targetValue).replace(/[^\d.-]/g, '');
      const endValue = parseFloat(cleanStr);
      if (isNaN(endValue)) {
        setCurrentValue(targetValue);
        return;
      }
      if (endValue === 0) {
        setCurrentValue(targetValue);
        return;
      }
      const decPlaces = cleanStr.includes('.') ? cleanStr.split('.')[1].length : 0;

      let startTimestamp: number | null = null;
      const startValue = 0;
      let animationFrameId: number;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easedProgress = progress * (2 - progress);
        const current = startValue + easedProgress * (endValue - startValue);
        
        const formattedNum = current.toLocaleString('en-US', {
          minimumFractionDigits: decPlaces,
          maximumFractionDigits: decPlaces,
        });
        setCurrentValue(`${prefix}${formattedNum}${suffix}`);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(step);
        } else {
          setCurrentValue(targetValue);
        }
      };
      animationFrameId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [targetValue, duration]);

  return currentValue;
};

interface KPICardProps {
  label: string;
  value: string | number | React.ReactNode;
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
  const isAnimatable = typeof value === 'string' || typeof value === 'number';
  const animatedValue = isAnimatable ? useAnimatedValue(value as string | number) : value;

  const formatValue = (val: any): any => {
    if (React.isValidElement(val)) return val;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') {
      switch (format) {
        case 'currency':
          return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        case 'percent':
          return `${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
        case 'decimal':
          return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        default:
          return val.toLocaleString('en-US');
      }
    }
    return val;
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
    <div className={`surface-card hover-lift ${sizeClasses[size]} min-w-0`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 break-words">{label}</p>
            {tooltip && (
              <div className="group relative">
                <div className="cursor-help text-slate-400 hover:text-slate-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-slate-900 text-white text-xs rounded shadow-lg z-10 whitespace-pre-line">
                  {tooltip}
                </div>
              </div>
            )}
          </div>
          <p className={`${valueSizeClasses[size]} font-semibold text-slate-900 mt-2 leading-tight break-words`}>
            {formatValue(animatedValue)}
          </p>
          {delta !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <span className={`text-sm font-medium ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {delta > 0 ? '+' : ''}
                {format === 'percent'
                  ? delta.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                  : delta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
