import React from 'react';
import { RefreshCw } from 'lucide-react';
import { DataTable, Column } from '@/components/ui';
import { ComparisonHeader } from '@/data';
import { Button } from '@/components/ui';

interface HomeComparisonsSectionProps {
  comparisonColumns: Column<ComparisonHeader>[];
  filteredComparisons: ComparisonHeader[];
  onOpenComparison: (comparisonId: string) => void;
  emptyStateMessage: string;
  onRefresh: () => void;
  refreshActive: boolean;
}

export const HomeComparisonsSection: React.FC<HomeComparisonsSectionProps> = ({
  comparisonColumns,
  filteredComparisons,
  onOpenComparison,
  emptyStateMessage,
  onRefresh,
  refreshActive,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Comparisons</h2>
        <Button
          onClick={onRefresh}
          variant="secondary"
          size="small"
          icon={<RefreshCw className={`w-4 h-4 ${refreshActive ? 'animate-spin' : ''}`} />}
          className={refreshActive ? 'bg-amber-100 text-amber-800' : ''}
        >
          {refreshActive ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {filteredComparisons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          {emptyStateMessage}
        </div>
      ) : (
        <DataTable
          columns={comparisonColumns}
          data={filteredComparisons}
          onRowClick={(row) => onOpenComparison(row.ComparisonID)}
          getRowId={(row) => row.ComparisonID}
          maxHeight="400px"
        />
      )}
    </div>
  );
};
