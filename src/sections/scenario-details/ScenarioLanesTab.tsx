import React from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button, DataTable, Column } from '@/components/ui';
import { ScenarioRunResultsLane } from '@/data';
import { ScenarioLaneFilters } from './ScenarioLaneFilters';

interface ScenarioLanesTabProps {
  laneResults: ScenarioRunResultsLane[];
  laneZipSearch: string;
  onLaneZipSearchChange: (value: string) => void;
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
  isLaneDataLoading?: boolean;
  isLaneFiltering?: boolean;
  onExportLaneCSV?: () => void;
  onExportExceptionsCSV?: () => void;
  exportLaneActive?: boolean;
  exportExceptionsActive?: boolean;
}

export const ScenarioLanesTab: React.FC<ScenarioLanesTabProps> = ({
  laneResults,
  laneZipSearch,
  onLaneZipSearchChange,
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
  isLaneDataLoading = false,
  isLaneFiltering = false,
  onExportLaneCSV,
  onExportExceptionsCSV,
  exportLaneActive = false,
  exportExceptionsActive = false,
}) => {
  const showLoading = isLaneDataLoading || isLaneFiltering;

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {isLaneDataLoading ? 'Loading lane details' : 'Updating lane filters'}
        </h3>
        <p className="text-slate-500 max-w-md text-center">
          {isLaneDataLoading
            ? 'We are fetching the stored lane snapshots for this custom scenario.'
            : 'Applying the selected ZIP, channel, and term filters.'}
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
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Lane Data Available</h3>
        <p className="text-slate-500 max-w-md text-center">
          This scenario does not contain lane-level details. The dataset only provides aggregate facility-level metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScenarioLaneFilters
        laneZipSearch={laneZipSearch}
        onLaneZipSearchChange={onLaneZipSearchChange}
        channelOptions={channelOptions}
        termsOptions={termsOptions}
        laneChannelFilter={laneChannelFilter}
        onLaneChannelFilterChange={onLaneChannelFilterChange}
        laneTermsFilter={laneTermsFilter}
        onLaneTermsFilterChange={onLaneTermsFilterChange}
        laneFlagFilter={laneFlagFilter}
        onLaneFlagFilterChange={onLaneFlagFilterChange}
        showFlagFilter
        rightActions={
          <div className="flex flex-wrap gap-2">
            {onExportLaneCSV && (
              <Button
                variant="secondary"
                size="small"
                icon={<Download className="w-4 h-4" />}
                onClick={onExportLaneCSV}
                className={exportLaneActive ? 'bg-amber-50 text-amber-800' : ''}
              >
                {exportLaneActive ? 'Exporting Lane Table…' : 'Export Lane Table CSV'}
              </Button>
            )}
            {/* {onExportExceptionsCSV && (
              <Button
                variant="secondary"
                size="small"
                icon={<Download className="w-4 h-4" />}
                onClick={onExportExceptionsCSV}
                className={exportExceptionsActive ? 'bg-amber-50 text-amber-800' : ''}
              >
                {exportExceptionsActive ? 'Exporting Exceptions…' : 'Export Exceptions CSV'}
              </Button>
            )} */}
          </div>
        }
      />

      <DataTable
        columns={laneColumns}
        data={filteredLanes}
        maxHeight="600px"
        pageSize={12}
        onRowClick={(row) => onSelectLane(row)}
      />
    </div>
  );
};
