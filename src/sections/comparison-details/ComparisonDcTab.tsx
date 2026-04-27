import React from 'react';
import { DataTable, Column } from '@/components/ui';
import { ComparisonDetailDC } from '@/data';

interface ComparisonDcTabProps {
  dcComparison: ComparisonDetailDC[];
  dcComparisonColumns: Column<ComparisonDetailDC>[];
}

export const ComparisonDcTab: React.FC<ComparisonDcTabProps> = ({
  dcComparison,
  dcComparisonColumns,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Utilization Comparison</h3>
          <div className="space-y-3">
            {dcComparison.map((dc) => (
              <div key={dc.DCName}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{dc.DCName}</span>
                  <span className="font-medium">{dc.Util_A}% vs {dc.Util_B}%</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <div className="bg-slate-200 rounded h-2 overflow-hidden">
                    <div className="bg-blue-500 h-2" style={{ width: `${dc.Util_A}%` }} />
                  </div>
                  <div className="bg-slate-200 rounded h-2 overflow-hidden">
                    <div className="bg-green-500 h-2" style={{ width: `${dc.Util_B}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {dcComparison.length === 0 && (
              <div className="text-sm text-slate-500">No DC comparison data available.</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost by DC</h3>
          <div className="space-y-3">
            {dcComparison.map((dc) => {
              const maxCost = Math.max(dc.Cost_A, dc.Cost_B, 1);
              return (
                <div key={dc.DCName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{dc.DCName}</span>
                    <span className="font-medium">${dc.Cost_A.toLocaleString()} vs ${dc.Cost_B.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-slate-200 rounded h-2 overflow-hidden">
                      <div className="bg-blue-500 h-2" style={{ width: `${(dc.Cost_A / maxCost) * 100}%` }} />
                    </div>
                    <div className="bg-slate-200 rounded h-2 overflow-hidden">
                      <div className="bg-green-500 h-2" style={{ width: `${(dc.Cost_B / maxCost) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {dcComparison.length === 0 && (
              <div className="text-sm text-slate-500">No DC comparison data available.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Comparison Detail</h3>
        <DataTable
          columns={dcComparisonColumns}
          data={dcComparison}
        />
      </div>
    </div>
  );
};
