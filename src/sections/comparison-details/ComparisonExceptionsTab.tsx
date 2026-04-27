import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { ComparisonDetailLane, ComparisonHeader, ScenarioRunHeader } from '@/data';

interface ComparisonExceptionsTabProps {
  laneComparison: ComparisonDetailLane[];
  comparison: ComparisonHeader;
  scenarioA?: ScenarioRunHeader;
  scenarioB?: ScenarioRunHeader;
  onExportLaneDiff: () => void;
  exportLaneActive: boolean;
}

export const ComparisonExceptionsTab: React.FC<ComparisonExceptionsTabProps> = ({
  laneComparison,
  comparison,
  scenarioA,
  scenarioB,
  onExportLaneDiff,
  exportLaneActive,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-600 mb-1">SLA Breaches A</div>
          <div className="text-3xl font-bold text-slate-900">{scenarioA?.ExcludedBySLACount || 0}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-600 mb-1">SLA Breaches B</div>
          <div className="text-3xl font-bold text-slate-900">{scenarioB?.ExcludedBySLACount || 0}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-600 mb-1">Delta</div>
          <div className={`text-3xl font-bold ${
            (scenarioB?.ExcludedBySLACount || 0) - (scenarioA?.ExcludedBySLACount || 0) > 0
              ? 'text-red-600'
              : 'text-green-600'
          }`}>
            {(scenarioB?.ExcludedBySLACount || 0) - (scenarioA?.ExcludedBySLACount || 0) > 0 ? '+' : ''}
            {(scenarioB?.ExcludedBySLACount || 0) - (scenarioA?.ExcludedBySLACount || 0)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-600 mb-1">Change</div>
          <div className={`text-2xl font-bold ${comparison.SLABreachDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {comparison.SLABreachDelta > 0 ? 'Worse' : comparison.SLABreachDelta < 0 ? 'Better' : 'Same'}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Exception Summary</h3>

        <div className="space-y-4">
          {[
            {
              label: 'DC Changes',
              count: laneComparison.filter(l => l.Flags.includes('DCChange')).length,
              note: 'Lanes with a different assigned DC between A and B',
            },
            {
              label: 'SLA Worsened',
              count: laneComparison.filter(l => l.Flags.includes('SLA')).length,
              note: 'Lanes with higher delivery days in B',
            },
            {
              label: 'Overrides Involved',
              count: laneComparison.filter(l => l.Flags.includes('Override')).length,
              note: 'Lanes impacted by manual overrides',
            },
          ].map((item) => (
            <div key={item.label} className="border border-slate-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="font-medium text-slate-900">{item.label}</h4>
                <div className="text-sm text-slate-700">
                  Count: <strong className="text-slate-900">{item.count}</strong>
                </div>
              </div>
              <p className="text-sm text-slate-600">{item.note}</p>
            </div>
          ))}
          {laneComparison.length === 0 && (
            <div className="text-sm text-slate-500">No lane exceptions available for this comparison.</div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={onExportLaneDiff}
          className={exportLaneActive ? 'bg-amber-100 text-amber-800' : ''}
        >
          {exportLaneActive ? 'Exporting...' : 'Export Exceptions Diff CSV'}
        </Button>
      </div>
    </div>
  );
};
