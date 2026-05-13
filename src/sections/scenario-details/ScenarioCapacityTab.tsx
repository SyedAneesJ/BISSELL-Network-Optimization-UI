import React from 'react';
import { Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/ui';
import { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';

interface ScenarioCapacityTabProps {
  dcResults: ScenarioRunResultsDC[];
  dcColumns: Column<ScenarioRunResultsDC>[];
  topFootprintLanes: ScenarioRunResultsLane[];
  isLaneDataLoading?: boolean;
}

export const ScenarioCapacityTab: React.FC<ScenarioCapacityTabProps> = ({
  dcResults,
  dcColumns,
  topFootprintLanes,
  isLaneDataLoading = false,
}) => {
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Square Footage vs Working Capacity</h3>
        <div className="space-y-3">
          {dcResults.map((dc) => {
            const total = Math.max(dc.SpaceCore, dc.SpaceBCV, 1);
            const squarePct = (dc.SpaceCore / total) * 100;
            const workingPct = (dc.SpaceBCV / total) * 100;
            return (
              <div key={dc.DCName}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700">{dc.DCName}</span>
                  <span className="font-medium">{dc.SpaceCore.toLocaleString()} / {dc.SpaceBCV.toLocaleString()} sq ft</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-200" title={`Square Footage ${dc.SpaceCore.toLocaleString()} vs Working Capacity ${dc.SpaceBCV.toLocaleString()}`}>
                  <div
                    className="bg-blue-500"
                    style={getSegmentStyle(dc.SpaceCore, total)}
                    aria-label={`Square Footage ${squarePct.toFixed(2)}%`}
                  />
                  <div
                    className="bg-green-500"
                    style={getSegmentStyle(dc.SpaceBCV, total)}
                    aria-label={`Working Capacity ${workingPct.toFixed(2)}%`}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>Square Footage: {squarePct.toFixed(2)}%</span>
                  <span>Working Capacity: {workingPct.toFixed(2)}%</span>
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
              <div className="font-medium text-slate-900 flex-shrink-0">{lane.FootprintContribution.toLocaleString()}</div>
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
