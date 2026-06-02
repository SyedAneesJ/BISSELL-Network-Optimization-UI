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
    <div className="surface-panel mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
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
        <div className="surface-card border-dashed px-4 py-6 text-sm text-slate-600">
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
