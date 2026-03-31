import React from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui';

interface HomeHeaderProps {
  workspace: 'All' | 'US' | 'Canada';
  onWorkspaceChange: (workspace: 'All' | 'US' | 'Canada') => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onDataHealth: () => void;
  onExportScenarioList: () => void;
  onExportComparisonList: () => void;
  onNewScenario: () => void;
  onNewComparison: () => void;
  hasComparisons: boolean;
  exportScenarioActive: boolean;
  exportComparisonActive: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  workspace,
  onWorkspaceChange,
  searchTerm,
  onSearchTermChange,
  onDataHealth,
  onExportScenarioList,
  onExportComparisonList,
  onNewScenario,
  onNewComparison,
  hasComparisons,
  exportScenarioActive,
  exportComparisonActive,
}) => {
  return (
    <div className="max-w-[1920px] mx-auto px-6 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">
            BISSELL Network Optimization
          </h1>
          <select
            value={workspace}
            onChange={(e) => onWorkspaceChange(e.target.value as 'All' | 'US' | 'Canada')}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Workspaces</option>
            <option value="US">US</option>
            <option value="Canada">Canada</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search runs and comparisons..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-72 lg:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button onClick={onDataHealth} variant="secondary" size="small">
            Data Health
          </Button>

          <div className="relative group">
            <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
              Export
            </Button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
              <button
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${exportScenarioActive ? 'bg-amber-50 text-amber-800' : ''}`}
                onClick={onExportScenarioList}
              >
                {exportScenarioActive ? 'Exporting Scenario List...' : 'Export Scenario List CSV'}
              </button>
              <button
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${!hasComparisons ? 'text-slate-400 cursor-not-allowed' : ''} ${exportComparisonActive ? 'bg-amber-50 text-amber-800' : ''}`}
                onClick={onExportComparisonList}
                disabled={!hasComparisons}
              >
                {exportComparisonActive ? 'Exporting Comparison List...' : 'Export Comparison List CSV'}
              </button>
            </div>
          </div>

          <Button
            onClick={onNewComparison}
            variant="secondary"
            size="small"
            icon={<Plus className="w-4 h-4" />}
            disabled={!hasComparisons}
          >
            New Comparison
          </Button>

          <Button onClick={onNewScenario} variant="primary" size="small" icon={<Plus className="w-4 h-4" />}>
            New Scenario
          </Button>
        </div>
      </div>
    </div>
  );
};
