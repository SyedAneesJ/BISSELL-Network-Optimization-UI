import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Download, Plus, X, ChevronDown, Lock } from 'lucide-react';
import { Button, NotificationBell } from '@/components';

interface WorkspaceOption {
  value: 'All' | 'US' | 'Canada';
  label: string;
  disabled?: boolean;
}

const workspaceOptions: WorkspaceOption[] = [
  { value: 'All', label: 'All Workspaces', disabled: true },
  { value: 'US', label: 'US' },
  { value: 'Canada', label: 'Canada', disabled: true },
];

interface HomeHeaderProps {
  workspace: 'All' | 'US' | 'Canada';
  onWorkspaceChange: (workspace: 'All' | 'US' | 'Canada') => void;
  currentUserDisplayName: string;
  currentUserEmail?: string | null;
  notificationCount: number;
  onOpenNotifications: () => void;
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
  currentUserDisplayName,
  currentUserEmail,
  notificationCount,
  onOpenNotifications,
  onExportScenarioList,
  onExportComparisonList,
  onNewScenario,
  onNewComparison,
  hasComparisons,
  exportScenarioActive,
  exportComparisonActive,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const profileInitials = useMemo(() => {
    const parts = (currentUserDisplayName || 'User').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  }, [currentUserDisplayName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 whitespace-nowrap truncate leading-tight">
            BISSELL&nbsp;Network&nbsp;Optimization
          </h1>

          {/* <div className="flex flex-col gap-1 max-w-[240px]"> */}
          {/* <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Workspace
            </label> */}
          <div className="relative group">
            <select
              value={workspace}
              onChange={(event) => {
                const nextWorkspace = event.target.value as 'All' | 'US' | 'Canada';
                if (nextWorkspace === 'All' || nextWorkspace === 'Canada') return;
                onWorkspaceChange(nextWorkspace);
              }}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              title="Only US is selectable for now"
            >
              {workspaceOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            {/* <span className="pointer-events-none absolute right-9 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm transition group-hover:flex">
                <Lock className="h-3 w-3" />
                Disabled
              </span> */}
          </div>
          {/* <p className="text-[11px] text-slate-500">All Workspaces and Canada are visible but disabled.</p> */}
          {/* </div> */}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5">
            <div className="relative group">
              <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
                Export
                <ChevronDown className="w-3 h-3" />
              </Button>
              <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-30">
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-t-lg ${exportScenarioActive ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={onExportScenarioList}
                >
                  {exportScenarioActive ? 'Exporting Scenario List…' : 'Export Scenario List CSV'}
                </button>
                <button
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-b-lg ${exportComparisonActive ? 'bg-amber-50 text-amber-800' : ''}`}
                  onClick={onExportComparisonList}
                >
                  {exportComparisonActive ? 'Exporting Comparison List…' : 'Export Comparison List CSV'}
                </button>
              </div>
            </div>

            <Button
              onClick={onNewComparison}
              variant="secondary"
              size="small"
              icon={<Plus className="w-4 h-4" />}
              title={hasComparisons ? 'Open the comparison wizard' : 'Create your first comparison'}
            >
              New Comparison
            </Button>

            <Button onClick={onNewScenario} variant="primary" size="small" icon={<Plus className="w-4 h-4" />}>
              New Scenario
            </Button>
          </div>

          <div className="flex md:hidden items-center gap-1.5">
            <Button onClick={onNewScenario} variant="primary" size="small" icon={<Plus className="w-4 h-4" />}>
              <span className="sr-only sm:not-sr-only">Scenario</span>
            </Button>
          </div>

          <NotificationBell count={notificationCount} onClick={onOpenNotifications} />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-900 text-xs font-semibold text-white ring-2 ring-white hover:ring-blue-400 transition flex-shrink-0"
              aria-expanded={profileOpen}
              aria-label="Toggle profile menu"
            >
              {profileInitials}
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {profileInitials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {currentUserDisplayName || 'User'}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {currentUserEmail || 'No email available'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close profile menu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex md:hidden flex-wrap items-center gap-1.5">
        <div className="relative group">
          <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-30">
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-t-lg ${exportScenarioActive ? 'bg-amber-50 text-amber-800' : ''}`}
              onClick={onExportScenarioList}
            >
              {exportScenarioActive ? 'Exporting…' : 'Export Scenario List CSV'}
            </button>
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-b-lg ${exportComparisonActive ? 'bg-amber-50 text-amber-800' : ''}`}
              onClick={onExportComparisonList}
            >
              {exportComparisonActive ? 'Exporting…' : 'Export Comparison List CSV'}
            </button>
          </div>
        </div>

        <Button
          onClick={onNewComparison}
          variant="secondary"
          size="small"
          icon={<Plus className="w-4 h-4" />}
          title={hasComparisons ? 'Open the comparison wizard' : 'Create your first comparison'}
        >
          New Comparison
        </Button>
      </div>
    </div>
  );
};
