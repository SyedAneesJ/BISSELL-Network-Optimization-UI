import React from 'react';
import { Play, RefreshCw } from 'lucide-react';
import { Button, DataTable, Column } from '@/components/ui';
import { ScenarioRunHeader } from '@/data';

interface HomeScenarioRunsSectionProps {
  scenarioColumns: Column<ScenarioRunHeader>[];
  filteredScenarios: ScenarioRunHeader[];
  selectedScenarios: Set<string>;
  onSelectScenario: (scenarioId: string) => void;
  onOpenScenario: (scenarioId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onlyAlerts: boolean;
  onOnlyAlertsChange: (value: boolean) => void;
  onlyPublished: boolean;
  onOnlyPublishedChange: (value: boolean) => void;
  showCompareSelected: boolean;
  onCompareSelected: () => void;
  canCompare: boolean;
  onRefresh: () => void;
  refreshActive: boolean;
}

export const HomeScenarioRunsSection: React.FC<HomeScenarioRunsSectionProps> = ({
  scenarioColumns,
  filteredScenarios,
  selectedScenarios,
  onSelectScenario,
  onOpenScenario,
  statusFilter,
  onStatusFilterChange,
  onlyAlerts,
  onOnlyAlertsChange,
  onlyPublished,
  onOnlyPublishedChange,
  showCompareSelected,
  onCompareSelected,
  canCompare,
  onRefresh,
  refreshActive,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Scenario Runs</h2>
        <div className="flex gap-2">
          {showCompareSelected && (
            <Button onClick={onCompareSelected} variant="primary" size="small" disabled={!canCompare} icon={<Play className="w-4 h-4" />}>
              Compare Selected
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Status:</label>
          <select
            value={statusFilter}
            className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Draft">Draft</option>
            <option value="Running">Running</option>
            <option value="Completed">Completed</option>
            <option value="Reviewed">Reviewed</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        <label className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={onlyAlerts}
            onChange={(e) => onOnlyAlertsChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-slate-700">Only Runs with Alerts</span>
        </label>

        <label className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={onlyPublished}
            onChange={(e) => onOnlyPublishedChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-slate-700">Only Published</span>
        </label>

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

      <DataTable
        columns={scenarioColumns}
        data={filteredScenarios}
        onRowClick={(row) => onOpenScenario(row.ScenarioRunID)}
        selectedRows={selectedScenarios}
        onSelectRow={onSelectScenario}
        getRowId={(row) => row.ScenarioRunID}
        maxHeight="600px"
      />
    </div>
  );
};
