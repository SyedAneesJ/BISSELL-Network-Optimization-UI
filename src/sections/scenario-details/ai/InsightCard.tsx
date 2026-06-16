import React from 'react';

export interface InsightStat {
  value: React.ReactNode;
  color: string;
  label: string;
}

interface InsightCardProps {
  number: string;
  numberBg: string;
  title: string;
  category: string;
  stats?: InsightStat[];
  body?: string;
  action?: string;
  actionType?: 'blue' | 'amber' | 'green' | 'red';
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({
  number,
  numberBg,
  title,
  category,
  stats,
  body,
  action,
  actionType = 'blue',
  children,
  fullWidth,
}) => {
  const actionColors = {
    blue: 'bg-blue-50 border border-blue-100 text-blue-800',
    amber: 'bg-amber-50 border border-amber-100 text-amber-800',
    green: 'bg-green-50 border border-green-100 text-green-800',
    red: 'bg-red-50 border border-red-100 text-red-800',
  };

  return (
    <div
      className={`surface-card p-0 overflow-hidden ${
        fullWidth ? 'md:col-span-2 col-span-1' : 'col-span-1'
      } transition duration-200 ease-out hover:shadow-md`}
    >
      <div className="p-5 flex items-start gap-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          style={{ backgroundColor: numberBg }}
        >
          {number}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-800 leading-snug">{title}</div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide uppercase">{category}</div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 border-y border-slate-100 bg-slate-50/30">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`p-3 text-center ${
                i < stats.length - 1 ? 'border-r border-slate-100' : ''
              }`}
            >
              <div
                className="text-base font-bold tabular-nums leading-none"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {body && (
        <div
          className="px-5 pb-4 text-xs text-slate-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: body }}
        />
      )}

      {children}

      {action && (
        <div
          className={`mx-5 mb-4 p-3 rounded-xl text-xs leading-relaxed ${actionColors[actionType]}`}
          dangerouslySetInnerHTML={{ __html: action }}
        />
      )}
    </div>
  );
};
