import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Database, Download, Plus, X, ChevronDown } from 'lucide-react';
import { Button, NotificationBell, Select } from '@/components';

interface WorkspaceOption {
  value: 'All' | 'US' | 'Canada';
  label: string;
  disabled?: boolean;
}

const workspaceOptions: WorkspaceOption[] = [
  { value: 'All', label: 'All Workspaces' },
  { value: 'US', label: 'US' },
  { value: 'Canada', label: 'Canada' },
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
  onOpenDataSources: () => void;
  hasComparisons: boolean;
  exportScenarioActive: boolean;
  exportComparisonActive: boolean;
  comparisonActionsDisabled?: boolean;
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
  onOpenDataSources,
  hasComparisons,
  exportScenarioActive,
  exportComparisonActive,
  comparisonActionsDisabled = false,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const profileInitials = useMemo(
    () =>
      (currentUserDisplayName || 'User')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'U',
    [currentUserDisplayName],
  );

  return (
    <div className="sticky top-0 z-30 surface-header shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <img src="/Bissell.png" alt="Bissell Logo" className="h-10 sm:h-12 object-contain" />
            <div className="hidden sm:block h-6 w-px bg-slate-300" />
            <span className="text-sm font-semibold text-slate-900">Workspace</span>
            <Select
              value={workspace}
              onChange={(val) => onWorkspaceChange(val as 'All' | 'US' | 'Canada')}
              options={workspaceOptions}
              className="w-44"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div className="hidden md:flex items-center gap-1.5">
              <div className="relative group">
                <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
                  Export
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 surface-card z-30 overflow-hidden">
                  <button
                    className={`w-full text-left px-4 py-2 text-sm transition hover:bg-blue-50/70 ${exportScenarioActive ? 'bg-amber-50 text-amber-800' : ''}`}
                    onClick={onExportScenarioList}
                  >
                    {exportScenarioActive ? 'Exporting Scenario List…' : 'Export Scenario List CSV'}
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm transition hover:bg-blue-50/70 ${exportComparisonActive ? 'bg-amber-50 text-amber-800' : 'text-slate-700'} ${comparisonActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={onExportComparisonList}
                    disabled={comparisonActionsDisabled}
                  >
                    {exportComparisonActive ? 'Exporting Comparison List…' : 'Export Comparison List CSV'}
                  </button>
                </div>
              </div>

              <Button
                onClick={onOpenDataSources}
                variant="secondary"
                size="small"
                icon={<Database className="w-4 h-4" />}
                title="View all Domo data sources"
              >
                Data Sources
              </Button>

              <Button
                onClick={onNewComparison}
                variant="secondary"
                size="small"
                icon={<Plus className="w-4 h-4" />}
                title={hasComparisons ? 'Open the comparison wizard' : 'Create your first comparison'}
                disabled={comparisonActionsDisabled}
                className={comparisonActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''}
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
                <div className="absolute right-0 top-full z-40 mt-2 w-72 surface-card-strong p-4">
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
            <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-56 surface-card z-30 overflow-hidden">
              <button
                className={`w-full text-left px-4 py-2 text-sm transition hover:bg-blue-50/70 ${exportScenarioActive ? 'bg-amber-50 text-amber-800' : ''}`}
                onClick={onExportScenarioList}
              >
                {exportScenarioActive ? 'Exporting…' : 'Export Scenario List CSV'}
              </button>
              <button
                className={`w-full text-left px-4 py-2 text-sm transition hover:bg-blue-50/70 ${exportComparisonActive ? 'bg-amber-50 text-amber-800' : 'text-slate-700'} ${comparisonActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={onExportComparisonList}
                disabled={comparisonActionsDisabled}
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
            disabled={comparisonActionsDisabled}
            className={comparisonActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          >
            New Comparison
          </Button>
        </div>
      </div>
    </div>
  );
};
