import React from 'react';
import { BarChart3, Building2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Button, Tab, Tabs } from '../components/ui';
import {
  ComparisonDetailDC,
  ComparisonDetailLane,
  ComparisonHeader,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
} from '../data';
import { AppPage } from '../layouts';
import {
  ComparisonHeader as ComparisonHeaderSection,
  ComparisonKpiTab,
  ComparisonDcTab,
  ComparisonLanesTab,
  ComparisonExceptionsTab,
} from '../sections/comparison-details';
import { ComparisonDecisionModal } from '../components/modals';
import { useComparisonDetails } from '../hooks';

interface ComparisonDetailsProps {
  comparisonId: string;
  onBack: () => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  comparisonHeaders: ComparisonHeader[];
  comparisonDetailDC: ComparisonDetailDC[];
  comparisonDetailLanes: ComparisonDetailLane[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  onPublishComparison: (comparisonId: string) => void;
  onAddDecision: (comparisonId: string, verdict: string, reason: string) => void;
}

export const ComparisonDetails: React.FC<ComparisonDetailsProps> = (props) => {
  const {
    comparison,
    scenarioA,
    scenarioB,
    showDecisionModal,
    setShowDecisionModal,
    decisionVerdict,
    setDecisionVerdict,
    decisionReason,
    setDecisionReason,
    laneDiffFilter,
    setLaneDiffFilter,
    laneChannelFilter,
    setLaneChannelFilter,
    dcComparison,
    laneComparison,
    filteredLaneComparison,
    handleExportComparisonPack,
    handleExportLaneDiff,
    handleExportDCDiff,
    handleSaveDecision,
    handlePublishComparison,
    isActionActive,
    kpiComparisons,
    formatValue,
    dcComparisonColumns,
    laneComparisonColumns,
  } = useComparisonDetails({
    comparisonId: props.comparisonId,
    scenarioRunHeaders: props.scenarioRunHeaders,
    comparisonHeaders: props.comparisonHeaders,
    comparisonDetailDC: props.comparisonDetailDC,
    comparisonDetailLanes: props.comparisonDetailLanes,
    scenarioRunResultsDC: props.scenarioRunResultsDC,
    scenarioRunResultsLanes: props.scenarioRunResultsLanes,
    onPublishComparison: props.onPublishComparison,
    onAddDecision: props.onAddDecision,
  });

  if (!comparison) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-slate-600">Comparison not found</p>
          <Button onClick={props.onBack} variant="primary" className="mt-4">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Tab[] = [
    {
      id: 'kpi',
      label: 'KPI Compare',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <ComparisonKpiTab
          comparison={comparison}
          kpiComparisons={kpiComparisons}
          formatValue={formatValue}
        />
      ),
    },
    {
      id: 'dc',
      label: 'DC Compare',
      icon: <Building2 className="w-5 h-5" />,
      content: (
        <ComparisonDcTab
          dcComparison={dcComparison}
          dcComparisonColumns={dcComparisonColumns}
        />
      ),
    },
    {
      id: 'lanes',
      label: 'Lane Diff',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      content: (
        <ComparisonLanesTab
          laneDiffFilter={laneDiffFilter}
          onLaneDiffFilterChange={setLaneDiffFilter}
          laneChannelFilter={laneChannelFilter}
          onLaneChannelFilterChange={setLaneChannelFilter}
          filteredLaneComparison={filteredLaneComparison}
          laneComparisonColumns={laneComparisonColumns}
        />
      ),
    },
    {
      id: 'exceptions',
      label: 'Exceptions Compare',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: (
        <ComparisonExceptionsTab
          laneComparison={laneComparison}
          comparison={comparison}
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          onExportLaneDiff={handleExportLaneDiff}
          exportLaneActive={isActionActive('comparison_export_lane')}
        />
      ),
    },
  ];

  return (
    <AppPage
      header={
        <ComparisonHeaderSection
          comparison={comparison}
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          onBack={props.onBack}
          onExportComparisonPack={handleExportComparisonPack}
          onExportLaneDiff={handleExportLaneDiff}
          onExportDCDiff={handleExportDCDiff}
          exportPackActive={isActionActive('comparison_export_pack')}
          exportLaneActive={isActionActive('comparison_export_lane')}
          exportDcActive={isActionActive('comparison_export_dc')}
          onOpenDecision={() => setShowDecisionModal(true)}
          canAddDecision={!comparison.DecisionVerdict}
          onPublishComparison={handlePublishComparison}
          publishActive={isActionActive('comparison_publish')}
        />
      }
    >
      <Tabs tabs={tabs} defaultTab="kpi" />

      <ComparisonDecisionModal
        isOpen={showDecisionModal}
        decisionVerdict={decisionVerdict}
        decisionReason={decisionReason}
        onDecisionVerdictChange={setDecisionVerdict}
        onDecisionReasonChange={setDecisionReason}
        onCancel={() => setShowDecisionModal(false)}
        onSave={handleSaveDecision}
        saveActive={isActionActive('comparison_decision')}
      />
    </AppPage>
  );
};
