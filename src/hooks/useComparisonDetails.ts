import { useMemo, useState } from 'react';
import {
  ComparisonDetailDC,
  ComparisonDetailLane,
  ComparisonHeader,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
} from '@/data';
import { downloadBlob, toCSV, useActionFeedback } from '@/utils';
import { createComparisonDcColumns, createComparisonLaneColumns } from '@/lib';

interface UseComparisonDetailsParams {
  comparisonId: string;
  scenarioRunHeaders: ScenarioRunHeader[];
  comparisonHeaders: ComparisonHeader[];
  comparisonDetailDC: ComparisonDetailDC[];
  comparisonDetailLanes: ComparisonDetailLane[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  onPublishComparison: (comparisonId: string) => void;
  onAddDecision: (comparisonId: string, verdict: string, reason: string) => void;
}

export const useComparisonDetails = ({
  comparisonId,
  scenarioRunHeaders,
  comparisonHeaders,
  comparisonDetailDC,
  comparisonDetailLanes,
  scenarioRunResultsDC,
  scenarioRunResultsLanes,
  onPublishComparison,
  onAddDecision,
}: UseComparisonDetailsParams) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionVerdict, setDecisionVerdict] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [laneDiffFilter, setLaneDiffFilter] = useState('Only Changed Lanes');
  const [laneChannelFilter, setLaneChannelFilter] = useState('All Channels');

  const comparison = comparisonHeaders.find(c => c.ComparisonID === comparisonId);
  const dcComparisonStored = comparisonDetailDC.filter(dc => dc.ComparisonID === comparisonId);
  const laneComparisonStored = comparisonDetailLanes.filter(lane => lane.ComparisonID === comparisonId);

  const scenarioA = comparison ? scenarioRunHeaders.find(s => s.ScenarioRunID === comparison.ScenarioRunID_A) : undefined;
  const scenarioB = comparison ? scenarioRunHeaders.find(s => s.ScenarioRunID === comparison.ScenarioRunID_B) : undefined;

  const dcComparison = useMemo(() => {
    if (!comparison) return [] as ComparisonDetailDC[];
    const a = scenarioRunResultsDC.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_A);
    const b = scenarioRunResultsDC.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_B);
    if (a.length === 0 && b.length === 0) return dcComparisonStored;

    const byA = new Map(a.map(dc => [dc.DCName, dc]));
    const byB = new Map(b.map(dc => [dc.DCName, dc]));
    const dcNames = Array.from(new Set([...byA.keys(), ...byB.keys()]));

    return dcNames.map((name) => {
      const dcA = byA.get(name);
      const dcB = byB.get(name);
      return {
        ComparisonID: comparisonId,
        DCName: name,
        Cost_A: dcA?.TotalCost || 0,
        Cost_B: dcB?.TotalCost || 0,
        Cost_Delta: (dcB?.TotalCost || 0) - (dcA?.TotalCost || 0),
        Util_A: dcA?.UtilPct || 0,
        Util_B: dcB?.UtilPct || 0,
        Util_Delta: (dcB?.UtilPct || 0) - (dcA?.UtilPct || 0),
        Space_A: dcA?.SpaceRequired || 0,
        Space_B: dcB?.SpaceRequired || 0,
        Space_Delta: (dcB?.SpaceRequired || 0) - (dcA?.SpaceRequired || 0),
        SLABreach_A: dcA?.SLABreachCount || 0,
        SLABreach_B: dcB?.SLABreachCount || 0,
      };
    });
  }, [comparison, comparisonId, scenarioRunResultsDC, dcComparisonStored]);

  const laneComparison = useMemo(() => {
    if (!comparison) return [] as ComparisonDetailLane[];
    const a = scenarioRunResultsLanes.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_A);
    const b = scenarioRunResultsLanes.filter(r => r.ScenarioRunID === comparison.ScenarioRunID_B);
    if (a.length === 0 && b.length === 0) return laneComparisonStored;

    const key = (lane: ScenarioRunResultsLane) =>
      `${lane.Dest3Zip}|${lane.Channel}|${lane.Terms}|${lane.CustomerGroup}`;
    const byA = new Map(a.map(l => [key(l), l]));
    const byB = new Map(b.map(l => [key(l), l]));
    const keys = Array.from(new Set([...byA.keys(), ...byB.keys()]));

    return keys.map((k) => {
      const laneA = byA.get(k);
      const laneB = byB.get(k);
      const flags: string[] = [];
      if (laneA?.AssignedDC && laneB?.AssignedDC && laneA.AssignedDC !== laneB.AssignedDC) flags.push('DCChange');
      if ((laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0) > 0.5) flags.push('SLA');
      if (laneB?.OverrideAppliedFlag === 'Y' || laneA?.OverrideAppliedFlag === 'Y') flags.push('Override');

      return {
        ComparisonID: comparisonId,
        Dest3Zip: laneA?.Dest3Zip || laneB?.Dest3Zip || '',
        Channel: laneA?.Channel || laneB?.Channel || '',
        Terms: laneA?.Terms || laneB?.Terms || '',
        CustomerGroup: laneA?.CustomerGroup || laneB?.CustomerGroup || '',
        DC_A: laneA?.AssignedDC || '',
        DC_B: laneB?.AssignedDC || '',
        Cost_A: laneA?.LaneCost || 0,
        Cost_B: laneB?.LaneCost || 0,
        Cost_Delta: (laneB?.LaneCost || 0) - (laneA?.LaneCost || 0),
        Days_A: laneA?.DeliveryDays || 0,
        Days_B: laneB?.DeliveryDays || 0,
        Days_Delta: Math.round(((laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0)) * 100) / 100,
        UtilImpact_A: laneA?.UtilImpactPct || 0,
        UtilImpact_B: laneB?.UtilImpactPct || 0,
        Flags: flags.join(','),
      };
    });
  }, [comparison, comparisonId, scenarioRunResultsLanes, laneComparisonStored]);

  const filteredLaneComparison = useMemo(() => {
    let rows = laneComparison;
    if (laneDiffFilter === 'Only Changed Lanes') {
      rows = rows.filter(l => l.DC_A !== l.DC_B || l.Cost_Delta !== 0 || l.Days_Delta !== 0);
    } else if (laneDiffFilter === 'Only SLA Worsened') {
      rows = rows.filter(l => l.Flags.includes('SLA'));
    } else if (laneDiffFilter === 'Only Capacity Improved') {
      rows = rows.filter(l => l.UtilImpact_B < l.UtilImpact_A);
    } else if (laneDiffFilter === 'Top 50 Cost Impact') {
      rows = [...rows].sort((a, b) => Math.abs(b.Cost_Delta) - Math.abs(a.Cost_Delta)).slice(0, 50);
    } else if (laneDiffFilter === 'Top 100 Cost Impact') {
      rows = [...rows].sort((a, b) => Math.abs(b.Cost_Delta) - Math.abs(a.Cost_Delta)).slice(0, 100);
    }

    if (laneChannelFilter !== 'All Channels') {
      rows = rows.filter(l => l.Channel === laneChannelFilter);
    }
    return rows;
  }, [laneComparison, laneDiffFilter, laneChannelFilter]);

  const handleExportComparisonPack = () => {
    if (!comparison) return;
    const kpiRows = kpiComparisons.map((kpi) => ({
      ComparisonID: comparison.ComparisonID,
      KPI: kpi.label,
      Value_A: kpi.valueA,
      Value_B: kpi.valueB,
      Delta: (kpi.valueB || 0) - (kpi.valueA || 0),
    }));
    const rows = [{
      ComparisonID: comparison.ComparisonID,
      ComparisonName: comparison.ComparisonName,
      ScenarioRunID_A: comparison.ScenarioRunID_A,
      ScenarioRunID_B: comparison.ScenarioRunID_B,
      CostDelta: comparison.CostDelta,
      CostDeltaPct: comparison.CostDeltaPct,
      AvgDaysDelta: comparison.AvgDaysDelta,
      SLABreachDelta: comparison.SLABreachDelta,
      MaxUtilDelta: comparison.MaxUtilDelta,
      SpaceDelta: comparison.SpaceDelta,
      ChangedLaneDelta: comparison.ChangedLaneDelta,
      Status: comparison.Status,
      CreatedAt: comparison.CreatedAt,
      CreatedBy: comparison.CreatedBy,
      DecisionVerdict: comparison.DecisionVerdict || '',
      DecisionReason: comparison.DecisionReason || '',
    }];
    const csv = [toCSV(rows), '', 'KPI Comparison', toCSV(kpiRows)].join('\n');
    downloadBlob(csv, `${comparison.ComparisonID}_comparison_pack.csv`, 'text/csv;charset=utf-8;');
    triggerAction('comparison_export_pack');
  };

  const handleExportLaneDiff = () => {
    const rows = filteredLaneComparison.map((lane) => ({
      ComparisonID: lane.ComparisonID,
      Dest3Zip: lane.Dest3Zip,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      DC_A: lane.DC_A,
      DC_B: lane.DC_B,
      Cost_A: lane.Cost_A,
      Cost_B: lane.Cost_B,
      Cost_Delta: lane.Cost_Delta,
      Days_A: lane.Days_A,
      Days_B: lane.Days_B,
      Days_Delta: lane.Days_Delta,
      UtilImpact_A: lane.UtilImpact_A,
      UtilImpact_B: lane.UtilImpact_B,
      Flags: lane.Flags,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${comparisonId}_lane_diff.csv`, 'text/csv;charset=utf-8;');
    triggerAction('comparison_export_lane');
  };

  const handleExportDCDiff = () => {
    const rows = dcComparison.map((dc) => ({
      ComparisonID: dc.ComparisonID,
      DCName: dc.DCName,
      Cost_A: dc.Cost_A,
      Cost_B: dc.Cost_B,
      Cost_Delta: dc.Cost_Delta,
      Util_A: dc.Util_A,
      Util_B: dc.Util_B,
      Util_Delta: dc.Util_Delta,
      Space_A: dc.Space_A,
      Space_B: dc.Space_B,
      Space_Delta: dc.Space_Delta,
      SLABreach_A: dc.SLABreach_A,
      SLABreach_B: dc.SLABreach_B,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${comparisonId}_dc_diff.csv`, 'text/csv;charset=utf-8;');
    triggerAction('comparison_export_dc');
  };

  const handleSaveDecision = () => {
    if (decisionVerdict.trim()) {
      onAddDecision(comparisonId, decisionVerdict, decisionReason);
      triggerAction('comparison_decision');
    }
    setShowDecisionModal(false);
  };

  const handlePublishComparison = () => {
    onPublishComparison(comparisonId);
    triggerAction('comparison_publish');
  };

  const dcComparisonColumns = createComparisonDcColumns();
  const laneComparisonColumns = createComparisonLaneColumns();

  const kpiComparisons = [
    { label: 'Total Cost', valueA: scenarioA?.TotalCost || 0, valueB: scenarioB?.TotalCost || 0, format: 'currency' as const },
    { label: 'Cost per Unit', valueA: scenarioA?.CostPerUnit || 0, valueB: scenarioB?.CostPerUnit || 0, format: 'decimal' as const },
    { label: 'Avg Days', valueA: scenarioA?.AvgDeliveryDays || 0, valueB: scenarioB?.AvgDeliveryDays || 0, format: 'decimal' as const },
    { label: 'SLA Breach %', valueA: scenarioA?.SLABreachPct || 0, valueB: scenarioB?.SLABreachPct || 0, format: 'decimal' as const },
    { label: 'Excluded SLA', valueA: scenarioA?.ExcludedBySLACount || 0, valueB: scenarioB?.ExcludedBySLACount || 0, format: 'number' as const },
    { label: 'Max Util %', valueA: scenarioA?.MaxUtilPct || 0, valueB: scenarioB?.MaxUtilPct || 0, format: 'number' as const },
    { label: 'Total Space', valueA: scenarioA?.TotalSpaceRequired || 0, valueB: scenarioB?.TotalSpaceRequired || 0, format: 'number' as const },
    { label: 'Space Core', valueA: scenarioA?.SpaceCore || 0, valueB: scenarioB?.SpaceCore || 0, format: 'number' as const },
    { label: 'Space BCV', valueA: scenarioA?.SpaceBCV || 0, valueB: scenarioB?.SpaceBCV || 0, format: 'number' as const },
    { label: 'Overrides', valueA: scenarioA?.OverrideCount || 0, valueB: scenarioB?.OverrideCount || 0, format: 'number' as const },
    { label: 'Changed Lanes', valueA: scenarioA?.ChangedLaneCountVsBaseline || 0, valueB: scenarioB?.ChangedLaneCountVsBaseline || 0, format: 'number' as const },
  ];

  const formatValue = (val: number, format: 'currency' | 'decimal' | 'number'): string => {
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      case 'decimal':
        return val.toFixed(2);
      default:
        return val.toLocaleString('en-US');
    }
  };

  return {
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
  };
};
