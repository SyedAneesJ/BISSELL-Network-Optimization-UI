import React from 'react';
import { DataTable, Column } from '@/components/ui';
import { ScenarioRunResultsLane } from '@/data';

interface ScenarioRankedOptionsTabProps {
  rankedOptionsColumns: Column<ScenarioRunResultsLane>[];
  laneResults: ScenarioRunResultsLane[];
}

export const ScenarioRankedOptionsTab: React.FC<ScenarioRankedOptionsTabProps> = ({
  rankedOptionsColumns,
  laneResults,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          This view shows the top 3 ranked DC options for each lane based on cost optimization. The chosen rank indicates which option was selected in the final solution.
        </p>
      </div>

      <DataTable
        columns={rankedOptionsColumns}
        data={laneResults}
        maxHeight="600px"
      />
    </div>
  );
};
