import React from 'react';
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
}) => {
  const isDisabled = laneResults.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className={`px-3 py-2 border border-slate-300 rounded-lg text-sm ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          value={laneChannelFilter}
          onChange={(e) => onLaneChannelFilterChange(e.target.value)}
          disabled={isDisabled}
        >
          <option value="All">All Channels</option>
          {channelOptions.map((channel) => (
            <option key={channel} value={channel}>{channel}</option>
          ))}
        </select>

        <select
          className={`px-3 py-2 border border-slate-300 rounded-lg text-sm ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          value={laneTermsFilter}
          onChange={(e) => onLaneTermsFilterChange(e.target.value)}
          disabled={isDisabled}
        >
          <option value="All">All Terms</option>
          {termsOptions.map((term) => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>

        <select
          className={`px-3 py-2 border border-slate-300 rounded-lg text-sm ${isDisabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
          value={laneFlagFilter}
          onChange={(e) => onLaneFlagFilterChange(e.target.value)}
          disabled={isDisabled}
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
