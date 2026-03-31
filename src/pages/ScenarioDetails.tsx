import React from 'react';
import {
  BarChart3,
  Map,
  ListOrdered,
  FileSpreadsheet,
  Package,
  Settings,
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
  ScenarioOverridesTab,
} from '@/sections/scenario-details';
import { ScenarioLaneDetailsModal } from '@/components/modals';
import { ScenarioCommentModal } from '@/components/modals';
import { ScenarioOverrideModal } from '@/components/modals';
import { useScenarioDetails } from '@/hooks';

interface ScenarioDetailsProps {
  scenarioId: string;
  onBack: () => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  scenarioRunConfigs: ScenarioRunConfig[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  scenarioOverrides: ScenarioOverride[];
  onDuplicateScenario: (scenarioId: string) => void;
  onPublishScenario: (scenarioId: string) => void;
  onApproveScenario: (scenarioId: string) => void;
  onArchiveScenario: (scenarioId: string) => void;
  onAddComment: (scenarioId: string, comment: string) => void;
  onApplyOverride: (scenarioId: string, override: Omit<ScenarioOverride, 'ScenarioRunID' | 'OverrideVersion' | 'UpdatedAt' | 'UpdatedBy'>) => void;
}

export const ScenarioDetails: React.FC<ScenarioDetailsProps> = (props) => {
  const {
    scenario,
    entityLabels,
    scenarioConfig,
    dcResults,
    laneResults,
    overrides,
    laneOptions,
    baselineScenarioId,
    canShowDifference,
    channelOptions,
    termsOptions,
    laneChannelFilter,
    setLaneChannelFilter,
    laneTermsFilter,
    setLaneTermsFilter,
    laneFlagFilter,
    setLaneFlagFilter,
    filteredLanes,
    networkView,
    setNetworkView,
    networkLaneEntries,
    networkDcVolumeRowsDiff,
    networkDcVolumeRowsBase,
    networkAvgDaysRowsDiff,
    networkAvgDaysRowsBase,
    topFootprintLanes,
    showOverrideModal,
    setShowOverrideModal,
    selectedLane,
    setSelectedLane,
    showCommentModal,
    setShowCommentModal,
    commentText,
    setCommentText,
    overrideLaneKey,
    setOverrideLaneKey,
    overrideNewDC,
    setOverrideNewDC,
    overrideReason,
    setOverrideReason,
    overrideComment,
    setOverrideComment,
    isActionActive,
    triggerAction,
    handleExportDecisionPack,
    handleExportRoutingCSV,
    handleExportLaneCSV,
    handleExportExceptionsCSV,
    handleSaveComment,
    handleApplyOverride,
    handleDuplicateScenario,
    handlePublishScenario,
    handleApproveScenario,
    handleArchiveScenario,
    dcColumns,
    laneColumns,
    rankedOptionsColumns,
  } = useScenarioDetails({
    scenarioId: props.scenarioId,
    scenarioRunHeaders: props.scenarioRunHeaders,
    scenarioRunConfigs: props.scenarioRunConfigs,
    scenarioRunResultsDC: props.scenarioRunResultsDC,
    scenarioRunResultsLanes: props.scenarioRunResultsLanes,
    scenarioOverrides: props.scenarioOverrides,
    onDuplicateScenario: props.onDuplicateScenario,
    onPublishScenario: props.onPublishScenario,
    onApproveScenario: props.onApproveScenario,
    onArchiveScenario: props.onArchiveScenario,
    onAddComment: props.onAddComment,
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
          laneResults={laneResults}
        />
      ),
    },
    {
      id: 'lanes',
      label: 'Lanes',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      content: (
        <ScenarioLanesTab
          laneResults={laneResults}
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
        />
      ),
    },
    {
      id: 'capacity',
      label: 'Capacity & Footprint',
      icon: <Package className="w-5 h-5" />,
      content: (
        <ScenarioCapacityTab
          dcResults={dcResults}
          dcColumns={dcColumns}
          topFootprintLanes={topFootprintLanes}
        />
      ),
    },
    {
      id: 'overrides',
      label: 'Overrides',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <ScenarioOverridesTab
          overrides={overrides}
          scenario={scenario}
          laneResults={laneResults}
          onOpenOverrideModal={() => setShowOverrideModal(true)}
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
          onDuplicateScenario={() => handleDuplicateScenario()}
          onPublishScenario={() => handlePublishScenario()}
          onApproveScenario={() => handleApproveScenario()}
          onArchiveScenario={() => handleArchiveScenario()}
          onOpenComment={() => {
            setShowCommentModal(true);
            triggerAction('scenario_comment_open');
          }}
          onExportDecisionPack={handleExportDecisionPack}
          onExportRoutingCSV={handleExportRoutingCSV}
          onExportLaneCSV={handleExportLaneCSV}
          onExportExceptionsCSV={handleExportExceptionsCSV}
          exportDecisionActive={isActionActive('scenario_export_decision')}
          exportRoutingActive={isActionActive('scenario_export_routing')}
          exportLaneActive={isActionActive('scenario_export_lane')}
          exportExceptionsActive={isActionActive('scenario_export_exceptions')}
          duplicateActive={isActionActive('scenario_duplicate')}
          publishActive={isActionActive('scenario_publish')}
          approveActive={isActionActive('scenario_approve')}
          commentOpenActive={isActionActive('scenario_comment_open')}
          archiveActive={isActionActive('scenario_archive')}
        />
      }
    >
      <Tabs tabs={tabs} defaultTab="summary" />

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

      <ScenarioOverrideModal
        isOpen={showOverrideModal}
        laneOptions={laneOptions}
        overrideLaneKey={overrideLaneKey}
        onOverrideLaneKeyChange={setOverrideLaneKey}
        overrideNewDC={overrideNewDC}
        onOverrideNewDCChange={setOverrideNewDC}
        overrideReason={overrideReason}
        onOverrideReasonChange={setOverrideReason}
        overrideComment={overrideComment}
        onOverrideCommentChange={setOverrideComment}
        onCancel={() => setShowOverrideModal(false)}
        onApply={handleApplyOverride}
        canApply={Boolean(overrideLaneKey && overrideNewDC.trim())}
      />
    </AppPage>
  );
};
