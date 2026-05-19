import type {
  ScenarioBuildContext,
  ScenarioBuildResult,
  ScenarioSubmit,
} from './scenarioModels';
import { buildScenarioArtifacts as buildScenarioArtifactsLegacy } from './scenarioBuilder';
import { loadScenarioLogicDocument } from './scenarioLogicLoader';
import { parseScenarioLogicDocument } from './scenarioPlanParser';
import type { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';
import {
  getScenarioTypeAllowedDcs,
  normalizeScenarioTypeSpecificInput,
  scenarioTypeMatches,
} from './scenarioTypeRules';

const getEngineMode = (): 'sample' | 'dataflow' => {
  const mode = String(import.meta.env.VITE_SCENARIO_ENGINE_MODE || 'sample').trim().toLowerCase();
  return mode === 'dataflow' ? 'dataflow' : 'sample';
};

const normalizeKey = (value: string): string =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const buildScenarioId = (existingCount: number) => `SR${(existingCount + 1).toString().padStart(3, '0')}`;

const dedupeRowsByKey = <T>(rows: T[], getKey: (row: T) => string): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  rows.forEach((row) => {
    const key = String(getKey(row) || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(row);
  });
  return result;
};

const getBaselineHeader = (
  context: ScenarioBuildContext,
  region: 'US' | 'Canada',
  baselineScenarioId?: string | null,
) => {
  if (baselineScenarioId) {
    const direct = context.scenarioHeaders.find((s) => s.ScenarioRunID === baselineScenarioId);
    if (direct) return direct;
  }
  const baseForRegion = [...context.scenarioHeaders]
    .filter((s) => s.Region === region && s.Status === 'Published')
    .sort((a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime())[0];

  return (
    baseForRegion ??
    context.scenarioHeaders.find((s) => s.Region === region) ??
    context.scenarioHeaders[0] ??
    null
  );
};

const getExactBaselineHeader = (
  context: ScenarioBuildContext,
  region: 'US' | 'Canada',
): ReturnType<typeof getBaselineHeader> =>
  context.scenarioHeaders.find((s) =>
    s.Region === region
    && scenarioTypeMatches(String(s.ScenarioType || ''), 'Baseline')
    && String(s.DataflowID || '').trim() === '3267',
  ) || null;

const getActiveCapacityDcs = (context: ScenarioBuildContext): string[] => {
  const rows = context.dcCapacityRows || [];
  return rows
    .filter((row) => row.IsActive)
    .map((row) => row.DCName)
    .filter(Boolean);
};

const getScenarioFamilyAllowedDcs = (scenarioType: unknown, context: ScenarioBuildContext): string[] => {
  const allActive = getActiveCapacityDcs(context);
  const familyScope = getScenarioTypeAllowedDcs(scenarioType);
  const allowedKeys = new Set(familyScope.map((dc) => normalizeKey(dc)));
  return allActive.filter((dc) => allowedKeys.has(normalizeKey(dc)));
};

const getScenarioFamilyCapacityRows = (
  scenarioType: unknown,
  context: ScenarioBuildContext,
): NonNullable<ScenarioBuildContext['dcCapacityRows']> => {
  const familyScope = getScenarioTypeAllowedDcs(scenarioType);
  const allowedKeys = new Set(familyScope.map((dc) => normalizeKey(dc)));
  return (context.dcCapacityRows || []).filter((row) => allowedKeys.has(normalizeKey(row.DCName)));
};

const resolveActiveDcs = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
  allowedDcs: string[],
): string[] => {
  const capacityActive = getActiveCapacityDcs(context);
  const familyAllowed = getScenarioFamilyAllowedDcs(payload.input.scenarioType, context);
  const baseAllowed = allowedDcs.length > 0 ? allowedDcs : capacityActive;
  const familyAllowedSet = new Set(familyAllowed.map((dc) => normalizeKey(dc)));
  const allowedSet = new Set(
    baseAllowed
      .map((dc) => String(dc || '').trim())
      .filter(Boolean)
      .filter((dc) => familyAllowedSet.size === 0 || familyAllowedSet.has(normalizeKey(dc))),
  );
  const userActive = payload.input.activeDCs.map((dc) => String(dc || '').trim()).filter(Boolean);
  if (userActive.length > 0) {
    const userSet = new Set(userActive);
    const intersected = Array.from(allowedSet).filter((dc) => userSet.has(dc));
    if (intersected.length > 0) return intersected.sort((a, b) => a.localeCompare(b));
    return userActive
      .filter((dc) => allowedSet.size === 0 || allowedSet.has(dc))
      .sort((a, b) => a.localeCompare(b));
  }
  return Array.from(allowedSet.size > 0 ? allowedSet : new Set(capacityActive))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

const resolveSuppressedDcs = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
  activeDcs: string[],
  planSuppressed: string[],
): string[] => {
  const explicit = payload.input.suppressedDcs.map((dc) => String(dc || '').trim()).filter(Boolean);
  const activeSet = new Set(activeDcs.map((dc) => String(dc || '').trim()).filter(Boolean));
  const activeCapacity = new Set(getActiveCapacityDcs(context));
  const familyCapacity = new Set(getScenarioFamilyAllowedDcs(payload.input.scenarioType, context));
  const suppressed = new Set<string>();
  explicit.forEach((dc) => suppressed.add(dc));
  planSuppressed.forEach((dc) => suppressed.add(dc));
  (context.dcCapacityRows || []).forEach((row) => {
    if (familyCapacity.size > 0 && !familyCapacity.has(row.DCName)) return;
    if (!row.IsActive || !activeCapacity.has(row.DCName) || (!activeSet.has(row.DCName) && row.IsActive)) {
      suppressed.add(row.DCName);
    }
  });
  return Array.from(suppressed).filter(Boolean).sort((a, b) => a.localeCompare(b));
};

const buildLaneGroupKey = (lane: ScenarioRunResultsLane): string =>
  [
    lane.Dest3Zip || '',
    lane.Channel || '',
    lane.Terms || '',
    lane.DestState || '',
    lane.PartyName || lane.CustomerGroup || '',
    lane.ScenarioType || '',
  ].join('|');

const laneCostPerUnit = (lane: ScenarioRunResultsLane): number =>
  Number(
    (lane.CostPerUnit ??
      lane.LaneCost ??
      0).toFixed(2)
  );

const laneCostToDisplay = (lane: ScenarioRunResultsLane): number =>
  Number(
    (lane.TotalCost ?? lane.LaneCost ?? lane.RankedOption1Cost ?? 0).toFixed(2)
  );

const laneDaysToDisplay = (lane: ScenarioRunResultsLane): number =>
  Number((lane.DeliveryDays ?? lane.RankedOption1Days ?? 0).toFixed(1));

const laneIsActive = (lane: ScenarioRunResultsLane, activeDcs: Set<string>, suppressedDcs: Set<string>): boolean => {
  const dc = String(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom || '').trim();
  if (!dc || dc === 'NA') return false;
  if (suppressedDcs.has(dc)) return false;
  if (activeDcs.size === 0) return true;
  return activeDcs.has(dc);
};

const pickBestLaneInGroup = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane => {
  const sorted = [...rows].sort((a, b) => {
    const cpuA = laneCostPerUnit(a);
    const cpuB = laneCostPerUnit(b);
    if (cpuA !== cpuB) return cpuA - cpuB;
    const warehouseA = `${a.CostingWarehouse || a.AssignedDC || ''}|${a.DefaultShipFrom || ''}`;
    const warehouseB = `${b.CostingWarehouse || b.AssignedDC || ''}|${b.DefaultShipFrom || ''}`;
    const warehouseDelta = warehouseA.localeCompare(warehouseB);
    if (warehouseDelta !== 0) return warehouseDelta;
    const totalCostDelta = laneCostToDisplay(a) - laneCostToDisplay(b);
    if (totalCostDelta !== 0) return totalCostDelta;
    return `${a.Dest3Zip}|${a.Channel}`.localeCompare(`${b.Dest3Zip}|${b.Channel}`);
  });
  const best = sorted[0];
  return {
    ...best,
    LaneCost: laneCostToDisplay(best),
    TotalCost: laneCostToDisplay(best),
    CostPerUnit: Number((best.CostPerUnit ?? laneCostPerUnit(best)).toFixed(2)),
    CostDeltaVsBest: 0,
    DeliveryDays: best.DeliveryDays || best.RankedOption1Days,
    ChosenRank: 1,
    CostRank: 1,
    OverrideAppliedFlag: best.OverrideAppliedFlag || 'N',
    OverrideVersion: best.OverrideVersion ?? null,
    NotesFlag: best.NotesFlag || '',
  };
};

const buildScenarioLanes = (
  rows: ScenarioRunResultsLane[],
  scenarioId: string,
  activeDcs: string[],
  suppressedDcs: string[],
): ScenarioRunResultsLane[] => {
  const activeSet = new Set(activeDcs.map((dc) => String(dc || '').trim()).filter(Boolean));
  const suppressedSet = new Set(suppressedDcs.map((dc) => String(dc || '').trim()).filter(Boolean));
  const grouped = dedupeRowsByKey(rows, buildLaneGroupKey).reduce<Record<string, ScenarioRunResultsLane[]>>((acc, row) => {
    const key = buildLaneGroupKey(row);
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([, laneRows]) => {
      const ranked = [...laneRows].sort((a, b) => {
        const activeA = laneIsActive(a, activeSet, suppressedSet);
        const activeB = laneIsActive(b, activeSet, suppressedSet);
        if (activeA !== activeB) return activeA ? -1 : 1;
        const cpuA = laneCostPerUnit(a);
        const cpuB = laneCostPerUnit(b);
        if (cpuA !== cpuB) return cpuA - cpuB;
        const warehouseA = `${a.CostingWarehouse || a.AssignedDC || ''}|${a.DefaultShipFrom || ''}`;
        const warehouseB = `${b.CostingWarehouse || b.AssignedDC || ''}|${b.DefaultShipFrom || ''}`;
        const warehouseDelta = warehouseA.localeCompare(warehouseB);
        if (warehouseDelta !== 0) return warehouseDelta;
        return `${a.Dest3Zip}|${a.Channel}|${a.Terms}|${a.DestState}`.localeCompare(`${b.Dest3Zip}|${b.Channel}|${b.Terms}|${b.DestState}`);
      });

      const [best = null] = ranked;
      const selected = ranked.find((lane) => laneIsActive(lane, activeSet, suppressedSet)) || best || null;
      if (!selected) return null;
      const selectedRank = Math.max(1, ranked.findIndex((lane) => lane === selected) + 1);
      const selectedCost = laneCostToDisplay(selected);
      const selectedCpu = laneCostPerUnit(selected);
      const bestCpu = best ? laneCostPerUnit(best) : selectedCpu;
      const selectedDc = selected.AssignedDC || selected.CostingWarehouse || selected.DefaultShipFrom || 'NA';
      const baseRow = best || selected;
      return {
        ...baseRow,
        ScenarioRunID: scenarioId,
        AssignedDC: selectedDc,
        ChosenRank: selectedRank,
        LaneCost: selectedCost,
        TotalCost: selectedCost,
        CostPerUnit: Number((selected.CostPerUnit ?? selectedCpu).toFixed(2)),
        CostDeltaVsBest: Number(Math.max(0, selectedCpu - bestCpu).toFixed(2)),
        DeliveryDays: laneDaysToDisplay(selected),
        SLABreachFlag: String(selected.BreachFlag || selected.SLABreachFlag || '').toLowerCase() === 'breach' ? 'Y' : 'N',
        ExcludedBySLAFlag: String(selected.BreachFlag || selected.SLABreachFlag || '').toLowerCase() === 'breach' ? 'Y' : 'N',
        FootprintContribution: selected.WorkingCapacity || selected.FootprintContribution || selected.Threshold || 0,
        UtilImpactPct: selected.UtilImpactPct || (
          selected.Threshold && selected.Threshold > 0 && selected.WorkingCapacity !== undefined
            ? Number(((selected.WorkingCapacity / selected.Threshold) * 100).toFixed(2))
            : 0
        ),
        OverrideAppliedFlag: selected.OverrideAppliedFlag || 'N',
        OverrideVersion: selected.OverrideVersion ?? null,
        NotesFlag: selected.NotesFlag || '',
        ScenarioType: selected.ScenarioType || baseRow.ScenarioType || '',
        RunName: selected.RunName || baseRow.RunName || '',
        CostingWarehouse: selected.CostingWarehouse || '',
        DefaultShipFrom: selected.DefaultShipFrom || '',
        InboundSpend: selected.InboundSpend ?? 0,
        ParcelSpend: selected.ParcelSpend ?? 0,
        LtlSpend: selected.LtlSpend ?? 0,
        WorkingCapacity: selected.WorkingCapacity ?? 0,
        DistributionCost: selected.DistributionCost ?? 0,
        TlSpend: selected.TlSpend ?? 0,
        BreachFlag: selected.BreachFlag || '',
        OrderToDeliverCalendarDays: selected.OrderToDeliverCalendarDays ?? 0,
        ShipToDeliverCalendarDays: selected.ShipToDeliverCalendarDays ?? 0,
        State: selected.State || selected.DestState || '',
        PartyName: selected.PartyName || selected.CustomerGroup || '',
        Threshold: selected.Threshold ?? 0,
        CostRank: selectedRank,
        SourceDatasetId: selected.SourceDatasetId || baseRow.SourceDatasetId || '',
      } as ScenarioRunResultsLane;
    })
    .filter((item): item is ScenarioRunResultsLane => Boolean(item))
    .sort((a, b) => {
      const zipCompare = String(a.Dest3Zip || '').localeCompare(String(b.Dest3Zip || ''));
      if (zipCompare !== 0) return zipCompare;
      const channelCompare = String(a.Channel || '').localeCompare(String(b.Channel || ''));
      if (channelCompare !== 0) return channelCompare;
      const termsCompare = String(a.Terms || '').localeCompare(String(b.Terms || ''));
      if (termsCompare !== 0) return termsCompare;
      const costA = laneCostPerUnit(a);
      const costB = laneCostPerUnit(b);
      if (costA !== costB) return costA - costB;
      return String(a.AssignedDC || a.CostingWarehouse || '').localeCompare(String(b.AssignedDC || b.CostingWarehouse || ''));
    });
};

const buildScenarioDcRows = (
  rows: ScenarioRunResultsDC[],
  activeDcs: string[],
  suppressedDcs: string[],
  scenarioId: string,
): ScenarioRunResultsDC[] => {
  const activeSet = new Set(activeDcs.map((dc) => String(dc || '').trim()).filter(Boolean));
  const suppressedSet = new Set(suppressedDcs.map((dc) => String(dc || '').trim()).filter(Boolean));
  const sorted = dedupeRowsByKey(rows, (row) => row.DCName).sort((a, b) => {
    const activeA = activeSet.has(a.DCName) && !suppressedSet.has(a.DCName);
    const activeB = activeSet.has(b.DCName) && !suppressedSet.has(b.DCName);
    if (activeA !== activeB) return activeA ? -1 : 1;
    const cpuA = a.VolumeUnits > 0 ? a.TotalCost / a.VolumeUnits : a.TotalCost;
    const cpuB = b.VolumeUnits > 0 ? b.TotalCost / b.VolumeUnits : b.TotalCost;
    if (cpuA !== cpuB) return cpuA - cpuB;
    if (a.TotalCost !== b.TotalCost) return a.TotalCost - b.TotalCost;
    return a.DCName.localeCompare(b.DCName);
  });

  return sorted.map((dc, idx) => {
    const isSuppressed = suppressedSet.has(dc.DCName) || !activeSet.has(dc.DCName);
    return {
      ...dc,
      ScenarioRunID: scenarioId,
      TotalCost: isSuppressed ? 0 : dc.TotalCost,
      VolumeUnits: isSuppressed ? 0 : dc.VolumeUnits,
      AvgDays: isSuppressed ? 0 : dc.AvgDays,
      UtilPct: isSuppressed ? 0 : dc.UtilPct,
      SpaceRequired: isSuppressed ? 0 : dc.SpaceRequired,
      SpaceCore: isSuppressed ? 0 : dc.SpaceCore,
      SpaceBCV: isSuppressed ? 0 : dc.SpaceBCV,
      SLABreachCount: isSuppressed ? 0 : dc.SLABreachCount,
      ExcludedBySLACount: isSuppressed ? 0 : dc.ExcludedBySLACount,
      RankOverall: idx + 1,
      IsSuppressed: isSuppressed ? 'Y' : 'N',
    };
  });
};

export const buildScenarioArtifactsWithLogic = async (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
): Promise<ScenarioBuildResult> => {
  const engineMode = getEngineMode();
  const normalizedPayload: ScenarioSubmit = {
    ...payload,
    input: normalizeScenarioTypeSpecificInput(payload.input),
  };
  const exactBaseline = normalizedPayload.input.scenarioType.trim().toLowerCase() === 'baseline'
    ? getExactBaselineHeader(context, normalizedPayload.input.region)
    : null;
  const resolvedBaselineScenarioId =
    exactBaseline?.ScenarioRunID
    ?? normalizedPayload.input.baselineScenarioId
    ?? null;
  const resolvedBaselineDataflowId =
    exactBaseline?.DataflowID
    ?? normalizedPayload.input.baselineDataflowId
    ?? null;
  const baseline = getBaselineHeader(context, normalizedPayload.input.region, resolvedBaselineScenarioId);
  const logicDocument = await loadScenarioLogicDocument({
    mode: engineMode,
    region: normalizedPayload.input.region,
    dataflowId: resolvedBaselineDataflowId || baseline?.DataflowID || null,
  });
  const plan = parseScenarioLogicDocument(logicDocument);
  const allowedDcs = plan.allowedDcs.length > 0 ? plan.allowedDcs : normalizedPayload.input.activeDCs;
  const activeDcs = resolveActiveDcs(normalizedPayload, context, allowedDcs);
  const suppressedDcs = resolveSuppressedDcs(normalizedPayload, context, activeDcs, plan.suppressedDcs);
  const familyCapacityRows = getScenarioFamilyCapacityRows(normalizedPayload.input.scenarioType, context);

  const adjustedPayload: ScenarioSubmit = {
    ...payload,
    input: {
      ...normalizedPayload.input,
      baselineScenarioId: resolvedBaselineScenarioId ?? normalizedPayload.input.baselineScenarioId,
      baselineDataflowId: resolvedBaselineDataflowId ?? normalizedPayload.input.baselineDataflowId,
      activeDCs: activeDcs,
      suppressedDCs,
    },
  };

  const artifact = buildScenarioArtifactsLegacy(adjustedPayload, {
    ...context,
    dcCapacityRows: familyCapacityRows,
    scenarioPlan: plan,
  } as ScenarioBuildContext);

  console.log('[Scenario Engine] build complete', {
    mode: engineMode,
    scenarioId: artifact.header.ScenarioRunID,
    logicVersion: plan.logicVersion,
    scenarioType: plan.scenarioType,
    allowedDcs: allowedDcs.length,
    activeDcs: activeDcs.length,
    suppressedDcs: suppressedDcs.length,
    laneGroups: artifact.resultsLanes.length,
    dcRows: artifact.resultsDC.length,
  });

  return artifact;
};
