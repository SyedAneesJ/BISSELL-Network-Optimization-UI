import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  ScenarioOverride,
  DomoCostComponentRow,
  DomoSpaceOverrideRow,
  getAdditionalCostsForDc,
} from '@/data';
import { downloadBlob, toCSV, useActionFeedback, normalizeZip3, normalizeWarehouseName } from '@/utils';
import { createScenarioDcColumns, createScenarioLaneColumns, createScenarioRankedOptionsColumns } from '@/lib';
import { ScenarioLaneOption } from '@/components/modals';

interface UseScenarioDetailsParams {
  scenarioId: string;
  scenarioRunHeaders: ScenarioRunHeader[];
  scenarioRunConfigs: ScenarioRunConfig[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  scenarioRunResultsLanes: ScenarioRunResultsLane[];
  scenarioOverrides: ScenarioOverride[];
  costComponentRows?: DomoCostComponentRow[];
  spaceOverrideRows?: DomoSpaceOverrideRow[];
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
  costComponentRows,
  spaceOverrideRows,
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

  const rawScenario = useMemo(
    () => scenarioRunHeaders.find((s) => s.ScenarioRunID === scenarioId),
    [scenarioId, scenarioRunHeaders],
  );

  const isUsBaseline = useMemo(() => {
    if (!rawScenario) return false;
    return (
      rawScenario.Region === 'US' &&
      (rawScenario.ScenarioRunID === 'SR001' ||
        String(rawScenario.ScenarioType || '').toLowerCase().includes('baseline') ||
        String(rawScenario.RunName || '').toLowerCase().includes('baseline'))
    );
  }, [rawScenario]);

  // Broader flag: includes Tactical + Consolidation US scenarios
  const isUsSpaceOverrideScenario = useMemo(() => {
    if (!rawScenario) return false;
    if (rawScenario.Region !== 'US') return false;
    if (isUsBaseline) return true;
    const type = String(rawScenario.ScenarioType || '').toLowerCase();
    const name = String(rawScenario.RunName || '').toLowerCase();
    return (
      type.includes('tactical') ||
      type.includes('consolidation') ||
      name.includes('tactical') ||
      name.includes('consolidation')
    );
  }, [rawScenario, isUsBaseline]);

  const scenario = useMemo(
    () => {
      if (!rawScenario) return undefined;
      if (!isUsSpaceOverrideScenario || !spaceOverrideRows || spaceOverrideRows.length === 0) {
        const totalSpace = rawScenario.TotalSpaceRequired || 0;
        const coreSpace = rawScenario.SpaceCore || 0;
        return {
          ...rawScenario,
          MaxUtilPct: totalSpace > 0 ? Number(((coreSpace / totalSpace) * 100).toFixed(2)) : (rawScenario.MaxUtilPct || 0),
        };
      }
      const activeDcNames = new Set(
        scenarioRunResultsDC
          .filter((dc) => dc.ScenarioRunID === scenarioId && dc.IsSuppressed !== 'Y')
          .map((dc) => normalizeWarehouseName(dc.DCName))
      );
      const matchingOverrides = spaceOverrideRows.filter((r) => activeDcNames.has(normalizeWarehouseName(r.Location)));

      const totalSpaceRequired = matchingOverrides.reduce((sum, r) => sum + r.ContractedSquareFootage, 0);
      const spaceCore = matchingOverrides.reduce((sum, r) => sum + r.WorkingCapacitySqFt, 0);
      return {
        ...rawScenario,
        TotalSpaceRequired: Math.round(totalSpaceRequired),
        SpaceCore: Math.round(spaceCore),
        MaxUtilPct: totalSpaceRequired > 0 ? Number(((spaceCore / totalSpaceRequired) * 100).toFixed(2)) : 0,
      };
    },
    [rawScenario, isUsSpaceOverrideScenario, spaceOverrideRows, scenarioRunResultsDC, scenarioId]
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

  const overriddenLaneResults = useMemo(() => {
    const baselineLaneResults = scenarioRunResultsLanes.filter((lane) => lane.ScenarioRunID === scenarioId);
    
    const shouldTrace = String(import.meta.env.VITE_ENABLE_DATA_TRACE ?? 'true').toLowerCase() !== 'false';
    if (shouldTrace && isUsBaseline) {
      console.log('[Cost Component Override] US Baseline scenario detected:', {
        scenarioId,
        baselineLaneResultsCount: baselineLaneResults.length,
        hasCostComponentRows: Boolean(costComponentRows && costComponentRows.length > 0),
        costComponentRowsCount: costComponentRows?.length ?? 0
      });
    }

    if (!isUsBaseline || !costComponentRows || costComponentRows.length === 0) {
      return baselineLaneResults;
    }
    const lookup = new Map<string, DomoCostComponentRow>();
    costComponentRows.forEach((row) => {
      const key = `${normalizeWarehouseName(row.CostingWarehouse)}|${normalizeZip3(row.Zip3)}|${row.Channel.trim().toLowerCase()}`;
      lookup.set(key, row);
    });

    if (shouldTrace) {
      console.log('[Cost Component Override] First 20 lookup keys in registry:', Array.from(lookup.keys()).slice(0, 20));
      console.log('[Cost Component Override] First 5 raw rows in registry:', costComponentRows.slice(0, 5));
    }

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedKeys = new Set<string>();
    const matchedSample: any[] = [];

    const mapped = baselineLaneResults.map((lane) => {
      const warehouse = lane.CostingWarehouse || lane.AssignedDC || lane.DefaultShipFrom || '';
      const key = `${normalizeWarehouseName(warehouse)}|${normalizeZip3(lane.Dest3Zip)}|${lane.Channel.trim().toLowerCase()}`;
      const match = lookup.get(key);
      if (match) {
        matchedCount++;
        if (matchedSample.length < 3) {
          matchedSample.push({
            key,
            laneWarehouse: warehouse,
            laneDest3Zip: lane.Dest3Zip,
            laneChannel: lane.Channel,
            overrideInbound: match.InboundSpend,
            overrideDist: match.DistributionCost,
            overrideParcel: match.ParcelSpend,
            overrideLtl: match.LtlSpend,
            overrideTl: match.TlSpend
          });
        }
        return {
          ...lane,
          InboundSpend: match.InboundSpend,
          DistributionCost: match.DistributionCost,
          ParcelSpend: match.ParcelSpend,
          LtlSpend: match.LtlSpend,
          TlSpend: match.TlSpend,
        };
      }
      unmatchedCount++;
      unmatchedKeys.add(key);
      return lane;
    });

    if (shouldTrace) {
      console.groupCollapsed(`[Cost Component Override Trace] Matches for scenario: ${scenarioId}`);
      console.log('Summary stats:', {
        totalLanes: baselineLaneResults.length,
        matchedCount,
        unmatchedCount,
        lookupSize: lookup.size
      });
      console.log('Sample matches:', matchedSample);
      if (unmatchedKeys.size > 0) {
        console.log('Sample unmatched keys:', Array.from(unmatchedKeys).slice(0, 10));
      }
      console.groupEnd();
    }

    return mapped;
  }, [scenarioRunResultsLanes, scenarioId, isUsBaseline, costComponentRows]);

  const dcResults = useMemo(() => {
    const standardDcRows = Array.from(
      scenarioRunResultsDC
        .filter((dc) => dc.ScenarioRunID === scenarioId)
        .reduce<Map<string, ScenarioRunResultsDC>>((acc, row) => {
          if (!acc.has(row.DCName)) acc.set(row.DCName, row);
          return acc;
        }, new Map())
        .values()
    ).map(normalizeDcDisplay);

    const compTotalsByDc = new Map<string, {
      inbound: number;
      parcel: number;
      ltl: number;
      tl: number;
      dist: number;
    }>();

    if (isUsBaseline && costComponentRows && costComponentRows.length > 0) {
      // Option 2: Direct dataset aggregation filtered by channel and zip search
      const filteredCostComponentRows = costComponentRows.filter((row) => {
        if (appliedLaneChannelFilter !== 'All') {
          if (row.Channel.trim().toLowerCase() !== appliedLaneChannelFilter.trim().toLowerCase()) {
            return false;
          }
        }
        if (appliedLaneZipSearch) {
          const cleanSearch = appliedLaneZipSearch.trim().toLowerCase();
          const rowZip = normalizeZip3(row.Zip3);
          if (!rowZip.includes(cleanSearch)) {
            return false;
          }
        }
        return true;
      });

      filteredCostComponentRows.forEach((row) => {
        const norm = normalizeWarehouseName(row.CostingWarehouse);
        let dcName = formatDcDisplayName(row.CostingWarehouse);
        if (norm === 'virginia') {
          dcName = 'R Virginia';
        } else if (norm === 'dallas') {
          dcName = 'Dallas';
        } else if (norm === 'elwood') {
          dcName = 'Elwood';
        } else if (norm === 'losangeles') {
          dcName = 'Los Angeles';
        }
        
        const existing = compTotalsByDc.get(dcName) || { inbound: 0, parcel: 0, ltl: 0, tl: 0, dist: 0 };
        existing.inbound += Number(row.InboundSpend ?? 0);
        existing.parcel += Number(row.ParcelSpend ?? 0);
        existing.ltl += Number(row.LtlSpend ?? 0);
        existing.tl += Number(row.TlSpend ?? 0);
        existing.dist += Number(row.DistributionCost ?? 0);
        compTotalsByDc.set(dcName, existing);
      });
    } else {
      // Default lane-level aggregation (original logic preserved)
      overriddenLaneResults.forEach((lane) => {
        const dcName = formatDcDisplayName(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom);
        if (!dcName) return;
        const existing = compTotalsByDc.get(dcName) || { inbound: 0, parcel: 0, ltl: 0, tl: 0, dist: 0 };
        existing.inbound += Number(lane.InboundSpend ?? 0);
        existing.parcel += Number(lane.ParcelSpend ?? 0);
        existing.ltl += Number(lane.LtlSpend ?? 0);
        existing.tl += Number(lane.TlSpend ?? 0);
        existing.dist += Number(lane.DistributionCost ?? 0);
        compTotalsByDc.set(dcName, existing);
      });
    }

    const spaceLookup = new Map<string, DomoSpaceOverrideRow>();
    if (isUsSpaceOverrideScenario && spaceOverrideRows && spaceOverrideRows.length > 0) {
      spaceOverrideRows.forEach((row) => {
        spaceLookup.set(normalizeWarehouseName(row.Location), row);
      });
    }

    return standardDcRows.map((dc) => {
      const totals = compTotalsByDc.get(dc.DCName);
      const spaceOverride = spaceLookup.get(normalizeWarehouseName(dc.DCName));
      // ActualSpace + SpaceCore always come from the dataset for all US scenario types.
      // UtilPct + SpaceRequired are only overridden for Baseline (uses dataset pallet utilization);
      // Tactical/Consolidation keep their engine-computed SpaceRequired and recalculate UtilPct to match overridden ActualSpace.
      const spaceFields = spaceOverride ? {
        ActualSpace: spaceOverride.ContractedSquareFootage,
        SpaceCore: spaceOverride.WorkingCapacitySqFt,
        ...(isUsBaseline ? {
          UtilPct: Number((spaceOverride.PalletUtilization * 100).toFixed(2)),
          SpaceRequired: Number((spaceOverride.ContractedSquareFootage * spaceOverride.PalletUtilization).toFixed(2)),
        } : {
          UtilPct: spaceOverride.ContractedSquareFootage > 0
            ? Number(((dc.SpaceRequired / spaceOverride.ContractedSquareFootage) * 100).toFixed(2))
            : 0,
        }),
      } : {};

      if (isUsBaseline && spaceOverride) {
        const extPrice = spaceOverride.TotalExtendedPrice || 0;
        const totCost = spaceOverride.TotalCost ?? dc.TotalCost;
        const ibf = spaceOverride.InboundSpend ?? 0;
        const dst = spaceOverride.DistributionCost ?? 0;
        const parcel = spaceOverride.ParcelSpend ?? 0;
        const tl = spaceOverride.TlSpend ?? 0;
        const ltl = spaceOverride.LtlSpend ?? 0;

        return {
          ...dc,
          TotalCost: totCost,
          VolumeUnits: spaceOverride.VolumeUnits ?? dc.VolumeUnits,
          InboundSpend: ibf,
          ParcelSpend: parcel,
          LtlSpend: ltl,
          TlSpend: tl,
          DistributionCost: dst,
          Rent: spaceOverride.Rent ?? 0,
          ContractLabor: spaceOverride.ContractLabor ?? 0,
          ManagementFee: spaceOverride.ManagementFee ?? 0,
          ...spaceFields,
          // Optional percentage and CPU fields
          PctToTotalSales: extPrice > 0 ? (totCost / extPrice) * 100 : 0,
          IbfPctOfRevenue: extPrice > 0 ? (ibf / extPrice) * 100 : 0,
          DstPctRevenue: extPrice > 0 ? (dst / extPrice) * 100 : 0,
          ObParcelPctRevenue: extPrice > 0 ? (parcel / extPrice) * 100 : 0,
          ObTlPctRevenue: extPrice > 0 ? (tl / extPrice) * 100 : 0,
          ObLtlPctRevenue: extPrice > 0 ? (ltl / extPrice) * 100 : 0,
          ObfTotalPctOfRevenue: extPrice > 0 ? ((parcel + tl + ltl) / extPrice) * 100 : 0,
          CostPerUnit: spaceOverride.CostPerUnit,
          ObfCostPerUnit: spaceOverride.ObfCostPerUnit,
          DstCostPerUnit: spaceOverride.DstCostPerUnit,
          IbfCostPerUnit: spaceOverride.IbfCostPerUnit,
          TotalExtendedPrice: extPrice,
          AvgDays: spaceOverride.AvgDeliveryDays ?? dc.AvgDays,
          AvgTransitDays: spaceOverride.AvgTransitDays ?? dc.AvgTransitDays,
        };
      }

      if (totals) {
        return {
          ...dc,
          InboundSpend: Number(totals.inbound.toFixed(2)),
          ParcelSpend: Number(totals.parcel.toFixed(2)),
          LtlSpend: Number(totals.ltl.toFixed(2)),
          TlSpend: Number(totals.tl.toFixed(2)),
          DistributionCost: Number(totals.dist.toFixed(2)),
          ...spaceFields,
        };
      }
      return {
        ...dc,
        InboundSpend: 0,
        ParcelSpend: 0,
        LtlSpend: 0,
        TlSpend: 0,
        DistributionCost: 0,
        ...spaceFields,
      };
    });
  }, [
    normalizeDcDisplay,
    scenarioId,
    scenarioRunResultsDC,
    overriddenLaneResults,
    isUsBaseline,
    costComponentRows,
    spaceOverrideRows,
    appliedLaneChannelFilter,
    appliedLaneZipSearch,
    formatDcDisplayName,
  ]);

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

  const laneResults = useMemo(() => overriddenLaneResults
    .slice()
    .sort((a, b) => laneGroupKey(a).localeCompare(laneGroupKey(b)) || laneOptionSort(a, b)),
  [laneGroupKey, laneOptionSort, overriddenLaneResults]);

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
      const isBaseline = scenario.ScenarioRunID === 'SR001' || String(scenario.ScenarioType || '').toLowerCase().includes('baseline');
      const rows = dcResults.map((dc) => {
        const dcCosts = getAdditionalCostsForDc(dc.DCName);
        const rentVal = dc.Rent ?? dcCosts.Rent;
        const laborVal = dc.ContractLabor ?? dcCosts.ContractLabor;
        const feeVal = dc.ManagementFee ?? dcCosts.ManagementFee;
        const addCost = rentVal + laborVal + feeVal;

        const baseCostDisplay = isBaseline ? Math.max(0, dc.TotalCost - addCost) : dc.TotalCost;
        const totalCostDisplay = isBaseline ? dc.TotalCost : dc.TotalCost + (dc.IsSuppressed === 'N' ? addCost : 0);

        const isUsBaselineHeader = scenario.Region === 'US' && isBaseline;
        const pctFields = isUsBaselineHeader && (dc as any).PctToTotalSales !== undefined ? {
          '% to total sales': (dc as any).PctToTotalSales,
          'IBF % of Revenue': (dc as any).IbfPctOfRevenue,
          'DST % Revenue': (dc as any).DstPctRevenue,
          'OB Parcel % Revenue': (dc as any).ObParcelPctRevenue,
          'OB TL % Revenue': (dc as any).ObTlPctRevenue,
          'OB LTL % Revenue': (dc as any).ObLtlPctRevenue,
          'OBF Total % of Revenue': (dc as any).ObfTotalPctOfRevenue,
          'Cost Per Unit': (dc as any).CostPerUnit,
          'OBF Cost Per Unit': (dc as any).ObfCostPerUnit,
          'DST Cost Per Unit': (dc as any).DstCostPerUnit,
          'IBF Cost Per Unit': (dc as any).IbfCostPerUnit,
          'totalExtendedPrice': (dc as any).TotalExtendedPrice,
        } : {};

        return {
          ScenarioRunID: dc.ScenarioRunID,
          DC: dc.DCName,
          dcEntity: scenario.EntityScope,
          dcRegion: scenario.Region,
          scenarioType: scenario.ScenarioType,
          baseCost: baseCostDisplay,
          rent: dc.IsSuppressed === 'N' ? rentVal : 0,
          contractLabor: dc.IsSuppressed === 'N' ? laborVal : 0,
          managementFee: dc.IsSuppressed === 'N' ? feeVal : 0,
          totalCost: totalCostDisplay,
          costPerUnit: dc.VolumeUnits > 0 ? Number((totalCostDisplay / dc.VolumeUnits).toFixed(2)) : 0,
          averageDeliveryDays: Number(dc.AvgDays.toFixed(2)),
          averageTransitDays: dc.AvgTransitDays == null ? '' : Number(dc.AvgTransitDays.toFixed(2)),
          utilization: Number(dc.UtilPct.toFixed(2)),
          actualSpace: dc.ActualSpace ?? '',
          coreSpace: dc.SpaceCore,
          bcvSpace: dc.SpaceBCV,
          spaceRequired: dc.SpaceRequired,
          overcapFlag: dc.OvercapFlag ?? '',
          sqft: dc.SpaceCore,
          inboundCost: dc.InboundSpend ?? 0,
          distributionCost: dc.DistributionCost ?? 0,
          parcelCost: dc.ParcelSpend ?? 0,
          ltlCost: dc.LtlSpend ?? 0,
          tlCost: dc.TlSpend ?? 0,
          slaBreach: dc.SLABreachCount,
          'slaBreach%': (() => {
            const typedDc = dc as { SLABreachPct?: number | null; SLABreachCount: number; VolumeUnits: number };
            const breachPct =
              typedDc.SLABreachPct ??
              (typedDc.VolumeUnits > 0 ? (typedDc.SLABreachCount / typedDc.VolumeUnits) * 100 : null);
            return breachPct == null ? '' : Number(breachPct.toFixed(2));
          })(),
          ...pctFields,
        };
      });
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
        FreightTerms: lane.FreightTerms || '',

        AssignedDC: lane.AssignedDC,
        CostRank: lane.CostRank ?? '',
        LaneCost: lane.LaneCost,
        CostDeltaVsBest: lane.CostDeltaVsBest ?? 0,
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
        FreightTerms: lane.FreightTerms || '',

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
          FreightTerms: lane.FreightTerms || '',

          AssignedDC: lane.AssignedDC,
          CostDeltaVsBest: lane.CostDeltaVsBest ?? 0,
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

  useEffect(() => {
    if (showCommentModal) {
      setCommentText(scenario?.LatestComment && scenario.LatestComment !== 'NA' ? scenario.LatestComment : '');
    }
  }, [showCommentModal, scenario?.LatestComment]);

  const handleSaveComment = () => {
    const trimmed = commentText.trim();
    onAddComment(scenarioId, trimmed || 'NA');
    triggerAction('scenario_comment_save');
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
    dcColumns: createScenarioDcColumns(
      scenarioId === 'SR001' || String(scenario?.ScenarioType || '').toLowerCase().includes('baseline'),
      (scenarioId === 'SR001' || String(scenario?.ScenarioType || '').toLowerCase().includes('baseline'))
        ? 100
        : (typeof scenario?.UtilizationCap === 'number'
            ? scenario.UtilizationCap
            : Number(String(scenario?.UtilizationCap || '').replace(/[^0-9.-]/g, '')) || 85)
    ),
    laneColumns: createScenarioLaneColumns(),
    rankedOptionsColumns: createScenarioRankedOptionsColumns(),
  };
};
