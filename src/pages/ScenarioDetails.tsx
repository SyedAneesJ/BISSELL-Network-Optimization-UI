import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Map,
  ListOrdered,
  FileSpreadsheet,
  Package,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button, Tab, Tabs } from '@/components/ui';
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  ScenarioOverride,
  DomoCostComponentRow,
  DomoSpaceOverrideRow,
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
import { AICopilotDrawer } from '@/sections/scenario-details/ai';
import { startWorkflow } from '@/services/domo/domoWorkflow';

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
  costComponentRows?: DomoCostComponentRow[];
  spaceOverrideRows?: DomoSpaceOverrideRow[];
}

export const ScenarioDetails: React.FC<ScenarioDetailsProps> = (props) => {
  const baseLaneResults = useMemo(
    () => props.scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === props.scenarioId),
    [props.scenarioId, props.scenarioRunResultsLanes],
  );

  const currentScenario = useMemo(
    () => props.scenarioRunHeaders.find((s) => s.ScenarioRunID === props.scenarioId),
    [props.scenarioId, props.scenarioRunHeaders],
  );

  const baselineScenario = useMemo(() => {
    if (!currentScenario) return null;
    const candidates = props.scenarioRunHeaders.filter(
      (s) => s.Region === currentScenario.Region
        && (
          String(s.ScenarioType || '').toLowerCase().includes('baseline')
          || String(s.RunName || '').toLowerCase().includes('baseline')
        )
    );
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort(
      (a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime()
    );
    return sorted[0];
  }, [currentScenario, props.scenarioRunHeaders]);

  const resolvedBaselineScenarioId = baselineScenario?.ScenarioRunID;

  const baselineLanes = useMemo(() => {
    if (!resolvedBaselineScenarioId || resolvedBaselineScenarioId === props.scenarioId) return [];
    return props.scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === resolvedBaselineScenarioId);
  }, [resolvedBaselineScenarioId, props.scenarioId, props.scenarioRunResultsLanes]);

  const [hydratedLaneResults, setHydratedLaneResults] = useState<ScenarioRunResultsLane[]>(baseLaneResults);
  const [isLaneDataLoading, setIsLaneDataLoading] = useState(false);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const tabSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [defaultInsightResult, setDefaultInsightResult] = useState<any>(null);
  const [isDefaultInsightLoading, setIsDefaultInsightLoading] = useState(false);

  useEffect(() => {
    setIsDefaultInsightLoading(true);
    setDefaultInsightResult(null);

    let isSubscribed = true;

    const runDefaultWorkflow = async () => {
      try {
        const res = await startWorkflow('Bissell_AI_insights_default', {});
        console.log('[Bissell_AI_insights_default] Response:', res);
        if (isSubscribed) {
          setDefaultInsightResult(res);
        }
      } catch (err) {
        console.warn('Default insights workflow start failed or not in Domo. Using fallback.', err);
      } finally {
        if (isSubscribed) {
          setIsDefaultInsightLoading(false);
        }
      }
    };

    void runDefaultWorkflow();

    return () => {
      isSubscribed = false;
    };
  }, [props.scenarioId]);

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
    scenarioRunResultsLanes: useMemo(() => [
      ...laneResultsForDetails,
      ...baselineLanes
    ], [laneResultsForDetails, baselineLanes]),
    scenarioOverrides: props.scenarioOverrides,
    costComponentRows: props.costComponentRows,
    spaceOverrideRows: props.spaceOverrideRows,
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
          canShowBaseline={Boolean(baselineScenarioId) && scenario?.ScenarioType !== 'US Baseline' && scenario?.ScenarioType !== 'Canada Baseline'}
          canShowDifference={false}
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
          onExportRoutingCSV={handleExportLaneCSV}
          exportRoutingActive={isActionActive('scenario_export_lane')}
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
          onExportLaneCSV={handleExportRoutingCSV}
          onExportExceptionsCSV={handleExportExceptionsCSV}
          exportLaneActive={isActionActive('scenario_export_routing')}
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
          onOpenCopilot={() => setIsCopilotOpen(true)}
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

          <div className="mx-0 mt-4 surface-panel p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Recent Runs</h3>
                <p className="text-sm text-slate-600">Loaded from the persisted scenario repository.</p>
              </div>
              <span className="rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200/50">
                {props.recentRuns.length} entries
              </span>
            </div>
            {props.recentRuns.length === 0 ? (
              <p className="text-sm text-slate-500">No run history available yet.</p>
            ) : (
              <div className="space-y-3">
                {props.recentRuns.slice(0, 5).map((run) => {
                  const borderClass =
                    run.status === 'Completed'
                      ? 'border-l-4 border-l-emerald-500'
                      : run.status === 'Running'
                      ? 'border-l-4 border-l-blue-500'
                      : run.status === 'Failed'
                      ? 'border-l-4 border-l-rose-500'
                      : 'border-l-4 border-l-slate-400';

                  return (
                    <div
                      key={run.runId}
                      className={`flex flex-col gap-3 surface-card p-4 sm:flex-row sm:items-center sm:justify-between hover-lift ${borderClass}`}
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
                  );
                })}
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

      {/* Floating Action Button for AI Copilot */}
      {/* <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-12 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10"
      >
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide">AI Copilot</span>
      </button> */}

      {/* AI Copilot Slide-over Drawer */}
      {/* <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeScenarioName={scenario.RunName}
        defaultInsightResult={defaultInsightResult}
        isDefaultInsightLoading={isDefaultInsightLoading}
      /> */}
    </AppPage>
  );
};
