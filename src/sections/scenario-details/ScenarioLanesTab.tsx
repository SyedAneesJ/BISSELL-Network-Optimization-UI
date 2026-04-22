import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { DataTable, Column } from '@/components/ui';
import { ScenarioRunResultsLane } from '@/data';

interface ScenarioLanesTabProps {
  laneResults: ScenarioRunResultsLane[];
  channelOptions: string[];
  termsOptions: string[];
  laneChannelFilter: string;
  onLaneChannelFilterChange: (value: string) => void;
  laneTermsFilter: string;
  onLaneTermsFilterChange: (value: string) => void;
  laneFlagFilter: string;
  onLaneFlagFilterChange: (value: string) => void;
  filteredLanes: ScenarioRunResultsLane[];
  laneColumns: Column<ScenarioRunResultsLane>[];
  onSelectLane: (lane: ScenarioRunResultsLane) => void;
  hasLaneData: boolean;
}

export const ScenarioLanesTab: React.FC<ScenarioLanesTabProps> = ({
  laneResults,
  channelOptions,
  termsOptions,
  laneChannelFilter,
  onLaneChannelFilterChange,
  laneTermsFilter,
  onLaneTermsFilterChange,
  laneFlagFilter,
  onLaneFlagFilterChange,
  filteredLanes,
  laneColumns,
  onSelectLane,
  hasLaneData,
}) => {
  if (!hasLaneData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Lane Data Available</h3>
        <p className="text-slate-500 max-w-md text-center">
          This scenario does not contain lane-level details. The dataset only provides aggregate facility-level metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          value={laneChannelFilter}
          onChange={(e) => onLaneChannelFilterChange(e.target.value)}
        >
          <option value="All">All Channels</option>
          {channelOptions.map((channel) => (
            <option key={channel} value={channel}>{channel}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          value={laneTermsFilter}
          onChange={(e) => onLaneTermsFilterChange(e.target.value)}
        >
          <option value="All">All Terms</option>
          {termsOptions.map((term) => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          value={laneFlagFilter}
          onChange={(e) => onLaneFlagFilterChange(e.target.value)}
        >
          <option value="All">All Lanes</option>
          <option value="SLA Breaches Only">SLA Breaches Only</option>
          <option value="Excluded by SLA">Excluded by SLA</option>
          <option value="Overrides Only">Overrides Only</option>
          <option value="Flagged Lanes">Flagged Lanes</option>
        </select>
      </div>

      <DataTable
        columns={laneColumns}
        data={filteredLanes}
        maxHeight="600px"
        onRowClick={(row) => onSelectLane(row)}
      />
    </div>
  );
};
