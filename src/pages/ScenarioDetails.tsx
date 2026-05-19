import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Map,
  ListOrdered,
  FileSpreadsheet,
  Package,
  Loader2,
} from 'lucide-react';
import { Button, Tab, Tabs } from '@/components/ui';
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  ScenarioOverride,
} from '@/data';
import { AppPage } from '@/layouts';
import {
  ScenarioHeader,
  ScenarioSummaryTab,
  ScenarioNetworkTab,
  ScenarioRankedOptionsTab,
  ScenarioLanesTab,
  ScenarioCapacityTab,
} from '@/sections/scenario-details';
import { ScenarioLaneDetailsModal } from '@/components/modals';
import { ScenarioCommentModal } from '@/components/modals';
import { useScenarioDetails } from '@/hooks';
import { loadScenarioLaneSnapshotsFromAppDb, ScenarioRunHistoryEntry } from '@/services/scenario';

interface ScenarioDetailsProps {
  scenarioId: string;
  onBack: () => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  scenarioRunConfigs: ScenarioRunConfig[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  scenarioOverrides: ScenarioOverride[];
  recentRuns: ScenarioRunHistoryEntry[];
  onDuplicateScenario: (scenarioId: string) => void;
  onPublishScenario: (scenarioId: string) => void;
  onApproveScenario: (scenarioId: string) => void;
  onArchiveScenario: (scenarioId: string) => void;
  onAddComment: (scenarioId: string, comment: string) => void;
  onApplyOverride: (scenarioId: string, override: Omit<ScenarioOverride, 'ScenarioRunID' | 'OverrideVersion' | 'UpdatedAt' | 'UpdatedBy'>) => void;
}

export const ScenarioDetails: React.FC<ScenarioDetailsProps> = (props) => {
  const baseLaneResults = useMemo(
    () => props.scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === props.scenarioId),
    [props.scenarioId, props.scenarioRunResultsLanes],
  );
  const [hydratedLaneResults, setHydratedLaneResults] = useState<ScenarioRunResultsLane[]>(baseLaneResults);
  const [isLaneDataLoading, setIsLaneDataLoading] = useState(false);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const tabSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tabSwitchTimerRef.current) {
        clearTimeout(tabSwitchTimerRef.current);
        tabSwitchTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHydratedLaneResults(baseLaneResults);

    if (baseLaneResults.length > 0) {
      setIsLaneDataLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLaneDataLoading(true);
    void loadScenarioLaneSnapshotsFromAppDb(props.scenarioId)
      .then((laneRows) => {
        if (!cancelled && laneRows.length > 0) {
          setHydratedLaneResults(laneRows);
        }
      })
      .catch((error) => {
        console.warn('Failed to load scenario lane snapshots for details view', error);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLaneDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseLaneResults, props.scenarioId]);

  const laneResultsForDetails = hydratedLaneResults.length > 0 ? hydratedLaneResults : baseLaneResults;

  const {
    scenario,
    entityLabels,
    scenarioConfig,
    dcResults,
    laneResults,
    laneOptions,
    baselineScenarioId,
    canShowDifference,
    channelOptions,
    termsOptions,
    laneZipSearch,
    setLaneZipSearch,
    laneChannelFilter,
    setLaneChannelFilter,
    laneTermsFilter,
    setLaneTermsFilter,
    laneFlagFilter,
    setLaneFlagFilter,
    filteredLanes,
    isLaneFiltering,
    networkView,
    setNetworkView,
    networkLaneEntries,
    networkDcVolumeRowsDiff,
    networkDcVolumeRowsBase,
    networkAvgDaysRowsDiff,
    networkAvgDaysRowsBase,
    topFootprintLanes,
    selectedLane,
    setSelectedLane,
    showCommentModal,
    setShowCommentModal,
    commentText,
    setCommentText,
    isActionActive,
    triggerAction,
    handleExportDCDetails,
    handleExportRoutingCSV,
    handleExportLaneCSV,
    handleExportExceptionsCSV,
    handleSaveComment,
    handlePublishScenario,
    handleApproveScenario,
    dcColumns,
    laneColumns,
    rankedOptionsColumns,
  } = useScenarioDetails({
    scenarioId: props.scenarioId,
    scenarioRunHeaders: props.scenarioRunHeaders,
    scenarioRunConfigs: props.scenarioRunConfigs,
    scenarioRunResultsDC: props.scenarioRunResultsDC,
    scenarioRunResultsLanes: laneResultsForDetails,
    scenarioOverrides: props.scenarioOverrides,
    onPublishScenario: props.onPublishScenario,
    onApproveScenario: props.onApproveScenario,
    onAddComment: props.onAddComment,
    onDuplicateScenario: props.onDuplicateScenario,
    onArchiveScenario: props.onArchiveScenario,
    onApplyOverride: props.onApplyOverride,
  });

  if (!scenario) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">Scenario not found</p>
          <Button onClick={props.onBack} variant="primary" className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Tab[] = [
    {
      id: 'summary',
      label: 'Summary',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <ScenarioSummaryTab
          scenario={scenario}
          scenarioConfig={scenarioConfig}
          entityLabels={entityLabels}
          dcResults={dcResults}
          laneResults={laneResults}
          topFootprintLanes={topFootprintLanes}
          onExportDCDetails={handleExportDCDetails}
          exportDCDetailsActive={isActionActive('scenario_export_dc_details')}
        />
      ),
    },
    {
      id: 'network',
      label: 'Network View',
      icon: <Map className="w-5 h-5" />,
      content: (
        <ScenarioNetworkTab
          networkView={networkView}
          onToggleBaseline={() => setNetworkView(networkView === 'baseline' ? 'current' : 'baseline')}
          onToggleDifference={() => setNetworkView(networkView === 'difference' ? 'current' : 'difference')}
          canShowBaseline={Boolean(baselineScenarioId)}
          canShowDifference={canShowDifference}
          networkLaneEntries={networkLaneEntries}
          networkDcVolumeRowsDiff={networkDcVolumeRowsDiff.map((row) => ({ dcName: row.dcName, delta: row.delta }))}
          networkDcVolumeRowsBase={networkDcVolumeRowsBase}
          networkAvgDaysRowsDiff={networkAvgDaysRowsDiff.map((row) => ({ dcName: row.dcName, delta: row.delta }))}
          networkAvgDaysRowsBase={networkAvgDaysRowsBase}
        />
      ),
    },
    {
      id: 'ranked',
      label: 'Ranked Options',
      icon: <ListOrdered className="w-5 h-5" />,
      content: (
        <ScenarioRankedOptionsTab
          rankedOptionsColumns={rankedOptionsColumns}
          laneResults={filteredLanes}
          laneZipSearch={laneZipSearch}
          onLaneZipSearchChange={setLaneZipSearch}
          channelOptions={channelOptions}
          termsOptions={termsOptions}
          laneChannelFilter={laneChannelFilter}
          onLaneChannelFilterChange={setLaneChannelFilter}
          laneTermsFilter={laneTermsFilter}
          onLaneTermsFilterChange={setLaneTermsFilter}
          hasLaneData={laneResults.length > 0}
          isLaneDataLoading={isLaneDataLoading}
          isLaneFiltering={isLaneFiltering}
          onExportRoutingCSV={handleExportRoutingCSV}
          exportRoutingActive={isActionActive('scenario_export_routing')}
        />
      ),
    },
    {
      id: 'lanes',
      label: 'Lanes',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      content: (
        <ScenarioLanesTab
          laneResults={filteredLanes}
          laneZipSearch={laneZipSearch}
          onLaneZipSearchChange={setLaneZipSearch}
          channelOptions={channelOptions}
          termsOptions={termsOptions}
          laneChannelFilter={laneChannelFilter}
          onLaneChannelFilterChange={setLaneChannelFilter}
          laneTermsFilter={laneTermsFilter}
          onLaneTermsFilterChange={setLaneTermsFilter}
          laneFlagFilter={laneFlagFilter}
          onLaneFlagFilterChange={setLaneFlagFilter}
          filteredLanes={filteredLanes}
          laneColumns={laneColumns}
          onSelectLane={setSelectedLane}
          hasLaneData={laneResults.length > 0}
          isLaneDataLoading={isLaneDataLoading}
          isLaneFiltering={isLaneFiltering}
          onExportLaneCSV={handleExportLaneCSV}
          onExportExceptionsCSV={handleExportExceptionsCSV}
          exportLaneActive={isActionActive('scenario_export_lane')}
          exportExceptionsActive={isActionActive('scenario_export_exceptions')}
        />
      ),
    },
    {
      id: 'capacity',
      label: 'Capacity & Footprint',
      icon: <Package className="w-5 h-5" />,
      content: (
        <ScenarioCapacityTab
          scenario={scenario}
          scenarioConfig={scenarioConfig}
          dcResults={dcResults}
          dcColumns={dcColumns}
          topFootprintLanes={topFootprintLanes}
          isLaneDataLoading={isLaneDataLoading}
        />
      ),
    },
  ];

  return (
    <AppPage
      header={
        <ScenarioHeader
          scenario={scenario}
          scenarioId={props.scenarioId}
          laneResultsCount={laneResults.length}
          onBack={props.onBack}
          onPublishScenario={() => handlePublishScenario()}
          onApproveScenario={() => handleApproveScenario()}
          onOpenComment={() => {
            setShowCommentModal(true);
            triggerAction('scenario_comment_open');
          }}
          publishActive={isActionActive('scenario_publish')}
          approveActive={isActionActive('scenario_approve')}
          commentOpenActive={isActionActive('scenario_comment_open')}
        />
      }
    >
      <div className="relative">
        {(isLaneDataLoading && laneResults.length === 0) || isTabSwitching ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border border-blue-200 bg-white/85 px-6 py-16 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-base font-medium text-slate-900">
                {isTabSwitching ? 'Switching tabs...' : 'Loading scenario details...'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {isTabSwitching
                  ? 'Refreshing the selected tab content.'
                  : 'We are fetching the stored scenario results.'}
              </p>
            </div>
          </div>
        ) : null}

        <div className={isTabSwitching ? 'pointer-events-none select-none opacity-60' : ''}>
          <Tabs
            tabs={tabs}
            defaultTab="summary"
            onChange={() => {
              if (tabSwitchTimerRef.current) {
                clearTimeout(tabSwitchTimerRef.current);
              }
              setIsTabSwitching(true);
              tabSwitchTimerRef.current = setTimeout(() => {
                setIsTabSwitching(false);
                tabSwitchTimerRef.current = null;
              }, 160);
            }}
          />

          <div className="mx-0 mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Recent Runs</h3>
                <p className="text-sm text-slate-500">Loaded from the persisted scenario repository.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {props.recentRuns.length} entries
              </span>
            </div>
            {props.recentRuns.length === 0 ? (
              <p className="text-sm text-slate-500">No run history available yet.</p>
            ) : (
              <div className="space-y-3">
                {props.recentRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.runId}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{run.status}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                          {run.executionId || 'No execution id'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Triggered by {run.triggeredBy} on {new Date(run.startedAt).toLocaleString()}
                        {run.completedAt ? `, completed ${new Date(run.completedAt).toLocaleString()}` : ''}
                      </p>
                      {run.message && (
                        <p className="mt-1 text-sm text-slate-500">{run.message}</p>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 sm:text-right">
                      <p>Dataflow: {run.dataflowId || 'NA'}</p>
                      <p>
                        Duration: {typeof run.durationMs === 'number'
                          ? `${Math.max(0, Math.round(run.durationMs / 1000))}s`
                          : 'NA'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ScenarioLaneDetailsModal
        isOpen={!!selectedLane}
        lane={selectedLane}
        onClose={() => setSelectedLane(null)}
      />

      <ScenarioCommentModal
        isOpen={showCommentModal}
        commentText={commentText}
        onCommentChange={setCommentText}
        onCancel={() => setShowCommentModal(false)}
        onSave={handleSaveComment}
        saveActive={isActionActive('scenario_comment_save')}
      />
    </AppPage>
  );
};
