import React from 'react';
import { TrendingUp } from 'lucide-react';
import { KPICard } from '@/components/ui';
import { ComparisonHeader } from '@/data';

interface ComparisonKpiTabProps {
  comparison: ComparisonHeader;
  kpiComparisons: Array<{ label: string; valueA: number; valueB: number; format: 'currency' | 'decimal' | 'number' }>;
  formatValue: (val: number, format: 'currency' | 'decimal' | 'number') => string;
}

export const ComparisonKpiTab: React.FC<ComparisonKpiTabProps> = ({
  comparison,
  kpiComparisons,
  formatValue,
}) => {
  return (
    <div className="space-y-6">
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
          value={comparison.ChangedLaneDelta}
          format="number"
          size="medium"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="min-w-max w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">KPI</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Run A</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Run B</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Delta</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Delta %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {kpiComparisons.map((kpi, idx) => {
              const delta = kpi.valueB - kpi.valueA;
              const deltaPct = kpi.valueA !== 0 ? (delta / kpi.valueA) * 100 : 0;
              const isNegativeBetter = ['SLA Breach %', 'Excluded SLA', 'Max Util %'].includes(kpi.label);

              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{kpi.label}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatValue(kpi.valueA, kpi.format)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatValue(kpi.valueB, kpi.format)}</td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    delta > 0 ? (isNegativeBetter ? 'text-red-600' : 'text-red-600') :
                    delta < 0 ? (isNegativeBetter ? 'text-green-600' : 'text-green-600') :
                    'text-slate-700'
                  }`}>
                    {delta > 0 ? '+' : ''}{formatValue(delta, kpi.format)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
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
