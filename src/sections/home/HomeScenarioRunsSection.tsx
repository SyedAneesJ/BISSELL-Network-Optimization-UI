import React, { useEffect, useMemo, useState } from 'react';
import { Play, RefreshCw, Search } from 'lucide-react';
import { Button, DataTable, Column, Select } from '@/components/ui';
import { ScenarioRunHeader } from '@/data';

const statusOptions = [
  { value: 'All', label: 'All' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Running', label: 'Running' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Reviewed', label: 'Reviewed' },
  { value: 'Published', label: 'Published' },
  { value: 'Archived', label: 'Archived' },
];

interface HomeScenarioRunsSectionProps {
  scenarioColumns: Column<ScenarioRunHeader>[];
  filteredScenarios: ScenarioRunHeader[];
  selectedScenarios: Set<string>;
  onSelectScenario: (scenarioId: string) => void;
  onOpenScenario: (scenarioId: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onlyAlerts: boolean;
  onOnlyAlertsChange: (value: boolean) => void;
  onlyPublished: boolean;
  onOnlyPublishedChange: (value: boolean) => void;
  showCompareSelected: boolean;
  onCompareSelected: () => void;
  canCompare: boolean;
  comparisonActionsDisabled?: boolean;
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
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  onlyAlerts,
  onOnlyAlertsChange,
  onlyPublished,
  onOnlyPublishedChange,
  showCompareSelected,
  onCompareSelected,
  canCompare,
  comparisonActionsDisabled = false,
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
  }, [statusFilter, onlyAlerts, onlyPublished, filteredScenarios.length, searchTerm]);

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
    <div className="surface-panel mb-6 p-5">
      <div className="mb-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Scenario Runs</h2>
        <div className="flex flex-wrap gap-2">
          {onRunSelected && (
            <Button onClick={onRunSelected} variant="primary" size="small" disabled={!canRun} icon={<Play className="w-4 h-4" />}>
              Run Selected
            </Button>
          )}
          {showCompareSelected && (
            <Button
              onClick={onCompareSelected}
              variant="secondary"
              size="small"
              disabled={!canCompare || comparisonActionsDisabled}
              className={comparisonActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Compare Selected
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between border border-slate-200/50 bg-slate-50/50 backdrop-blur-sm p-3.5 rounded-2xl shadow-sm relative z-20">

        <div className="flex flex-wrap items-center gap-2.5">

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 whitespace-nowrap">Status:</label>
            <Select
              value={statusFilter}
              onChange={onStatusFilterChange}
              options={statusOptions}
              className="w-36"
            />
          </div>

          <label className={`filter-pill flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-sm font-medium transition cursor-pointer select-none ${
            onlyAlerts
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-md shadow-blue-500/10'
              : 'border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
          }`}>
            <input
              type="checkbox"
              checked={onlyAlerts}
              onChange={(e) => onOnlyAlertsChange(e.target.checked)}
              className="sr-only"
            />
            <span className="whitespace-nowrap">
              Only Runs with Alerts
            </span>
          </label>

          <label className="filter-pill flex items-center gap-2 rounded-xl border border-slate-200/40 bg-white/50 px-3.5 py-1.5 text-sm font-medium text-slate-400 cursor-not-allowed opacity-50 select-none shadow-sm">
            <input
              type="checkbox"
              checked={onlyPublished}
              onChange={(e) => onOnlyPublishedChange(e.target.checked)}
              className="sr-only"
              disabled
            />
            <span className="whitespace-nowrap">
              Only Published
            </span>
          </label>

          <Button
            onClick={onRefresh}
            variant="secondary"
            size="small"
            icon={<RefreshCw className={`w-4 h-4 ${refreshActive ? 'animate-spin' : ''}`} />}
            disabled
            className="opacity-50 cursor-not-allowed shadow-sm"
          >
            Refresh
          </Button>
        </div>

        <div className="relative w-full lg:w-[320px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder="Search scenario runs..."
            className="w-full rounded-xl border border-slate-200/60 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          />
        </div>

      </div>

      <div className="rounded-2xl border border-slate-200/40 bg-slate-50/20 p-1">
        <DataTable
          columns={scenarioColumns}
          data={paginatedScenarios}
          onRowClick={(row) => onOpenScenario(row.ScenarioRunID)}
          selectedRows={selectedScenarios}
          onSelectRow={onSelectScenario}
          getRowId={(row) => row.ScenarioRunID}
          maxHeight="600px"
        />
      </div>

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
