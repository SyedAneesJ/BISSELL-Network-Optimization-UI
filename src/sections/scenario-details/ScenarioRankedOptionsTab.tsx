import React from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/ui';
import { ScenarioRunResultsLane } from '@/data';
import { ScenarioLaneFilters } from './ScenarioLaneFilters';

interface ScenarioRankedOptionsTabProps {
  rankedOptionsColumns: Column<ScenarioRunResultsLane>[];
  laneResults: ScenarioRunResultsLane[];
  laneZipSearch: string;
  onLaneZipSearchChange: (value: string) => void;
  channelOptions: string[];
  termsOptions: string[];
  laneChannelFilter: string;
  onLaneChannelFilterChange: (value: string) => void;
  laneTermsFilter: string;
  onLaneTermsFilterChange: (value: string) => void;
  hasLaneData: boolean;
  isLaneDataLoading?: boolean;
}

export const ScenarioRankedOptionsTab: React.FC<ScenarioRankedOptionsTabProps> = ({
  rankedOptionsColumns,
  laneResults,
  laneZipSearch,
  onLaneZipSearchChange,
  channelOptions,
  termsOptions,
  laneChannelFilter,
  onLaneChannelFilterChange,
  laneTermsFilter,
  onLaneTermsFilterChange,
  hasLaneData,
  isLaneDataLoading = false,
}) => {
  if (isLaneDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Loading ranked options</h3>
        <p className="text-slate-500 max-w-md text-center">
          We are fetching the stored lane snapshots for this custom scenario.
        </p>
      </div>
    );
  }

  if (!hasLaneData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Ranked Options Available</h3>
        <p className="text-slate-500 max-w-md text-center">
          This scenario does not contain lane-level details required for ranked options. The dataset only provides aggregate facility-level metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          This view shows the top 3 ranked DC options for each lane based on cost optimization. The chosen rank indicates which option was selected in the final solution.
        </p>
      </div>

      <ScenarioLaneFilters
        laneZipSearch={laneZipSearch}
        onLaneZipSearchChange={onLaneZipSearchChange}
        channelOptions={channelOptions}
        termsOptions={termsOptions}
        laneChannelFilter={laneChannelFilter}
        onLaneChannelFilterChange={onLaneChannelFilterChange}
        laneTermsFilter={laneTermsFilter}
        onLaneTermsFilterChange={onLaneTermsFilterChange}
      />

      <DataTable
        columns={rankedOptionsColumns}
        data={laneResults}
        maxHeight="600px"
        pageSize={10}
      />
    </div>
  );
};
