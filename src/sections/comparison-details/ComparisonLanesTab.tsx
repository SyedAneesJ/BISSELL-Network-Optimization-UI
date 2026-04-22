import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { DataTable, Column } from '@/components/ui';
import { ComparisonDetailLane } from '@/data';

interface ComparisonLanesTabProps {
  laneDiffFilter: string;
  onLaneDiffFilterChange: (value: string) => void;
  laneChannelFilter: string;
  onLaneChannelFilterChange: (value: string) => void;
  filteredLaneComparison: ComparisonDetailLane[];
  laneComparisonColumns: Column<ComparisonDetailLane>[];
  hasLaneData: boolean;
}

export const ComparisonLanesTab: React.FC<ComparisonLanesTabProps> = ({
  laneDiffFilter,
  onLaneDiffFilterChange,
  laneChannelFilter,
  onLaneChannelFilterChange,
  filteredLaneComparison,
  laneComparisonColumns,
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
          The selected scenarios do not contain lane-level details. The dataset only provides aggregate facility-level metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={laneDiffFilter}
          onChange={(e) => onLaneDiffFilterChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option>Only Changed Lanes</option>
          <option>All Lanes</option>
          <option>Only SLA Worsened</option>
          <option>Only Capacity Improved</option>
          <option>Top 50 Cost Impact</option>
          <option>Top 100 Cost Impact</option>
        </select>

        <select
          value={laneChannelFilter}
          onChange={(e) => onLaneChannelFilterChange(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option>All Channels</option>
          <option>B2C</option>
          <option>B2B</option>
          <option>D2C</option>
        </select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          Showing {filteredLaneComparison.length} lane(s) with differences between the two scenarios.
          Use filters above to focus on specific types of changes.
        </p>
      </div>

      <DataTable
        columns={laneComparisonColumns}
        data={filteredLaneComparison}
        maxHeight="600px"
      />
    </div>
  );
};
