import React from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { Button, KPICard } from '@/components/ui';
import { ComparisonHeader } from '@/data';

interface ComparisonKpiTabProps {
  comparison: ComparisonHeader;
  kpiComparisons: Array<{ label: string; valueA: number; valueB: number; format: 'currency' | 'decimal' | 'number' }>;
  formatValue: (val: number, format: 'currency' | 'decimal' | 'number') => string;
  onExportKpiComparison: () => void;
  exportKpiActive: boolean;
  changedLaneCount: number;
}

export const ComparisonKpiTab: React.FC<ComparisonKpiTabProps> = ({
  comparison,
  kpiComparisons,
  formatValue,
  onExportKpiComparison,
  exportKpiActive,
  changedLaneCount,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="small"
          icon={<Download className="w-4 h-4" />}
          onClick={onExportKpiComparison}
          disabled={exportKpiActive}
          className={exportKpiActive ? 'bg-amber-50 text-amber-800' : ''}
        >
          {exportKpiActive ? 'Exporting...' : 'Export KPI Compare CSV'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPICard
          label="Cost Delta"
          value={comparison.CostDelta}
          format="currency"
          size="medium"
        />
        <KPICard
          label="Cost Delta %"
          value={comparison.CostDeltaPct}
          format="decimal"
          size="medium"
        />
        <KPICard
          label="Changed Lanes"
          value={changedLaneCount}
          format="number"
          size="medium"
        />
      </div>

      <div className="surface-panel overflow-auto">
        <table className="min-w-max w-full table-auto">
          <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">KPI</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Run A</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Run B</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Delta</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Delta %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 bg-white/65">
            {kpiComparisons.map((kpi, idx) => {
              const delta = kpi.valueB - kpi.valueA;
              const deltaPct = kpi.valueA !== 0 ? (delta / kpi.valueA) * 100 : 0;
              const isNegativeBetter = ['SLA Breach %', 'Excluded SLA', 'Max Util %'].includes(kpi.label);

              return (
                <tr key={idx} className="transition-colors hover:bg-blue-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{kpi.label}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{formatValue(kpi.valueA, kpi.format)}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">{formatValue(kpi.valueB, kpi.format)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${
                    delta > 0 ? (isNegativeBetter ? 'text-red-600' : 'text-red-600') :
                    delta < 0 ? (isNegativeBetter ? 'text-green-600' : 'text-green-600') :
                    'text-slate-700'
                  }`}>
                    {delta > 0 ? '+' : ''}{formatValue(delta, kpi.format)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${
                    delta > 0 ? (isNegativeBetter ? 'text-red-600' : 'text-red-600') :
                    delta < 0 ? (isNegativeBetter ? 'text-green-600' : 'text-green-600') :
                    'text-slate-700'
                  }`}>
                    {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {comparison.DecisionVerdict && (
        <div className="surface-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">Decision: {comparison.DecisionVerdict}</h3>
              <p className="text-sm text-green-800">{comparison.DecisionReason}</p>
              <p className="text-xs text-green-700 mt-2">
                Decision by {comparison.CreatedBy} on {new Date(comparison.CreatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
