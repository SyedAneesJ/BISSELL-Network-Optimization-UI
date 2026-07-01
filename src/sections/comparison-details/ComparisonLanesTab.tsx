import React from 'react';
import { Download } from 'lucide-react';
import { FileSpreadsheet } from 'lucide-react';
import { Button, DataTable, Column, Select } from '@/components/ui';
import { ComparisonDetailLane } from '@/data';

const diffFilterOptions = [
  { value: 'Only Changed Lanes', label: 'Only Changed Lanes' },
  { value: 'All Lanes', label: 'All Lanes' },
  { value: 'Only SLA Worsened', label: 'Only SLA Worsened' },
  { value: 'Only Capacity Improved', label: 'Only Capacity Improved' },
  // { value: 'Top 50 Cost Impact', label: 'Top 50 Cost Impact' },
  // { value: 'Top 100 Cost Impact', label: 'Top 100 Cost Impact' },
];

interface ComparisonLanesTabProps {
  laneDiffFilter: string;
  onLaneDiffFilterChange: (value: string) => void;
  laneChannelFilter: string;
  onLaneChannelFilterChange: (value: string) => void;
  filteredLaneComparison: ComparisonDetailLane[];
  laneComparisonColumns: Column<ComparisonDetailLane>[];
  hasLaneData: boolean;
  onExportLaneDiff: () => void;
  exportLaneActive: boolean;
  channelOptions?: string[];
}

export const ComparisonLanesTab: React.FC<ComparisonLanesTabProps> = ({
  laneDiffFilter,
  onLaneDiffFilterChange,
  laneChannelFilter,
  onLaneChannelFilterChange,
  filteredLaneComparison,
  laneComparisonColumns,
  hasLaneData,
  onExportLaneDiff,
  exportLaneActive,
  channelOptions = [],
}) => {
  const channelFilterOptions = React.useMemo(() => {
    return [
      { value: 'All', label: 'All Channels' },
      ...channelOptions.map((c) => ({ value: c, label: c })),
    ];
  }, [channelOptions]);
  if (!hasLaneData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Lane Data Available</h3>
        <p className="text-slate-500 max-w-md text-center">
          The selected scenarios do not contain lane-level details. The dataset only provides aggregate facility-level metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={laneDiffFilter}
          onChange={onLaneDiffFilterChange}
          options={diffFilterOptions}
          className="w-56"
        />

        <Select
          value={laneChannelFilter}
          onChange={onLaneChannelFilterChange}
          options={channelFilterOptions}
          className="w-44"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-blue-800">
            Showing {filteredLaneComparison.length} lane(s) with differences between the two scenarios.
            Use filters above to focus on specific types of changes.
          </p>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={onExportLaneDiff}
            className={exportLaneActive ? 'bg-amber-100 text-amber-800' : ''}
          >
            {exportLaneActive ? 'Exporting...' : 'Export Lane Diff CSV'}
          </Button>
        </div>
      </div>

      <DataTable
        columns={laneComparisonColumns}
        data={filteredLaneComparison}
        maxHeight="600px"
      />
    </div>
  );
};
