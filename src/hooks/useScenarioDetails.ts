import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [laneZipSearch, setLaneZipSearch] = useState('');
  const [laneChannelFilter, setLaneChannelFilter] = useState('All');
  const [laneTermsFilter, setLaneTermsFilter] = useState('All');
  const [laneFlagFilter, setLaneFlagFilter] = useState('All');
  const [appliedLaneZipSearch, setAppliedLaneZipSearch] = useState('');
  const [appliedLaneChannelFilter, setAppliedLaneChannelFilter] = useState('All');
  const [appliedLaneTermsFilter, setAppliedLaneTermsFilter] = useState('All');
  const [appliedLaneFlagFilter, setAppliedLaneFlagFilter] = useState('All');
  const [isLaneFiltering, setIsLaneFiltering] = useState(false);
  const laneFilteringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = useMemo(
    () => scenarioRunHeaders.find((s) => s.ScenarioRunID === scenarioId),
    [scenarioId, scenarioRunHeaders],
  );
  const formatDcDisplayName = useCallback((value: unknown) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' ');
  }, []);
  const normalizeLaneDisplay = useCallback((lane: ScenarioRunResultsLane): ScenarioRunResultsLane => ({
    ...lane,
    AssignedDC: formatDcDisplayName(lane.AssignedDC),
    CostingWarehouse: formatDcDisplayName(lane.CostingWarehouse),
    DefaultShipFrom: formatDcDisplayName(lane.DefaultShipFrom),
  }), [formatDcDisplayName]);
  const normalizeDcDisplay = useCallback((dc: ScenarioRunResultsDC): ScenarioRunResultsDC => ({
    ...dc,
    DCName: formatDcDisplayName(dc.DCName),
  }), [formatDcDisplayName]);
  const entityLabels = useMemo(() => {
    // Derive labels from the CURRENT scenario's EntityScope only.
    // EntityScope is typically "Core", "Core/BCV", or "BCV/Core+BCV" etc.
    // We split on '/' and normalise so the Core-side always maps to SpaceCore
    // and the BCV-side always maps to SpaceBCV, regardless of insertion order.
    const scopeRaw = scenario?.EntityScope ?? '';
    const parts = scopeRaw
      .split('/')
      .map((e) => e.trim())
      .filter((e) => e && e.toLowerCase() !== 'unknown' && e.toLowerCase() !== 'na');

    // Prefer the part that does NOT contain 'bcv' for the core label
    const coreLabel = parts.find((p) => !p.toLowerCase().includes('bcv')) ?? parts[0] ?? 'Core';
    const bcvLabel  = parts.find((p) =>  p.toLowerCase().includes('bcv')) ?? parts[1] ?? 'BCV';

    return { first: coreLabel, second: bcvLabel };
  }, [scenario]);

  const scenarioConfig = useMemo(
    () => scenarioRunConfigs.find((c) => c.ScenarioRunID === scenarioId),
    [scenarioId, scenarioRunConfigs],
  );
  const dcResults = useMemo(() => Array.from(
    scenarioRunResultsDC
      .filter((dc) => dc.ScenarioRunID === scenarioId)
      .reduce<Map<string, ScenarioRunResultsDC>>((acc, row) => {
        if (!acc.has(row.DCName)) acc.set(row.DCName, row);
        return acc;
      }, new Map())
      .values(),
  ).map(normalizeDcDisplay), [normalizeDcDisplay, scenarioId, scenarioRunResultsDC]);

  useEffect(() => {
    const shouldTrace = String(import.meta.env.VITE_ENABLE_DATA_TRACE ?? 'true').toLowerCase() !== 'false';
    if (!shouldTrace || !scenario) return;
    const isBaselineTrace =
      String(scenario.DataflowID || '') === '3267' ||
      String(scenario.ScenarioType || '').toLowerCase().includes('baseline');
    if (!isBaselineTrace) return;
    console.groupCollapsed(`[Scenario Details DC Source] scorecard/capacity rows selected: ${scenarioId}`);
    console.log('header used by details page', {
      ScenarioRunID: scenario.ScenarioRunID,
      RunName: scenario.RunName,
      DataflowID: scenario.DataflowID,
      Region: scenario.Region,
      ScenarioType: scenario.ScenarioType,
      TotalCost: scenario.TotalCost,
      TotalSpaceRequired: scenario.TotalSpaceRequired,
      SpaceCore: scenario.SpaceCore,
      SpaceBCV: scenario.SpaceBCV,
      MaxUtilPct: scenario.MaxUtilPct,
    });
    console.log('raw props counts', {
      allDcRowsProp: scenarioRunResultsDC.length,
      matchingScenarioRowsBeforeDedupe: scenarioRunResultsDC.filter((dc) => dc.ScenarioRunID === scenarioId).length,
      dcRowsAfterDedupeAndDisplayNormalize: dcResults.length,
    });
    console.table(dcResults.map((dc) => ({
      DCName: dc.DCName,
      TotalCost: dc.TotalCost,
      VolumeUnits: dc.VolumeUnits,
      AvgDays: dc.AvgDays,
      AvgTransitDays: dc.AvgTransitDays ?? 'NA',
      UtilPct: dc.UtilPct,
      ActualSpace: dc.ActualSpace ?? 'NA',
      SpaceRequired: dc.SpaceRequired,
      SpaceCore: dc.SpaceCore,
      SpaceBCV: dc.SpaceBCV,
      SLABreachCount: dc.SLABreachCount,
      SLABreachPct: (dc as { SLABreachPct?: number | null }).SLABreachPct ?? 'NA',
      IsSuppressed: dc.IsSuppressed,
    })));
    console.groupEnd();
  }, [dcResults, scenario, scenarioId, scenarioRunResultsDC]);
  const laneGroupKey = useCallback((lane: ScenarioRunResultsLane) => [
    lane.Dest3Zip,
    lane.Channel,
    lane.Terms,
    lane.DestState,
    lane.ScenarioType,
  ]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('|'), []);

  const laneOptionSort = useCallback((a: ScenarioRunResultsLane, b: ScenarioRunResultsLane) => {
    const cpuA = a.CostPerUnit ?? a.LaneCost ?? 0;
    const cpuB = b.CostPerUnit ?? b.LaneCost ?? 0;
    if (cpuA !== cpuB) return cpuA - cpuB;
    const warehouseA = `${a.CostingWarehouse || a.AssignedDC || ''}|${a.DefaultShipFrom || ''}`;
    const warehouseB = `${b.CostingWarehouse || b.AssignedDC || ''}|${b.DefaultShipFrom || ''}`;
    const warehouseCompare = warehouseA.localeCompare(warehouseB);
    if (warehouseCompare !== 0) return warehouseCompare;
    return String(a.Dest3Zip || '').localeCompare(String(b.Dest3Zip || ''));
  }, []);

  const formatOptionDc = (lane: ScenarioRunResultsLane) => {
    const warehouse = lane.CostingWarehouse || lane.AssignedDC || 'NA';
    return `${warehouse}`;
  };

  const laneResults = useMemo(() => scenarioRunResultsLanes
    .filter((lane) => lane.ScenarioRunID === scenarioId)
    .slice()
    .sort((a, b) => laneGroupKey(a).localeCompare(laneGroupKey(b)) || laneOptionSort(a, b)),
  [laneGroupKey, laneOptionSort, scenarioId, scenarioRunResultsLanes]);

  const uniqueLaneResults = useMemo(() => laneResults.filter((lane, index, rows) =>
    rows.findIndex((item) => laneGroupKey(item) === laneGroupKey(lane)) === index,
  ), [laneGroupKey, laneResults]);

  const normalizedUniqueLaneResults = useMemo(
    () => uniqueLaneResults.map(normalizeLaneDisplay),
    [normalizeLaneDisplay, uniqueLaneResults],
  );

  const overrides = useMemo(
    () => scenarioOverrides.filter((o) => o.ScenarioRunID === scenarioId),
    [scenarioId, scenarioOverrides],
  );

  const visibleLaneResults = useMemo(
    () => normalizedUniqueLaneResults,
    [normalizedUniqueLaneResults],
  );

  const laneOptions: ScenarioLaneOption[] = useMemo(() => visibleLaneResults.map((lane) => {
    const key = laneGroupKey(lane);
    const costPerUnit = typeof lane.CostPerUnit === 'number'
      ? lane.CostPerUnit
      : (lane.TotalCost ?? lane.LaneCost);
    return {
      key,
      label: `${lane.Dest3Zip} | ${lane.Channel} | ${lane.Terms} | ${lane.CostingWarehouse || lane.AssignedDC} | $${Number(costPerUnit || 0).toFixed(2)}`,
      lane,
    };
  }), [laneGroupKey, visibleLaneResults]);

  const lanesByDC = useMemo(() => visibleLaneResults.reduce<Record<string, number>>((acc, lane) => {
    acc[lane.AssignedDC] = (acc[lane.AssignedDC] || 0) + 1;
    return acc;
  }, {}), [visibleLaneResults]);

  const baselineScenario = useMemo(() => {
    if (!scenario) return null;
    const candidates = scenarioRunHeaders.filter(
      (s) => s.Region === scenario.Region
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
  }, [scenario, scenarioRunHeaders]);

  const baselineScenarioId = baselineScenario?.ScenarioRunID;
  const canShowDifference = Boolean(baselineScenarioId && baselineScenarioId !== scenarioId);
  const baselineDcResults = useMemo(() => Array.from(
    (baselineScenarioId ? scenarioRunResultsDC.filter((dc) => dc.ScenarioRunID === baselineScenarioId) : [])
      .reduce<Map<string, ScenarioRunResultsDC>>((acc, row) => {
        if (!acc.has(row.DCName)) acc.set(row.DCName, row);
        return acc;
      }, new Map())
      .values(),
  ).map(normalizeDcDisplay), [baselineScenarioId, normalizeDcDisplay, scenarioRunResultsDC]);

  const baselineLaneResults = useMemo(() => (baselineScenarioId
    ? scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === baselineScenarioId)
    : []), [baselineScenarioId, scenarioRunResultsLanes]);

  const uniqueBaselineLaneResults = useMemo(() => {
    const sorted = [...baselineLaneResults].sort((a, b) => laneGroupKey(a).localeCompare(laneGroupKey(b)) || laneOptionSort(a, b));
    return sorted.filter((lane, index, rows) =>
      rows.findIndex((item) => laneGroupKey(item) === laneGroupKey(lane)) === index,
    );
  }, [baselineLaneResults, laneGroupKey, laneOptionSort]);

  const visibleBaselineLaneResults = useMemo(
    () => uniqueBaselineLaneResults.map(normalizeLaneDisplay),
    [normalizeLaneDisplay, uniqueBaselineLaneResults],
  );

  const baselineLanesByDC = useMemo(() => visibleBaselineLaneResults.reduce<Record<string, number>>((acc, lane) => {
    acc[lane.AssignedDC] = (acc[lane.AssignedDC] || 0) + 1;
    return acc;
  }, {}), [visibleBaselineLaneResults]);

  const channelOptions = useMemo(
    () => Array.from(new Set(visibleLaneResults.map((lane) => lane.Channel))).sort(),
    [visibleLaneResults],
  );
  const termsOptions = useMemo(
    () => Array.from(new Set(visibleLaneResults.map((lane) => lane.Terms))).sort(),
    [visibleLaneResults],
  );
  const normalizedLaneZipSearch = useMemo(() => appliedLaneZipSearch.trim().toLowerCase(), [appliedLaneZipSearch]);

  const filteredLanes = useMemo(() => visibleLaneResults.filter((lane) => {
    if (
      normalizedLaneZipSearch &&
      String(lane.Dest3Zip || '').trim().toLowerCase() !== normalizedLaneZipSearch
    ) {
      return false;
    }
    if (appliedLaneChannelFilter !== 'All' && lane.Channel !== appliedLaneChannelFilter) return false;
    if (appliedLaneTermsFilter !== 'All' && lane.Terms !== appliedLaneTermsFilter) return false;
    if (appliedLaneFlagFilter === 'SLA Breaches Only') return lane.SLABreachFlag === 'Y';
    if (appliedLaneFlagFilter === 'Excluded by SLA') return lane.ExcludedBySLAFlag === 'Y';
    if (appliedLaneFlagFilter === 'Overrides Only') return lane.OverrideAppliedFlag === 'Y';
    if (appliedLaneFlagFilter === 'Flagged Lanes') return lane.NotesFlag === 'Y';
    return true;
  }), [
    appliedLaneChannelFilter,
    appliedLaneFlagFilter,
    appliedLaneTermsFilter,
    normalizedLaneZipSearch,
    visibleLaneResults,
  ]);

  const networkLaneEntries = useMemo(() => {
    if (networkView === 'difference') {
      const dcs = new Set([...Object.keys(lanesByDC), ...Object.keys(baselineLanesByDC)]);
      return Array.from(dcs).map((dc) => ({
        dc,
        count: (lanesByDC[dc] || 0) - (baselineLanesByDC[dc] || 0),
      }));
    }
    const source = networkView === 'baseline' ? baselineLanesByDC : lanesByDC;
    return Object.entries(source).map(([dc, count]) => ({ dc, count }));
  }, [baselineLanesByDC, lanesByDC, networkView]);

  const networkDcVolumeRowsDiff = useMemo(() => {
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
  }, [baselineDcResults, dcResults]);

  const networkDcVolumeRowsBase = useMemo(() => {
    const source = networkView === 'baseline' ? baselineDcResults : dcResults;
    return source.filter((dc) => dc.IsSuppressed === 'N').map((dc) => ({ dcName: dc.DCName, value: dc.VolumeUnits }));
  }, [baselineDcResults, dcResults, networkView]);

  const networkAvgDaysRowsDiff = useMemo(() => {
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
  }, [baselineDcResults, dcResults]);

  const networkAvgDaysRowsBase = useMemo(() => {
    const source = networkView === 'baseline' ? baselineDcResults : dcResults;
    return source.filter((dc) => dc.IsSuppressed === 'N').map((dc) => ({ dcName: dc.DCName, value: dc.AvgDays }));
  }, [baselineDcResults, dcResults, networkView]);

  const topFootprintLanes = useMemo(
    () => [...visibleLaneResults].sort((a, b) => b.FootprintContribution - a.FootprintContribution).slice(0, 5),
    [visibleLaneResults],
  );

  const scheduleExport = useCallback((actionKey: string, build: () => void) => {
    triggerAction(actionKey);
    window.requestAnimationFrame(() => {
      build();
    });
  }, [triggerAction]);

  useEffect(() => {
    if (laneFilteringTimerRef.current) {
      clearTimeout(laneFilteringTimerRef.current);
      laneFilteringTimerRef.current = null;
    }
    setIsLaneFiltering(true);
    laneFilteringTimerRef.current = setTimeout(() => {
      setAppliedLaneZipSearch(laneZipSearch);
      setAppliedLaneChannelFilter(laneChannelFilter);
      setAppliedLaneTermsFilter(laneTermsFilter);
      setAppliedLaneFlagFilter(laneFlagFilter);
      setIsLaneFiltering(false);
      laneFilteringTimerRef.current = null;
    }, 120);

    return () => {
      if (laneFilteringTimerRef.current) {
        clearTimeout(laneFilteringTimerRef.current);
        laneFilteringTimerRef.current = null;
      }
    };
  }, [laneZipSearch, laneChannelFilter, laneTermsFilter, laneFlagFilter]);

  const handleExportDCDetails = () => {
    if (!scenario) return;
    scheduleExport('scenario_export_dc_details', () => {
      const rows = dcResults.map((dc) => ({
        ScenarioRunID: dc.ScenarioRunID,
        DC: dc.DCName,
        dcEntity: scenario.EntityScope,
        dcRegion: scenario.Region,
        scenarioType: scenario.ScenarioType,
        totalCost: dc.TotalCost,
        costPerUnit: dc.VolumeUnits > 0 ? Number((dc.TotalCost / dc.VolumeUnits).toFixed(2)) : 0,
        averageDeliveryDays: Number(dc.AvgDays.toFixed(2)),
        averageTransitDays: dc.AvgTransitDays == null ? '' : Number(dc.AvgTransitDays.toFixed(2)),
        maxUtilization: Number(dc.UtilPct.toFixed(2)),
        actualSpace: dc.ActualSpace ?? '',
        coreSpace: dc.SpaceCore,
        bcvSpace: dc.SpaceBCV,
        spaceRequired: dc.SpaceRequired,
        overcapFlag: dc.OvercapFlag ?? '',
        sqft: dc.SpaceCore,
        slaBreach: dc.SLABreachCount,
        'slaBreach%': (() => {
          const typedDc = dc as { SLABreachPct?: number | null; SLABreachCount: number; VolumeUnits: number };
          const breachPct =
            typedDc.SLABreachPct ??
            (typedDc.VolumeUnits > 0 ? (typedDc.SLABreachCount / typedDc.VolumeUnits) * 100 : null);
          return breachPct == null ? '' : Number(breachPct.toFixed(2));
        })(),
        totalcount: dc.VolumeUnits,
      }));
      const csv = toCSV(rows);
      downloadBlob(csv, `${scenario.ScenarioRunID}_dc_details.csv`, 'text/csv;charset=utf-8;');
    });
  };

  const handleExportRoutingCSV = () => {
    scheduleExport('scenario_export_routing', () => {
      const rows = visibleLaneResults.map((lane) => ({
        ScenarioRunID: lane.ScenarioRunID,
        Dest3Zip: lane.Dest3Zip,
        DestState: lane.DestState,
        Channel: lane.Channel,
        Terms: lane.Terms,

        AssignedDC: lane.AssignedDC,
        CostRank: lane.CostRank ?? '',
        LaneCost: lane.LaneCost,
        CostPerUnit: lane.CostPerUnit ?? '',
        DeliveryDays: lane.DeliveryDays,
        AvgDeliveryDays: lane.AvgDeliveryDays ?? '',
        AvgTransitDays: lane.AvgTransitDays ?? '',
        TotalUnits: lane.TotalUnits ?? lane.TotalCount ?? lane.VolumeUnits ?? '',
        SLABreachFlag: lane.SLABreachFlag,
        ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
        ScenarioType: lane.ScenarioType || '',
        RunName: lane.RunName || '',
        CostingWarehouse: lane.CostingWarehouse || '',
        DefaultShipFrom: lane.DefaultShipFrom || '',
        InboundSpend: lane.InboundSpend ?? '',
        ParcelSpend: lane.ParcelSpend ?? '',
        LtlSpend: lane.LtlSpend ?? '',
        TotalCost: lane.TotalCost ?? lane.LaneCost,
        WorkingCapacity: lane.WorkingCapacity ?? '',
        DistributionCost: lane.DistributionCost ?? '',
        TlSpend: lane.TlSpend ?? '',
        BreachFlag: lane.BreachFlag || '',
        OrderToDeliverCalendarDays: lane.OrderToDeliverCalendarDays ?? '',
        ShipToDeliverCalendarDays: lane.ShipToDeliverCalendarDays ?? '',
        State: lane.State || '',

        Threshold: lane.Threshold ?? '',
      }));
      const csv = toCSV(rows);
      downloadBlob(csv, `${scenarioId}_lane_table.csv`, 'text/csv;charset=utf-8;');
    });
  };

  const handleExportLaneCSV = () => {
    scheduleExport('scenario_export_lane', () => {
      const rows = visibleLaneResults.map((lane) => ({
        ScenarioRunID: lane.ScenarioRunID,
        Dest3Zip: lane.Dest3Zip,
        DestState: lane.DestState,
        Channel: lane.Channel,
        Terms: lane.Terms,

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
        AvgDeliveryDays: lane.AvgDeliveryDays ?? '',
        AvgTransitDays: lane.AvgTransitDays ?? '',
        TotalUnits: lane.TotalUnits ?? lane.TotalCount ?? lane.VolumeUnits ?? '',
        OvercapFlag: lane.OvercapFlag ?? '',
        SLABreachFlag: lane.SLABreachFlag,
        ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
        FootprintContribution: lane.FootprintContribution,
        UtilImpactPct: lane.UtilImpactPct,
        OverrideAppliedFlag: lane.OverrideAppliedFlag,
        OverrideVersion: lane.OverrideVersion,
        NotesFlag: lane.NotesFlag,
        ScenarioType: lane.ScenarioType || '',
        RunName: lane.RunName || '',
        CostingWarehouse: lane.CostingWarehouse || '',
        DefaultShipFrom: lane.DefaultShipFrom || '',
        InboundSpend: lane.InboundSpend ?? '',
        ParcelSpend: lane.ParcelSpend ?? '',
        LtlSpend: lane.LtlSpend ?? '',
        TotalCost: lane.TotalCost ?? lane.LaneCost,
        CostRank: lane.CostRank ?? '',
        CostPerUnit: lane.CostPerUnit ?? '',
        WorkingCapacity: lane.WorkingCapacity ?? '',
        DistributionCost: lane.DistributionCost ?? '',
        TlSpend: lane.TlSpend ?? '',
        BreachFlag: lane.BreachFlag || '',
        OrderToDeliverCalendarDays: lane.OrderToDeliverCalendarDays ?? '',
        ShipToDeliverCalendarDays: lane.ShipToDeliverCalendarDays ?? '',
        State: lane.State || '',

        Threshold: lane.Threshold ?? '',
        SourceDatasetId: lane.SourceDatasetId || '',
      }));
      const csv = toCSV(rows);
      downloadBlob(csv, `${scenarioId}_routing_assignments.csv`, 'text/csv;charset=utf-8;');
    });
  };

  const handleExportExceptionsCSV = () => {
    scheduleExport('scenario_export_exceptions', () => {
      const rows = visibleLaneResults
        .filter((l) => l.SLABreachFlag === 'Y' || l.ExcludedBySLAFlag === 'Y' || l.OverrideAppliedFlag === 'Y')
        .map((lane) => ({
          ScenarioRunID: lane.ScenarioRunID,
          Dest3Zip: lane.Dest3Zip,
          DestState: lane.DestState,
          Channel: lane.Channel,
          Terms: lane.Terms,

          AssignedDC: lane.AssignedDC,
          CostPerUnit: lane.CostPerUnit ?? '',
          OvercapFlag: lane.OvercapFlag ?? '',
          SLABreachFlag: lane.SLABreachFlag,
          ExcludedBySLAFlag: lane.ExcludedBySLAFlag,
          OverrideAppliedFlag: lane.OverrideAppliedFlag,
          OverrideVersion: lane.OverrideVersion,
          NotesFlag: lane.NotesFlag,
          ScenarioType: lane.ScenarioType || '',
          RunName: lane.RunName || '',
          CostingWarehouse: lane.CostingWarehouse || '',
          DefaultShipFrom: lane.DefaultShipFrom || '',
          InboundSpend: lane.InboundSpend ?? '',
          ParcelSpend: lane.ParcelSpend ?? '',
          LtlSpend: lane.LtlSpend ?? '',
          TotalCost: lane.TotalCost ?? lane.LaneCost,
          WorkingCapacity: lane.WorkingCapacity ?? '',
          DistributionCost: lane.DistributionCost ?? '',
          TlSpend: lane.TlSpend ?? '',
          BreachFlag: lane.BreachFlag || '',
          OrderToDeliverCalendarDays: lane.OrderToDeliverCalendarDays ?? '',
          ShipToDeliverCalendarDays: lane.ShipToDeliverCalendarDays ?? '',
          State: lane.State || '',

          Threshold: lane.Threshold ?? '',
        }));
      const csv = toCSV(rows);
      downloadBlob(csv, `${scenarioId}_exceptions.csv`, 'text/csv;charset=utf-8;');
    });
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
    laneResults: visibleLaneResults,
    overrides,
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
    handleExportDCDetails,
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
