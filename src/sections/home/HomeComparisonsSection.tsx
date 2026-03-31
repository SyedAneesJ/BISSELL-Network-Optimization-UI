import React from 'react';
import { DataTable, Column } from '@/components/ui';
import { ComparisonHeader } from '@/data';

interface HomeComparisonsSectionProps {
  comparisonColumns: Column<ComparisonHeader>[];
  filteredComparisons: ComparisonHeader[];
  onOpenComparison: (comparisonId: string) => void;
}

export const HomeComparisonsSection: React.FC<HomeComparisonsSectionProps> = ({
  comparisonColumns,
  filteredComparisons,
  onOpenComparison,
}) => {
  if (filteredComparisons.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Comparisons</h2>
      </div>

      <DataTable
        columns={comparisonColumns}
        data={filteredComparisons}
        onRowClick={(row) => onOpenComparison(row.ComparisonID)}
        getRowId={(row) => row.ComparisonID}
        maxHeight="400px"
      />
    </div>
  );
};
