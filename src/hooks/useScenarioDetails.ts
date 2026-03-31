import { useMemo, useState } from 'react';
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  ScenarioOverride,
} from '@/data';
import { downloadBlob, toCSV, useActionFeedback } from '@/utils';
import { createScenarioDcColumns, createScenarioLaneColumns, createScenarioRankedOptionsColumns } from '@/lib';
import { ScenarioLaneOption } from '@/components/modals';

interface UseScenarioDetailsParams {
  scenarioId: string;
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

export const useScenarioDetails = ({
  scenarioId,
  scenarioRunHeaders,
  scenarioRunConfigs,
  scenarioRunResultsDC,
  scenarioRunResultsLanes,
  scenarioOverrides,
  onDuplicateScenario,
  onPublishScenario,
  onApproveScenario,
  onArchiveScenario,
  onAddComment,
  onApplyOverride,
}: UseScenarioDetailsParams) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedLane, setSelectedLane] = useState<ScenarioRunResultsLane | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [overrideLaneKey, setOverrideLaneKey] = useState('');
  const [overrideNewDC, setOverrideNewDC] = useState('');
  const [overrideReason, setOverrideReason] = useState<ScenarioOverride['ReasonCode']>('Capacity');
  const [overrideComment, setOverrideComment] = useState('');
  const [networkView, setNetworkView] = useState<'current' | 'baseline' | 'difference'>('current');
  const [laneChannelFilter, setLaneChannelFilter] = useState('All');
  const [laneTermsFilter, setLaneTermsFilter] = useState('All');
  const [laneFlagFilter, setLaneFlagFilter] = useState('All');

  const scenario = scenarioRunHeaders.find(s => s.ScenarioRunID === scenarioId);
  const entityLabels = useMemo(() => {
    const entities = new Set<string>();
    scenarioRunHeaders.forEach((s) => {
      s.EntityScope?.split('/').forEach((e) => {
        const trimmed = e.trim();
        if (trimmed) entities.add(trimmed);
      });
    });
    const list = Array.from(entities);
    return {
      first: list[0] || 'Entity A',
      second: list[1] || 'Entity B',
    };
  }, [scenarioRunHeaders]);

  const scenarioConfig = scenarioRunConfigs.find(c => c.ScenarioRunID === scenarioId);
  const dcResults = scenarioRunResultsDC.filter(dc => dc.ScenarioRunID === scenarioId);
  const laneResults = scenarioRunResultsLanes.filter(lane => lane.ScenarioRunID === scenarioId);
  const overrides = scenarioOverrides.filter(o => o.ScenarioRunID === scenarioId);

  const laneOptions: ScenarioLaneOption[] = laneResults.map((lane) => {
    const key = `${lane.Dest3Zip}|${lane.Channel}|${lane.Terms}|${lane.CustomerGroup}`;
    return {
      key,
      label: `${lane.Dest3Zip} ${lane.DestState} | ${lane.Channel} ${lane.Terms} | ${lane.CustomerGroup} | ${lane.AssignedDC}`,
      lane,
    };
  });

  const lanesByDC = laneResults.reduce<Record<string, number>>((acc, lane) => {
    acc[lane.AssignedDC] = (acc[lane.AssignedDC] || 0) + 1;
    return acc;
  }, {});

  const baselineScenario = useMemo(() => {
    if (!scenario) return null;
    const candidates = scenarioRunHeaders.filter(
      (s) => s.Region === scenario.Region && s.ScenarioType === 'Baseline'
    );
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort(
      (a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime()
    );
    return sorted[0];
  }, [scenario, scenarioRunHeaders]);

  const baselineScenarioId = baselineScenario?.ScenarioRunID;
  const canShowDifference = Boolean(baselineScenarioId && baselineScenarioId !== scenarioId);
  const baselineDcResults = baselineScenarioId
    ? scenarioRunResultsDC.filter((dc) => dc.ScenarioRunID === baselineScenarioId)
    : [];
  const baselineLaneResults = baselineScenarioId
    ? scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === baselineScenarioId)
    : [];

  const baselineLanesByDC = baselineLaneResults.reduce<Record<string, number>>((acc, lane) => {
    acc[lane.AssignedDC] = (acc[lane.AssignedDC] || 0) + 1;
    return acc;
  }, {});

  const channelOptions = Array.from(new Set(laneResults.map((lane) => lane.Channel))).sort();
  const termsOptions = Array.from(new Set(laneResults.map((lane) => lane.Terms))).sort();

  const filteredLanes = laneResults.filter((lane) => {
    if (laneChannelFilter !== 'All' && lane.Channel !== laneChannelFilter) return false;
    if (laneTermsFilter !== 'All' && lane.Terms !== laneTermsFilter) return false;
    if (laneFlagFilter === 'SLA Breaches Only') return lane.SLABreachFlag === 'Y';
    if (laneFlagFilter === 'Excluded by SLA') return lane.ExcludedBySLAFlag === 'Y';
    if (laneFlagFilter === 'Overrides Only') return lane.OverrideAppliedFlag === 'Y';
    if (laneFlagFilter === 'Flagged Lanes') return lane.NotesFlag === 'Y';
    return true;
  });

  const networkLaneEntries = (() => {
    if (networkView === 'difference') {
      const dcs = new Set([...Object.keys(lanesByDC), ...Object.keys(baselineLanesByDC)]);
      return Array.from(dcs).map((dc) => ({
        dc,
        count: (lanesByDC[dc] || 0) - (baselineLanesByDC[dc] || 0),
      }));
    }
    const source = networkView === 'baseline' ? baselineLanesByDC : lanesByDC;
    return Object.entries(source).map(([dc, count]) => ({ dc, count }));
  })();

  const networkDcVolumeRowsDiff = (() => {
    const dcs = new Set([
      ...dcResults.map((dc) => dc.DCName),
      ...baselineDcResults.map((dc) => dc.DCName),
    ]);
    const rows = Array.from(dcs).map((dcName) => {
      const current = dcResults.find((dc) => dc.DCName === dcName);
      const base = baselineDcResults.find((dc) => dc.DCName === dcName);
      return {
        dcName,
        delta: (current?.VolumeUnits || 0) - (base?.VolumeUnits || 0),
        current,
        base,
      };
    });
    return rows.filter((row) => (row.current?.IsSuppressed ?? 'N') === 'N' || (row.base?.IsSuppressed ?? 'N') === 'N');
  })();

  const networkDcVolumeRowsBase = (() => {
    const source = networkView === 'baseline' ? baselineDcResults : dcResults;
    return source.filter((dc) => dc.IsSuppressed === 'N').map((dc) => ({ dcName: dc.DCName, value: dc.VolumeUnits }));
  })();

  const networkAvgDaysRowsDiff = (() => {
    const dcs = new Set([
      ...dcResults.map((dc) => dc.DCName),
      ...baselineDcResults.map((dc) => dc.DCName),
    ]);
    const rows = Array.from(dcs).map((dcName) => {
      const current = dcResults.find((dc) => dc.DCName === dcName);
      const base = baselineDcResults.find((dc) => dc.DCName === dcName);
      return {
        dcName,
        delta: (current?.AvgDays || 0) - (base?.AvgDays || 0),
        current,
        base,
      };
    });
    return rows.filter((row) => (row.current?.IsSuppressed ?? 'N') === 'N' || (row.base?.IsSuppressed ?? 'N') === 'N');
  })();

  const networkAvgDaysRowsBase = (() => {
    const source = networkView === 'baseline' ? baselineDcResults : dcResults;
    return source.filter((dc) => dc.IsSuppressed === 'N').map((dc) => ({ dcName: dc.DCName, value: dc.AvgDays }));
  })();

  const topFootprintLanes = [...laneResults]
    .sort((a, b) => b.FootprintContribution - a.FootprintContribution)
    .slice(0, 5);

  const handleExportDecisionPack = () => {
    if (!scenario) return;
    const rows = [{
      ScenarioRunID: scenario.ScenarioRunID,
      RunName: scenario.RunName,
      Region: scenario.Region,
      Status: scenario.Status,
      ScenarioType: scenario.ScenarioType,
      TotalCost: scenario.TotalCost,
      CostPerUnit: scenario.CostPerUnit,
      AvgDeliveryDays: scenario.AvgDeliveryDays,
      SLABreachPct: scenario.SLABreachPct,
      MaxUtilPct: scenario.MaxUtilPct,
      TotalSpaceRequired: scenario.TotalSpaceRequired,
      OverrideCount: scenario.OverrideCount,
      LastUpdatedAt: scenario.LastUpdatedAt,
    }];
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenario.ScenarioRunID}_decision_pack.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_decision');
  };

  const handleExportRoutingCSV = () => {
    const rows = laneResults.map((lane) => ({
      ScenarioRunID: lane.ScenarioRunID,
      Dest3Zip: lane.Dest3Zip,
      DestState: lane.DestState,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      AssignedDC: lane.AssignedDC,
      LaneCost: lane.LaneCost,
      DeliveryDays: lane.DeliveryDays,
      SLABreachFlag: lane.SLABreachFlag,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenarioId}_routing_assignments.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_routing');
  };

  const handleExportLaneCSV = () => {
    const rows = laneResults.map((lane) => ({
      ScenarioRunID: lane.ScenarioRunID,
      Dest3Zip: lane.Dest3Zip,
      DestState: lane.DestState,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      AssignedDC: lane.AssignedDC,
      RankedOption1DC: lane.RankedOption1DC,
      RankedOption1Cost: lane.RankedOption1Cost,
      RankedOption1Days: lane.RankedOption1Days,
      RankedOption2DC: lane.RankedOption2DC,
      RankedOption2Cost: lane.RankedOption2Cost,
      RankedOption2Days: lane.RankedOption2Days,
      RankedOption3DC: lane.RankedOption3DC,
      RankedOption3Cost: lane.RankedOption3Cost,
      RankedOption3Days: lane.RankedOption3Days,
      ChosenRank: lane.ChosenRank,
      LaneCost: lane.LaneCost,
      CostDeltaVsBest: lane.CostDeltaVsBest,
      DeliveryDays: lane.DeliveryDays,
      SLABreachFlag: lane.SLABreachFlag,
      ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
      FootprintContribution: lane.FootprintContribution,
      UtilImpactPct: lane.UtilImpactPct,
      OverrideAppliedFlag: lane.OverrideAppliedFlag,
      OverrideVersion: lane.OverrideVersion,
      NotesFlag: lane.NotesFlag,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenarioId}_lane_table.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_lane');
  };

  const handleExportExceptionsCSV = () => {
    const rows = laneResults
      .filter(l => l.SLABreachFlag === 'Y' || l.ExcludedBySLAFlag === 'Y' || l.OverrideAppliedFlag === 'Y')
      .map((lane) => ({
        ScenarioRunID: lane.ScenarioRunID,
        Dest3Zip: lane.Dest3Zip,
        DestState: lane.DestState,
        Channel: lane.Channel,
        Terms: lane.Terms,
        CustomerGroup: lane.CustomerGroup,
        AssignedDC: lane.AssignedDC,
        SLABreachFlag: lane.SLABreachFlag,
        ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
        OverrideAppliedFlag: lane.OverrideAppliedFlag,
        OverrideVersion: lane.OverrideVersion,
        NotesFlag: lane.NotesFlag,
      }));
    const csv = toCSV(rows);
    downloadBlob(csv, `${scenarioId}_exceptions.csv`, 'text/csv;charset=utf-8;');
    triggerAction('scenario_export_exceptions');
  };

  const handleSaveComment = () => {
    if (commentText.trim()) {
      onAddComment(scenarioId, commentText.trim());
      triggerAction('scenario_comment_save');
    }
    setCommentText('');
    setShowCommentModal(false);
  };

  const handleApplyOverride = () => {
    const selected = laneOptions.find(l => l.key === overrideLaneKey);
    if (!selected || !overrideNewDC.trim()) return;
    onApplyOverride(scenarioId, {
      Dest3Zip: selected.lane.Dest3Zip,
      Channel: selected.lane.Channel,
      Terms: selected.lane.Terms,
      CustomerGroup: selected.lane.CustomerGroup,
      OldDC: selected.lane.AssignedDC,
      NewDC: overrideNewDC,
      ReasonCode: overrideReason,
      Comment: overrideComment || 'Override applied',
    });
    setOverrideLaneKey('');
    setOverrideNewDC('');
    setOverrideReason('Capacity');
    setOverrideComment('');
    setShowOverrideModal(false);
  };

  return {
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
    handleDuplicateScenario: () => {
      onDuplicateScenario(scenarioId);
      triggerAction('scenario_duplicate');
    },
    handlePublishScenario: () => {
      onPublishScenario(scenarioId);
      triggerAction('scenario_publish');
    },
    handleApproveScenario: () => {
      onApproveScenario(scenarioId);
      triggerAction('scenario_approve');
    },
    handleArchiveScenario: () => {
      onArchiveScenario(scenarioId);
      triggerAction('scenario_archive');
    },
    dcColumns: createScenarioDcColumns(),
    laneColumns: createScenarioLaneColumns(),
    rankedOptionsColumns: createScenarioRankedOptionsColumns(),
  };
};
