import React from 'react';
import { DataTable, Column } from '@/components/ui';
import { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';

interface ScenarioCapacityTabProps {
  dcResults: ScenarioRunResultsDC[];
  dcColumns: Column<ScenarioRunResultsDC>[];
  topFootprintLanes: ScenarioRunResultsLane[];
}

export const ScenarioCapacityTab: React.FC<ScenarioCapacityTabProps> = ({
  dcResults,
  dcColumns,
  topFootprintLanes,
}) => {
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
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
                  <div className="bg-blue-500" style={{ width: `${squarePct}%` }} />
                  <div className="bg-green-500" style={{ width: `${workingPct}%` }} />
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
            <div className="text-slate-500">No lane data available for footprint analysis.</div>
          )}
        </div>
      </div>
    </div>
  );
};
