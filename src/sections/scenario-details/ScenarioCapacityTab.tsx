import React from 'react';
import { Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/ui';
import { ScenarioRunConfig, ScenarioRunHeader, ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';

interface ScenarioCapacityTabProps {
  scenario: ScenarioRunHeader;
  scenarioConfig?: ScenarioRunConfig;
  dcResults: ScenarioRunResultsDC[];
  dcColumns: Column<ScenarioRunResultsDC>[];
  topFootprintLanes: ScenarioRunResultsLane[];
  isLaneDataLoading?: boolean;
}

export const ScenarioCapacityTab: React.FC<ScenarioCapacityTabProps> = ({
  scenario,
  scenarioConfig,
  dcResults,
  dcColumns,
  topFootprintLanes,
  isLaneDataLoading = false,
}) => {
  const parsedUtilCap = Number.parseFloat(String(scenario.UtilizationCap || ''));
  const utilCapPct = Number.isFinite(scenarioConfig?.UtilCapPct)
    ? Number(scenarioConfig?.UtilCapPct)
    : (Number.isFinite(parsedUtilCap) ? parsedUtilCap : 100);
  const getUtilSpace = (dc: ScenarioRunResultsDC): number => {
    if (dc.IsSuppressed === 'Y') return 0;
    const capacity = Number(dc.ActualSpace ?? 0);
    if (!Number.isFinite(capacity) || capacity <= 0) return 0;
    return capacity * (Math.max(0, Math.min(100, utilCapPct)) / 100);
  };

  const getSegmentStyle = (value: number, total: number) => {
    if (value <= 0 || total <= 0) {
      return {
        flex: '0 0 0%',
        minWidth: '0px',
      };
    }
  
    const pct = (value / total) * 100;
  
    return {
      flex: `${Math.max(pct, 0.5)} 1 0%`,
      minWidth: '8px',
    };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Capacity Analysis</h3>
        <DataTable columns={dcColumns} data={dcResults} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Util Space / Space Required</h3>
        <div className="space-y-3">
          {dcResults.map((dc) => {
            const utilSpace = getUtilSpace(dc);
            const total = Math.max(utilSpace, dc.SpaceRequired, 1);
            const utilPct = (utilSpace / total) * 100;
            const requiredPct = (dc.SpaceRequired / total) * 100;
            return (
              <div key={dc.DCName}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{dc.DCName}</span>
                  <span className="font-medium">{utilSpace.toLocaleString()} / {dc.SpaceRequired.toLocaleString()} sq ft</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-200" title={`Util Space ${utilSpace.toLocaleString()} vs Space Required ${dc.SpaceRequired.toLocaleString()}`}>
                  <div
                    className="bg-blue-500"
                    style={getSegmentStyle(utilSpace, total)}
                    aria-label={`Util Space ${utilPct.toFixed(2)}%`}
                  />
                  <div
                    className="bg-green-500"
                    style={getSegmentStyle(dc.SpaceRequired, total)}
                    aria-label={`Space Required ${requiredPct.toFixed(2)}%`}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>Util Space: {utilPct.toFixed(2)}%</span>
                  <span>Space Required: {requiredPct.toFixed(2)}%</span>
                </div>
              </div>
            );
          })}
          {dcResults.length === 0 && (
            <div className="text-sm text-slate-500">No DC results available for this scenario.</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Footprint Contributors</h3>
        <div className="space-y-2 text-sm">
          {topFootprintLanes.map((lane) => (
            <div key={`${lane.Dest3Zip}-${lane.Channel}-${lane.Terms}-${lane.CustomerGroup}`} className="flex justify-between gap-2">
              <div className="text-slate-700 flex-1 min-w-0 truncate">
                {lane.Dest3Zip} {lane.DestState} | {lane.Channel} {lane.Terms} | {lane.CustomerGroup}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="font-medium text-slate-900">{lane.FootprintContribution.toLocaleString()}</div>
                {lane.OvercapFlag === 'Y' ? (
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[11px] font-semibold">Overcap</span>
                ) : null}
              </div>
            </div>
          ))}
          {topFootprintLanes.length === 0 && (
            isLaneDataLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading footprint lanes...</span>
              </div>
            ) : (
              <div className="text-slate-500">No lane data available for footprint analysis.</div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
