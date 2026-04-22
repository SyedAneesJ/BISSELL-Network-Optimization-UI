import React, { useEffect, useMemo, useState } from 'react';
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
  onRunSelected?: () => void;
  canRun?: boolean;
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
  onRunSelected,
  canRun,
}) => {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(filteredScenarios.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, onlyAlerts, onlyPublished, filteredScenarios.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedScenarios = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredScenarios.slice(start, start + PAGE_SIZE);
  }, [filteredScenarios, currentPage]);

  const startItem = filteredScenarios.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredScenarios.length);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Scenario Runs</h2>
        <div className="flex gap-2">
          {onRunSelected && (
            <Button onClick={onRunSelected} variant="primary" size="small" disabled={!canRun} icon={<Play className="w-4 h-4" />}>
              Run Selected
            </Button>
          )}
          {showCompareSelected && (
            <Button onClick={onCompareSelected} variant="secondary" size="small" disabled={!canCompare}>
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
        data={paginatedScenarios}
        onRowClick={(row) => onOpenScenario(row.ScenarioRunID)}
        selectedRows={selectedScenarios}
        onSelectRow={onSelectScenario}
        getRowId={(row) => row.ScenarioRunID}
        maxHeight="600px"
      />

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing {startItem}-{endItem} of {filteredScenarios.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="small"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
