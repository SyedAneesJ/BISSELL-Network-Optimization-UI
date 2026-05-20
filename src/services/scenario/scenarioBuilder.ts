import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
} from '@/data';
import { allocateScenarioOutputs, annotateCapacityOutputs, buildCapacityMap } from './scenarioAllocator';
import {
  ScenarioBuildContext,
  ScenarioBuildResult,
  ScenarioBuildSummary,
  ScenarioDefinition,
  ScenarioSubmit,
  ScenarioRepositoryRecord,
  ScenarioRunSnapshot,
} from './scenarioModels';
import {
  normalizeScenarioTypeSpecificInput,
  resolveScenarioTypePolicy,
  scenarioTypeMatches,
} from './scenarioTypeRules';

const buildScenarioId = (existingCount: number) => {
  const ts = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SR_${ts}_${suffix}`;
};

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

const canonicalizeBaselineLaneRows = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] =>
  dedupeRowsByKey(rows, (row) => [
    row.Dest3Zip || '',
    row.Channel || '',
    row.Terms || '',
    row.DestState || '',
    row.PartyName || row.CustomerGroup || '',
    row.ScenarioType || '',
  ].join('|'));

const getBaselineLaneRows = (
  context: ScenarioBuildContext,
  scenarioType: string,
  baselineScenarioId: string | null,
): ScenarioRunResultsLane[] => {
  const rawMap = context.laneRowsByScenarioId || {};
  if (baselineScenarioId && rawMap[baselineScenarioId]?.length) {
    return canonicalizeBaselineLaneRows(rawMap[baselineScenarioId]);
  }

  const scenarioTypeMatch = Object.entries(rawMap).find(([, rows]) =>
    rows.some((row) => {
      const rowType = String(row.ScenarioType || '').trim();
      return scenarioTypeMatches(rowType, scenarioType);
    })
  );
  if (scenarioTypeMatch?.[1]?.length) {
    return canonicalizeBaselineLaneRows(scenarioTypeMatch[1]);
  }

  const firstRawLaneGroup = Object.values(rawMap).find((rows) => rows.length > 0) || [];
  return canonicalizeBaselineLaneRows(firstRawLaneGroup);
};

const shouldLogLaneSource = String(import.meta.env.VITE_SCENARIO_LANE_SOURCE_LOGS ?? 'true').toLowerCase() !== 'false';

const getScenarioMode = (
  scenarioType: string,
  utilCap: number,
  suppressedDcs: string[],
): 'baseline' | 'overload' | 'constrained' => {
  const policy = resolveScenarioTypePolicy(scenarioType);
  if (policy.allocationMode !== 'auto') {
    if (policy.allocationMode === 'baseline') return 'baseline';
    if (policy.allocationMode === 'overload' || policy.allocationMode === 'unconstrained') return 'overload';
    if (policy.allocationMode === 'constrained' || policy.allocationMode === 'tacticalConsolidation') return 'constrained';
  }
  const safeUtilCap = Math.max(0, Math.min(100, Number(utilCap || 0)));
  if (suppressedDcs.length === 0 && safeUtilCap >= 100) return 'baseline';
  if (safeUtilCap >= 100) return 'overload';
  return 'constrained';
};

const isBaselineScenarioType = (scenarioType: string): boolean =>
  resolveScenarioTypePolicy(scenarioType).allocationMode === 'baseline';

const getExactBaselineHeader = (
  scenarioHeaders: ScenarioRunHeader[],
  region: 'US' | 'Canada',
): ScenarioRunHeader | null =>
  scenarioHeaders.find((s) =>
    s.Region === region
    && scenarioTypeMatches(String(s.ScenarioType || ''), 'Baseline')
    && String(s.DataflowID || '').trim() === '3267',
  ) || null;

const buildLaneGroupKey = (lane: ScenarioRunResultsLane): string =>
  [
    lane.Dest3Zip || '',
    lane.Channel || '',
    lane.Terms || '',
    lane.DestState || '',
    lane.PartyName || lane.CustomerGroup || '',
    lane.ScenarioType || '',
    lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom || '',
  ].join('|');

const getBaselineHeader = (
  scenarioHeaders: ScenarioRunHeader[],
  region: 'US' | 'Canada',
  baselineScenarioId?: string | null,
) => {
  if (baselineScenarioId) {
    const direct = scenarioHeaders.find((s) => s.ScenarioRunID === baselineScenarioId);
    if (direct) return direct;
  }
  const baselineByType = [...scenarioHeaders]
    .filter((s) => s.Region === region && scenarioTypeMatches(String(s.ScenarioType || ''), 'Baseline'))
    .sort((a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime())[0];
  if (baselineByType) return baselineByType;
  const baseForRegion = [...scenarioHeaders]
    .filter((s) => s.Region === region && s.Status === 'Published')
    .sort((a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime())[0];

  return (
    baseForRegion ??
    scenarioHeaders.find((s) => s.Region === region) ??
    scenarioHeaders[0] ??
    null
  );
};

const getLaneSourceBaselineHeader = (
  scenarioHeaders: ScenarioRunHeader[],
  region: 'US' | 'Canada',
  scenarioType: string,
  baselineScenarioId?: string | null,
) => {
  if (resolveScenarioTypePolicy(scenarioType).allocationMode === 'baseline') {
    const exact = getExactBaselineHeader(scenarioHeaders, region);
    if (exact) return exact;
  }
  // Prefer the user's explicit baselineScenarioId for non-baseline scenarios.
  // Only fall back to generic region lookup when no explicit ID is provided.
  return getBaselineHeader(scenarioHeaders, region, baselineScenarioId);
};

const getNowIso = () => new Date().toISOString();

const buildScenarioHeader = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
  scenarioId: string,
): ScenarioRunHeader => {
  const now = new Date().toISOString();
  const policy = resolveScenarioTypePolicy(payload.input.scenarioType);
  const baseline = getBaselineHeader(context.scenarioHeaders, payload.input.region, payload.input.baselineScenarioId);

  const costShift = context.hasCostVsServiceWeights ? (payload.input.costVsService - 50) / 500 : 0;
  const serviceShift = context.hasCostVsServiceWeights ? (payload.input.costVsService - 50) / 100 : 0;
  const utilCapImpact = context.hasUtilCaps
    ? payload.input.utilCap < 80
      ? 0.02
      : payload.input.utilCap > 90
        ? -0.01
        : 0
    : 0;

  const totalCost = baseline ? Math.round(baseline.TotalCost * (1 + costShift + utilCapImpact)) : 0;
  const costPerUnit = baseline ? Number((baseline.CostPerUnit * (1 + costShift)).toFixed(2)) : 0;
  const avgDays = baseline ? Number((baseline.AvgDeliveryDays * (1 - serviceShift * 0.1)).toFixed(1)) : 0;
  const slaBreach = baseline ? Number((baseline.SLABreachPct * (1 + costShift * 0.5)).toFixed(1)) : 0;
  const maxUtil = baseline ? Math.min(100, Number((baseline.MaxUtilPct * (1 + utilCapImpact)).toFixed(2))) : 0;
  const totalSpace = baseline ? baseline.TotalSpaceRequired : 0;
  const spaceCore = baseline ? baseline.SpaceCore : 0;
  const spaceBCV = baseline ? baseline.SpaceBCV : 0;

  const alertFlags: string[] = [];
  if (context.hasUtilCaps && payload.input.utilCap > 90) alertFlags.push('OverCap');
  if (context.hasLeadTimeCaps && payload.input.leadTimeCap <= 5) alertFlags.push('SLA');

  return {
    ScenarioRunID: scenarioId,
    RunName: payload.input.runName || `New Scenario ${scenarioId}`,
    Region: payload.input.region,
    BaselineScenarioId: payload.input.baselineScenarioId || null,
    DataflowID: baseline?.DataflowID ?? payload.input.baselineDataflowId,
    ScenarioType: (policy.outputScenarioType || payload.input.scenarioType || baseline?.ScenarioType || 'Baseline') as ScenarioRunHeader['ScenarioType'],
    EntityScope: payload.input.entityScope,
    ChannelScope: payload.input.channelScope.length > 0 ? payload.input.channelScope.join(',') : 'NA',
    TermsScope: (payload.input.termsScope || 'Collect+Prepaid') as ScenarioRunHeader['TermsScope'],
    CreatedBy: context.currentUserDisplayName,
    CreatedAt: now,
    LastUpdatedAt: now,
    LastRunBy: null,
    LastRunAt: null,
    LastRunExecutionId: null,
    Status: payload.action === 'draft' ? 'Draft' : 'Running',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: payload.input.notes || 'NA',
    Tags: payload.input.tags.length > 0 ? payload.input.tags.join(',') : 'NA',
    DataSnapshotVersion: context.dataSnapshotVersion || 'NA',
    AssumptionsSummary: 'NA',
    AlertFlags: alertFlags.join(','),
    TotalCost: totalCost,
    CostPerUnit: costPerUnit,
    AvgDeliveryDays: avgDays,
    AvgTransitDays: baseline?.AvgTransitDays ?? null,
    TotalCount: baseline?.TotalCount ?? 0,
    SLABreachPct: slaBreach,
    ExcludedBySLACount: baseline ? Math.round(baseline.ExcludedBySLACount * (1 + costShift)) : 0,
    MaxUtilPct: maxUtil,
    TotalSpaceRequired: totalSpace,
    SpaceCore: spaceCore,
    SpaceBCV: spaceBCV,
    FootprintMode: payload.input.footprintMode || baseline?.FootprintMode || 'NA',
    LevelLoad: payload.input.levelLoad ? 'On' : (baseline?.LevelLoad || 'NA'),
    UtilizationCap: payload.input.utilCap || baseline?.UtilizationCap || 'NA',
    CollectTreatment: policy.collectTreatmentLabel || baseline?.CollectTreatment || 'NA',
    OverrideCount: 0,
    LaneCount: baseline ? baseline.LaneCount : 0,
    ChangedLaneCountVsBaseline: payload.action === 'draft' ? 0 : baseline ? Math.round(baseline.ChangedLaneCountVsBaseline * (1 + costShift)) : 0,
  };
};

const buildScenarioDefinition = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
  artifact: ScenarioBuildResult,
): ScenarioDefinition => {
  const now = getNowIso();
  const normalizedInput = normalizeScenarioTypeSpecificInput(payload.input);
  const policy = resolveScenarioTypePolicy(normalizedInput.scenarioType);
  return {
    scenarioId: artifact.header.ScenarioRunID,
    scenarioName: artifact.header.RunName,
    region: normalizedInput.region,
    scenarioType: policy.outputScenarioType || normalizedInput.scenarioType || artifact.header.ScenarioType,
    baselineScenarioId: artifact.baselineScenarioId,
    dataflowId: artifact.baselineDataflowId || artifact.header.DataflowID || '',
    selectedDcs: [...normalizedInput.activeDCs],
    suppressedDcs: [...normalizedInput.suppressedDCs],
    utilCap: normalizedInput.utilCap,
    leadTimeCap: normalizedInput.leadTimeCap,
    costVsService: normalizedInput.costVsService,
    termsScope: normalizedInput.termsScope,
    footprintMode: normalizedInput.footprintMode,
    levelLoad: normalizedInput.levelLoad,
    bcvRuleSet: normalizedInput.bcvRuleSet,
    fuelSurchargeMode: normalizedInput.fuelSurchargeMode,
    fuelSurchargeOverride: normalizedInput.fuelSurchargeOverride,
    notes: normalizedInput.notes,
    tags: [...normalizedInput.tags],
    createdBy: context.currentUserDisplayName,
    createdAt: artifact.header.CreatedAt || now,
    updatedAt: artifact.header.LastUpdatedAt || now,
    status: artifact.header.Status,
    lastRunBy: artifact.header.LastRunBy ?? null,
    lastRunAt: artifact.header.LastRunAt ?? null,
    lastRunExecutionId: artifact.header.LastRunExecutionId ?? null,
  };
};

const buildScenarioSnapshot = (
  artifact: ScenarioBuildResult,
): ScenarioRunSnapshot => ({
  scenarioId: artifact.header.ScenarioRunID,
  header: artifact.header,
  config: artifact.config,
  resultsDC: artifact.resultsDC,
  resultsLanes: artifact.resultsLanes,
  summary: artifact.summary,
  createdAt: artifact.header.CreatedAt,
  updatedAt: artifact.header.LastUpdatedAt,
});

const toRepositoryRecord = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
  artifact: ScenarioBuildResult,
): ScenarioRepositoryRecord => ({
  definition: buildScenarioDefinition(payload, context, artifact),
  snapshot: buildScenarioSnapshot(artifact),
  runHistory: [],
  overrides: [],
});

const buildScenarioConfig = (payload: ScenarioSubmit, scenarioId: string): ScenarioRunConfig => ({
  ScenarioRunID: scenarioId,
  ActiveDCs: payload.input.activeDCs.join(','),
  SuppressedDCs: payload.input.suppressedDCs.join(','),
  FootprintMode: payload.input.footprintMode as ScenarioRunConfig['FootprintMode'],
  UtilCapPct: payload.input.utilCap,
  LevelLoadMode: payload.input.levelLoad ? 'On' : 'Off',
  LeadTimeCapDays: payload.input.leadTimeCap === 0 ? null : payload.input.leadTimeCap,
  CostVsServiceWeight: payload.input.costVsService,
  AllowRelocationPrepaid: payload.input.allowRelocationPrepaid ? 'Y' : 'N',
  AllowRelocationCollect: payload.input.allowRelocationCollect ? 'Y' : 'N',
  BCVRuleSet: payload.input.bcvRuleSet as ScenarioRunConfig['BCVRuleSet'],
  FuelSurchargeMode: payload.input.fuelSurchargeMode as ScenarioRunConfig['FuelSurchargeMode'],
  FuelSurchargeOverridePct: payload.input.fuelSurchargeOverride,
  AccessorialFlags: [
    payload.input.accessorials.residential ? 'Residential' : null,
    payload.input.accessorials.liftgate ? 'Liftgate' : null,
    payload.input.accessorials.insideDelivery ? 'InsideDelivery' : null,
  ].filter(Boolean).join(','),
  Notes: payload.input.notes || 'Created via New Scenario Wizard',
});

const buildScenarioResultsDC = (
  payload: ScenarioSubmit,
  scenarioId: string,
  context: ScenarioBuildContext,
): ScenarioRunResultsDC[] => {
  const clampPercent = (value: number) => Math.max(0, Math.min(100, Number(value.toFixed(2))));
  if (baselineResults.length === 0) return [];

  const active = new Set(activeDcs.map(dc => String(dc || '').trim().toLowerCase()));
  const suppressed = new Set(suppressedDcs.map(dc => String(dc || '').trim().toLowerCase()));

  return dedupeRowsByKey(
    [...baselineResults]
      .sort((a, b) => {
        const keyA = String(a.DCName || '').trim().toLowerCase();
        const keyB = String(b.DCName || '').trim().toLowerCase();
        const activeA = active.has(keyA);
        const activeB = active.has(keyB);
        if (activeA !== activeB) return activeA ? -1 : 1;
        const costA = activeA ? a.TotalCost : Number.MAX_SAFE_INTEGER;
        const costB = activeB ? b.TotalCost : Number.MAX_SAFE_INTEGER;
        if (costA !== costB) return costA - costB;
        return a.DCName.localeCompare(b.DCName);
      })
      .map((dc, idx) => ({
        ScenarioRunID: scenarioId,
        DCName: dc.DCName,
        TotalCost: active.has(dc.DCName)
          ? dc.TotalCost
          : 0,
        VolumeUnits: active.has(dc.DCName)
          ? dc.VolumeUnits
          : 0,
        AvgDays: active.has(dc.DCName)
          ? dc.AvgDays
          : 0,
        UtilPct: active.has(dc.DCName)
          ? clampPercent(context.hasUtilCaps ? Math.min(dc.UtilPct, payload.input.utilCap) : dc.UtilPct)
          : 0,
        SpaceRequired: active.has(dc.DCName) ? dc.SpaceRequired : 0,
        SpaceCore: active.has(dc.DCName) ? dc.SpaceCore : 0,
        SpaceBCV: active.has(dc.DCName) ? dc.SpaceBCV : 0,
        SLABreachCount: active.has(dc.DCName) ? dc.SLABreachCount : 0,
        ExcludedBySLACount: active.has(dc.DCName) ? dc.ExcludedBySLACount : 0,
        RankOverall: idx + 1,
        IsSuppressed: active.has(dc.DCName) ? 'N' : 'Y',
      })),
    (dc) => dc.DCName,
  );
};

const buildScenarioResultsLanes = (
  scenarioId: string,
  context: ScenarioBuildContext,
  baselineScenarioId: string | null,
): ScenarioRunResultsLane[] => {
  const baselineId = baselineScenarioId
    ?? context.scenarioHeaders.find((header) => header.Status === 'Published')?.ScenarioRunID
    ?? context.scenarioHeaders[0]?.ScenarioRunID
    ?? 'SR001';
  const baselineLanes = context.scenarioResultsLanes
    .filter((lane) => lane.ScenarioRunID === baselineId)
    .filter((lane) => Boolean(buildLaneGroupKey(lane)))
    .filter((lane, index, rows) => rows.findIndex((item) => buildLaneGroupKey(item) === buildLaneGroupKey(lane)) === index)
    .slice(0, 6);

  return baselineLanes.map((lane, idx) => ({
    ...lane,
    ScenarioRunID: scenarioId,
    LaneCost: Number((lane.LaneCost * (1 + idx * 0.02)).toFixed(2)),
    CostDeltaVsBest: Number((lane.CostDeltaVsBest + idx * 0.05).toFixed(2)),
    DeliveryDays: Number((lane.DeliveryDays + idx * 0.1).toFixed(1)),
    OverrideAppliedFlag: 'N',
    OverrideVersion: null,
    NotesFlag: '',
  }));
};

const summarizeDcResults = (rows: ScenarioRunResultsDC[]): ScenarioBuildSummary => {
  if (rows.length === 0) {
    return {
      totalCost: 0,
      totalUnits: 0,
      costPerUnit: 0,
      avgDays: 0,
      maxUtil: 0,
      totalSpaceRequired: 0,
      excludedBySla: 0,
      slaBreachCount: 0,
      missingAvgDays: 0,
    };
  }

  const totalCost = rows.reduce((sum, row) => sum + row.TotalCost, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.VolumeUnits, 0);
  const weightedCostPerUnit = totalUnits > 0
    ? rows.reduce((sum, row) => {
        const units = row.VolumeUnits > 0 ? row.VolumeUnits : 1;
        const cpu = Number.isFinite(row.TotalCost) && Number.isFinite(row.VolumeUnits) && row.VolumeUnits > 0
          ? row.TotalCost / row.VolumeUnits
          : 0;
        return sum + cpu * units;
      }, 0) / totalUnits
    : 0;
  let avgDaysNumerator = 0;
  let avgDaysWeight = 0;
  rows.forEach((row) => {
    const weight = row.VolumeUnits > 0 ? row.VolumeUnits : 1;
    avgDaysNumerator += row.AvgDays * weight;
    avgDaysWeight += weight;
  });
  const avgDays = avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;
  const maxUtil = rows.reduce((max, row) => Math.max(max, row.UtilPct), 0);
  const totalSpaceRequired = rows.reduce((sum, row) => sum + row.SpaceRequired, 0);
  const excludedBySla = rows.reduce((sum, row) => sum + row.ExcludedBySLACount, 0);
  const slaBreachCount = rows.reduce((sum, row) => sum + row.SLABreachCount, 0);
  const missingAvgDays = rows.filter((row) => row.AvgDays === 0).length;

  return {
    totalCost,
    totalUnits,
    costPerUnit: Number(weightedCostPerUnit.toFixed(2)),
    avgDays: Number(avgDays.toFixed(2)),
    maxUtil: Number(maxUtil.toFixed(2)),
    totalSpaceRequired,
    excludedBySla,
    slaBreachCount,
    missingAvgDays,
  };
};

const summarizeBaselineFromHeader = (
  header: ScenarioRunHeader,
  rows: ScenarioRunResultsDC[],
): ScenarioBuildSummary => ({
  totalCost: Number(header.TotalCost ?? 0),
  totalUnits: Number(header.TotalCount ?? 0),
  costPerUnit: Number(header.CostPerUnit ?? 0),
  avgDays: Number(header.AvgDeliveryDays ?? 0),
  maxUtil: Number(header.MaxUtilPct ?? 0),
  totalSpaceRequired: Number(header.TotalSpaceRequired ?? 0),
  excludedBySla: Number(header.ExcludedBySLACount ?? 0),
  slaBreachCount: rows.reduce((sum, row) => sum + row.SLABreachCount, 0),
  missingAvgDays: rows.filter((row) => row.AvgDays === 0).length,
});

const buildAlertFlagsFromSummary = (summary: ScenarioBuildSummary) => {
  const flags: string[] = [];
  if (summary.maxUtil > 100) flags.push('OverCap');
  if (summary.totalUnits > 0 && summary.slaBreachCount > 0) flags.push('SLA');
  if (summary.missingAvgDays > 0) flags.push('MissingRates');
  return flags.join(',');
};

const zeroSuppressedDcRow = (row: ScenarioRunResultsDC): ScenarioRunResultsDC => ({
  ...row,
  TotalCost: 0,
  VolumeUnits: 0,
  AvgDays: 0,
  UtilPct: 0,
  SpaceRequired: 0,
  SpaceCore: 0,
  SpaceBCV: 0,
  SLABreachCount: 0,
  ExcludedBySLACount: 0,
  IsSuppressed: 'Y',
});

const normalizeResultsForSuppressedDcs = (
  rows: ScenarioRunResultsDC[],
  suppressedDcs: string[],
): ScenarioRunResultsDC[] => {
  const suppressedSet = new Set(
    suppressedDcs
      .map((dc) => String(dc || '').trim())
      .filter(Boolean),
  );

  return rows.map((row) => {
    const isSuppressed = suppressedSet.has(row.DCName) || row.IsSuppressed === 'Y';
    return isSuppressed
      ? zeroSuppressedDcRow(row)
      : {
          ...row,
          IsSuppressed: 'N',
        };
  });
};

const applySummaryToHeader = (
  header: ScenarioRunHeader,
  summary: ScenarioBuildSummary,
  lastUpdatedAt: string,
): ScenarioRunHeader => ({
  ...header,
  TotalCost: summary.totalCost,
  CostPerUnit: summary.costPerUnit,
  AvgDeliveryDays: summary.avgDays,
  TotalCount: summary.totalUnits,
  MaxUtilPct: summary.maxUtil,
  TotalSpaceRequired: summary.totalSpaceRequired,
  ExcludedBySLACount: summary.excludedBySla,
  AlertFlags: buildAlertFlagsFromSummary(summary),
  LastUpdatedAt: lastUpdatedAt,
});

export const buildScenarioArtifacts = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
): ScenarioBuildResult => {
  const normalizedPayload: ScenarioSubmit = {
    ...payload,
    input: normalizeScenarioTypeSpecificInput(payload.input),
  };
  const scenarioId = buildScenarioId(context.scenarioHeaders.length);
  const scenarioTypeIsBaseline = isBaselineScenarioType(normalizedPayload.input.scenarioType);
  const exactBaseline = scenarioTypeIsBaseline
    ? getExactBaselineHeader(context.scenarioHeaders, normalizedPayload.input.region)
    : null;
  const effectiveBaselineScenarioId = scenarioTypeIsBaseline
    ? exactBaseline?.ScenarioRunID ?? normalizedPayload.input.baselineScenarioId
    : normalizedPayload.input.baselineScenarioId;
  const baseline = getBaselineHeader(context.scenarioHeaders, normalizedPayload.input.region, effectiveBaselineScenarioId);
  const laneSourceBaseline = getLaneSourceBaselineHeader(
    context.scenarioHeaders,
    normalizedPayload.input.region,
    normalizedPayload.input.scenarioType,
    effectiveBaselineScenarioId,
  );
  const headerBase = buildScenarioHeader(normalizedPayload, context, scenarioId);
  const config = buildScenarioConfig(normalizedPayload, scenarioId);
  const mode = isBaselineScenarioType(normalizedPayload.input.scenarioType) && getScenarioMode(normalizedPayload.input.scenarioType, normalizedPayload.input.utilCap, normalizedPayload.input.suppressedDCs) === 'baseline'
    ? 'baseline'
    : 'allocate';
  const baselineDcRows = baseline
    ? context.scenarioResultsDC.filter((row) => row.ScenarioRunID === baseline.ScenarioRunID)
    : context.scenarioResultsDC;
  const baselineLaneRows = getBaselineLaneRows(
    context,
    normalizedPayload.input.scenarioType,
    laneSourceBaseline?.ScenarioRunID ?? baseline?.ScenarioRunID ?? normalizedPayload.input.baselineScenarioId ?? null,
  );

  if (shouldLogLaneSource) {
    const laneSourceId = laneSourceBaseline?.ScenarioRunID ?? baseline?.ScenarioRunID ?? normalizedPayload.input.baselineScenarioId ?? null;
    const sourceLabel = laneSourceId && context.laneRowsByScenarioId?.[laneSourceId]?.length
      ? 'laneRowsByScenarioId'
      : 'raw lane map fallback';

    const rawFromMap = laneSourceId && context.laneRowsByScenarioId?.[laneSourceId];
    const rawCount = rawFromMap?.length || 0;

    // Sample a few rows to show their dedupe keys
    const sampleRows = baselineLaneRows.slice(0, 6);
    const sampleKeys = sampleRows.map((row) => ({
      key: [row.Dest3Zip, row.Channel, row.Terms, row.DestState, row.PartyName || row.CustomerGroup || '', row.ScenarioType || ''].join('|'),
      assignedDC: row.AssignedDC,
      costingWH: row.CostingWarehouse,
    }));

    console.groupCollapsed('[Scenario Builder] lane source');
    console.log({
      scenarioId,
      scenarioType: normalizedPayload.input.scenarioType,
      baselineScenarioId: baseline?.ScenarioRunID ?? normalizedPayload.input.baselineScenarioId ?? null,
      laneSourceScenarioId: laneSourceBaseline?.ScenarioRunID ?? null,
      sourceLabel,
      rawCountBeforeCanon: rawCount,
      laneCountAfterCanon: baselineLaneRows.length,
      sampleDedupeKeys: sampleKeys,
    });
    console.groupEnd();
  }

  let resultsDC: ScenarioRunResultsDC[];
  let resultsLanes: ScenarioRunResultsLane[];
  let summary: ScenarioBuildSummary;

  if (mode === 'baseline') {
    const canonicalDcRows = baselineDcRows.map((row) => ({ ...row, ScenarioRunID: scenarioId }));
    const canonicalLaneRows = canonicalizeBaselineLaneRows(baselineLaneRows).map((row) => ({ ...row, ScenarioRunID: scenarioId }));
    const capacityMap = buildCapacityMap(context.dcCapacityRows, normalizedPayload.input.utilCap);
    if (shouldLogLaneSource) {
      console.groupCollapsed('[Scenario Builder] baseline header');
      console.table([{
        scenarioId,
        baselineScenarioId: baseline?.ScenarioRunID ?? normalizedPayload.input.baselineScenarioId ?? null,
        storedTotalCost: baseline?.TotalCost ?? null,
        storedCostPerUnit: baseline?.CostPerUnit ?? null,
        storedAvgDeliveryDays: baseline?.AvgDeliveryDays ?? null,
        storedMaxUtilPct: baseline?.MaxUtilPct ?? null,
        storedTotalSpaceRequired: baseline?.TotalSpaceRequired ?? null,
        storedTotalCount: baseline?.TotalCount ?? null,
      }]);
      console.groupEnd();
    }
    const annotated = annotateCapacityOutputs(
      scenarioId,
      canonicalLaneRows,
      canonicalDcRows,
      capacityMap.byName,
      capacityMap.rawByName,
    );
    resultsDC = annotated.dcRows;
    resultsLanes = annotated.laneRows;
    summary = summarizeBaselineFromHeader(baseline ?? headerBase, resultsDC);
  } else {
    const allocation = allocateScenarioOutputs({
      scenarioId,
      scenarioType: normalizedPayload.input.scenarioType,
      lanes: baselineLaneRows,
      activeDcs: normalizedPayload.input.activeDCs,
      suppressedDcs: normalizedPayload.input.suppressedDCs,
      dcCapacityRows: context.dcCapacityRows,
      utilCap: normalizedPayload.input.utilCap,
      allowRelocationPrepaid: normalizedPayload.input.allowRelocationPrepaid,
      allowRelocationCollect: normalizedPayload.input.allowRelocationCollect,
    });
    resultsDC = allocation.resultsDC;
    resultsLanes = allocation.resultsLanes;
    summary = allocation.summary;
  }

  const header: ScenarioRunHeader = resultsDC.length === 0
    ? headerBase
    : mode === 'baseline' && baseline
      ? {
        ...headerBase,
        TotalCost: Number(baseline.TotalCost ?? headerBase.TotalCost ?? 0),
        CostPerUnit: Number(baseline.CostPerUnit ?? headerBase.CostPerUnit ?? 0),
        AvgDeliveryDays: Number(baseline.AvgDeliveryDays ?? headerBase.AvgDeliveryDays ?? 0),
        AvgTransitDays: baseline.AvgTransitDays ?? headerBase.AvgTransitDays ?? null,
        TotalCount: Number(baseline.TotalCount ?? headerBase.TotalCount ?? 0),
        SLABreachPct: Number(baseline.SLABreachPct ?? headerBase.SLABreachPct ?? 0),
        ExcludedBySLACount: Number(baseline.ExcludedBySLACount ?? headerBase.ExcludedBySLACount ?? 0),
        MaxUtilPct: Number(baseline.MaxUtilPct ?? headerBase.MaxUtilPct ?? 0),
        TotalSpaceRequired: Number(baseline.TotalSpaceRequired ?? headerBase.TotalSpaceRequired ?? 0),
        FootprintMode: baseline.FootprintMode || headerBase.FootprintMode || 'NA',
        LevelLoad: baseline.LevelLoad || headerBase.LevelLoad || 'NA',
        UtilizationCap: baseline.UtilizationCap || headerBase.UtilizationCap || 'NA',
        CollectTreatment: baseline.CollectTreatment || headerBase.CollectTreatment || 'NA',
        AlertFlags: baseline.AlertFlags || headerBase.AlertFlags || '',
      }
      : {
        ...headerBase,
        TotalCost: summary.totalCost,
        CostPerUnit: summary.costPerUnit,
        AvgDeliveryDays: summary.avgDays,
        TotalCount: summary.totalUnits,
        MaxUtilPct: summary.maxUtil,
        TotalSpaceRequired: summary.totalSpaceRequired,
        ExcludedBySLACount: summary.excludedBySla,
        AlertFlags: buildAlertFlagsFromSummary(summary),
      };

  return {
    baselineScenarioId: baseline?.ScenarioRunID ?? normalizedPayload.input.baselineScenarioId ?? null,
    baselineDataflowId: baseline?.DataflowID ?? normalizedPayload.input.baselineDataflowId,
    header,
    config,
    resultsDC,
    resultsLanes,
    summary,
  };
};

export const buildScenarioRepositoryRecord = (
  payload: ScenarioSubmit,
  context: ScenarioBuildContext,
  artifact: ScenarioBuildResult,
): ScenarioRepositoryRecord => toRepositoryRecord(payload, context, artifact);

export const reconcileScenarioRepositoryRecordWithSuppressedDcs = (
  record: ScenarioRepositoryRecord,
): ScenarioRepositoryRecord => {
  const now = getNowIso();
  const suppressedDcs = [...(record.definition.suppressedDcs || [])];

  if (!record.snapshot || suppressedDcs.length === 0) {
    return {
      ...record,
      definition: {
        ...record.definition,
        updatedAt: now,
      },
      snapshot: record.snapshot
        ? {
            ...record.snapshot,
            updatedAt: now,
          }
        : null,
    };
  }

  const normalizedResultsDC = normalizeResultsForSuppressedDcs(record.snapshot.resultsDC, suppressedDcs);
  const summary = summarizeDcResults(normalizedResultsDC);
  const activeDcs = record.definition.selectedDcs.filter((dc) => !suppressedDcs.includes(dc));

  return {
    ...record,
    definition: {
      ...record.definition,
      selectedDcs: [...record.definition.selectedDcs],
      suppressedDcs,
      updatedAt: now,
    },
    snapshot: {
      ...record.snapshot,
      header: applySummaryToHeader(record.snapshot.header, summary, now),
      config: {
        ...record.snapshot.config,
        ActiveDCs: activeDcs.join(','),
        SuppressedDCs: suppressedDcs.join(','),
      },
      resultsDC: normalizedResultsDC,
      resultsLanes: record.snapshot.resultsLanes.map((row) => ({ ...row })),
      summary,
      updatedAt: now,
    },
  };
};

const parseStoredUtilCap = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildLegacyScenarioConfig = (
  header: ScenarioRunHeader,
  resultsDC: ScenarioRunResultsDC[],
): ScenarioRunConfig => {
  const activeDcs = Array.from(new Set(resultsDC.filter((row) => row.IsSuppressed !== 'Y').map((row) => row.DCName))).filter(Boolean);
  const suppressedDcs = Array.from(new Set(resultsDC.filter((row) => row.IsSuppressed === 'Y').map((row) => row.DCName))).filter(Boolean);
  const collectTreatment = String(header.CollectTreatment || '').trim().toLowerCase();
  const allowRelocationCollect = collectTreatment.includes('relocatable')
    ? 'Y'
    : collectTreatment === 'na'
      ? 'Y'
      : 'N';

  return {
    ScenarioRunID: header.ScenarioRunID,
    ActiveDCs: activeDcs.join(','),
    SuppressedDCs: suppressedDcs.join(','),
    FootprintMode: ((header.FootprintMode === 'Unconstrained' ? 'Unconstrained' : 'Fixed') as ScenarioRunConfig['FootprintMode']),
    UtilCapPct: parseStoredUtilCap(header.UtilizationCap),
    LevelLoadMode: (header.LevelLoad === 'On' ? 'On' : 'Off'),
    LeadTimeCapDays: null,
    CostVsServiceWeight: 50,
    AllowRelocationPrepaid: 'Y',
    AllowRelocationCollect: allowRelocationCollect,
    BCVRuleSet: 'Default',
    FuelSurchargeMode: 'FromRates',
    FuelSurchargeOverridePct: null,
    AccessorialFlags: 'NA',
    Notes: header.LatestComment || 'Imported from Domo',
  };
};

export const buildScenarioRepositoryRecordFromState = (
  header: ScenarioRunHeader,
  resultsDC: ScenarioRunResultsDC[],
  resultsLanes: ScenarioRunResultsLane[] = [],
): ScenarioRepositoryRecord => {
  const config = buildLegacyScenarioConfig(header, resultsDC);
  const summary = summarizeDcResults(resultsDC);
  return {
    definition: {
      scenarioId: header.ScenarioRunID,
      scenarioName: header.RunName,
      region: header.Region,
      scenarioType: header.ScenarioType,
      baselineScenarioId: null,
      dataflowId: header.DataflowID || '',
      selectedDcs: Array.from(new Set(resultsDC.map((row) => row.DCName))).filter(Boolean),
      suppressedDcs: resultsDC.filter((row) => row.IsSuppressed === 'Y').map((row) => row.DCName),
      utilCap: config.UtilCapPct,
      leadTimeCap: config.LeadTimeCapDays,
      costVsService: config.CostVsServiceWeight,
      termsScope: header.TermsScope,
      footprintMode: header.FootprintMode || config.FootprintMode,
      levelLoad: header.LevelLoad === 'On',
      bcvRuleSet: 'Default',
      fuelSurchargeMode: config.FuelSurchargeMode,
      fuelSurchargeOverride: config.FuelSurchargeOverridePct,
      notes: header.LatestComment || config.Notes,
      tags: header.Tags && header.Tags !== 'NA' ? header.Tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
      createdBy: header.CreatedBy,
      createdAt: header.CreatedAt,
      updatedAt: header.LastUpdatedAt,
      status: header.Status,
      lastRunBy: header.LastRunBy ?? null,
      lastRunAt: header.LastRunAt ?? null,
      lastRunExecutionId: header.LastRunExecutionId ?? null,
    },
    snapshot: {
      scenarioId: header.ScenarioRunID,
      header: { ...header },
      config,
      resultsDC: resultsDC.map((row) => ({ ...row })),
      resultsLanes: resultsLanes.map((row) => ({ ...row })),
      summary,
      createdAt: header.CreatedAt,
      updatedAt: header.LastUpdatedAt,
    },
    runHistory: [],
    overrides: [],
  };
};
