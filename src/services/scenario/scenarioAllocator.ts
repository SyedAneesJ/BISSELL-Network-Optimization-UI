import { getAdditionalCostsForDc } from '@/data';
import type { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';
import type { DomoDcCapacityRow } from '@/services';
import type { ScenarioBuildSummary } from './scenarioModels';
import { canonicalizeDcName, resolveScenarioTypePolicy } from './scenarioTypeRules';
import { summarizeDcResults } from './scenarioMetrics';

type AllocationMode = 'baseline' | 'overload' | 'constrained' | 'unconstrained' | 'tacticalConsolidation';

type LaneCandidate = {
  dc: string;
  costPerUnit: number;
  days: number;
  totalCost?: number;
  sourceIndex: 1 | 2 | 3 | 4;
};

type LaneGroup = {
  key: string;
  sourceRow: ScenarioRunResultsLane;
  laneUnits: number;
  laneSpaceRequired: number;
  candidates: LaneCandidate[];
};

type CollectRelocationDebugRow = {
  OriginalAssignedDC?: string;
  OriginalCostPerUnit?: number;
};

type DcAccumulator = {
  totalCost: number;
  volumeUnits: number;
  avgDaysWeight: number;
  avgDaysNumerator: number;
  avgTransitDaysWeight: number;
  avgTransitDaysNumerator: number;
  spaceRequired: number;
  spaceCore: number;
  spaceBCV: number;
  slaBreachCount: number;
  excludedBySlaCount: number;
  actualSpace: number;
  inboundSpend: number;
  parcelSpend: number;
  ltlSpend: number;
  tlSpend: number;
  distributionCost: number;
};

type AllocationInput = {
  scenarioId: string;
  scenarioType: string;
  entityScope?: string;
  lanes: ScenarioRunResultsLane[];
  activeDcs: string[];
  suppressedDcs: string[];
  dcCapacityRows?: DomoDcCapacityRow[];
  utilCap: number;
  levelLoad?: boolean;
  allowRelocationPrepaid?: boolean;
  allowRelocationCollect?: boolean;
};

type AllocationResult = {
  resultsDC: ScenarioRunResultsDC[];
  resultsLanes: ScenarioRunResultsLane[];
  summary: ScenarioBuildSummary;
};

const shouldLogAllocation = String(import.meta.env.VITE_SCENARIO_ALLOCATION_LOGS ?? 'true').toLowerCase() !== 'false';

const normalizeText = (value: unknown): string => String(value || '').trim();

const normalizeDcKey = (value: unknown): string => normalizeText(canonicalizeDcName(value)).toLowerCase();

const laneTerms = (lane: ScenarioRunResultsLane): string => normalizeText(lane.Terms).toLowerCase();

const laneSourceDc = (lane: ScenarioRunResultsLane): string =>
  normalizeText(canonicalizeDcName(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom));

const formatDcDisplayName = (value: unknown): string => {
  const text = normalizeText(canonicalizeDcName(value));
  if (!text) return '';
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
};

const clampUtilCap = (value: number): number => Math.max(0, Math.min(100, Number(value || 0)));

const laneGroupKey = (lane: ScenarioRunResultsLane): string =>
  [
    lane.Dest3Zip || '',
    lane.Channel || '',
    lane.Terms || '',
    lane.DestState || '',
    lane.PartyName || lane.CustomerGroup || '',
    lane.ScenarioType || '',
  ].join('|');

const laneSpaceRequired = (lane: ScenarioRunResultsLane): number => {
  const typedLane = lane as ScenarioRunResultsLane & {
    Threshold?: number;
    SquareFootage?: number;
  };
  const candidates = [
    lane.WorkingCapacity,
    lane.FootprintContribution,
    typedLane.Threshold,
    typedLane.SquareFootage,
  ];
  for (const raw of candidates) {
    const demand = Number(raw);
    if (Number.isFinite(demand) && demand > 0) return demand;
  }
  return 0;
};

const normalizeEntityLabel = (value: unknown, scenarioEntityScope?: string): 'core' | 'bcv' | null => {
  const text = normalizeText(value).toLowerCase();
  if (!text || text === 'na') return null;
  const scopeParts = normalizeText(scenarioEntityScope)
    .split(/[+/]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const secondEntity = scopeParts.find((part) => !part.includes('core'));
  if (text.includes('bcv') || text.includes('entity b') || (secondEntity && text === secondEntity)) return 'bcv';
  if (text.includes('core')) return 'core';
  const firstEntity = scopeParts.find((part) => part.includes('core')) || scopeParts[0];
  if (firstEntity && text === firstEntity) return 'core';
  return null;
};

const splitLaneSpaceByEntity = (
  lane: ScenarioRunResultsLane,
  spaceDemand: number,
  scenarioEntityScope?: string,
): { core: number; bcv: number } => {
  const typedLane = lane as ScenarioRunResultsLane & {
    EntityScope?: string;
    Entity?: string;
    entityScope?: string;
    entity?: string;
    dcEntity?: string;
  };
  const laneEntity =
    normalizeEntityLabel(typedLane.EntityScope, scenarioEntityScope) ||
    normalizeEntityLabel(typedLane.Entity, scenarioEntityScope) ||
    normalizeEntityLabel(typedLane.entityScope, scenarioEntityScope) ||
    normalizeEntityLabel(typedLane.entity, scenarioEntityScope) ||
    normalizeEntityLabel(typedLane.dcEntity, scenarioEntityScope);
  if (laneEntity === 'bcv') return { core: 0, bcv: spaceDemand };
  if (laneEntity === 'core') return { core: spaceDemand, bcv: 0 };

  const scope = normalizeText(scenarioEntityScope).toLowerCase();
  const hasCore = scope.includes('core');
  const hasBcv = scope.includes('bcv');
  if (hasBcv && !hasCore) return { core: 0, bcv: spaceDemand };
  if (hasCore && !hasBcv) return { core: spaceDemand, bcv: 0 };

  return { core: 0, bcv: 0 };
};

const inferLaneUnits = (lane: ScenarioRunResultsLane): number => {
  const typedLane = lane as ScenarioRunResultsLane & {
    TotalCount?: number;
    TotalUnits?: number;
    VolumeUnits?: number;
  };

  const explicitUnits = Number(typedLane.TotalCount ?? typedLane.TotalUnits ?? typedLane.VolumeUnits ?? 0);
  if (Number.isFinite(explicitUnits) && explicitUnits > 0) return explicitUnits;

  const totalCost = Number(lane.TotalCost ?? lane.LaneCost ?? 0);
  const sourceCpu = Number(lane.CostPerUnit ?? 0);
  if (Number.isFinite(totalCost) && totalCost > 0 && Number.isFinite(sourceCpu) && sourceCpu > 0) {
    return Math.max(1, totalCost / sourceCpu);
  }

  const rankedCpu = Number(lane.RankedOption1Cost ?? 0);
  if (Number.isFinite(totalCost) && totalCost > 0 && Number.isFinite(rankedCpu) && rankedCpu > 0) {
    return Math.max(1, totalCost / rankedCpu);
  }

  return 1;
};

const isLaneSlaBreach = (lane: ScenarioRunResultsLane): boolean => {
  const text = String(lane.SLABreachFlag || lane.ExcludedBySLAFlag || lane.BreachFlag || '').trim().toLowerCase();
  return text === 'y' || text === 'yes' || text === 'true' || (text.includes('breach') && !text.includes('no breach') && !text.includes('non-breach'));
};

const capacityValue = (row?: DomoDcCapacityRow): number => {
  if (!row) return Number.POSITIVE_INFINITY;
  const workingCapacity = Number(row.WorkingCapacitySqFt ?? 0);
  if (Number.isFinite(workingCapacity) && workingCapacity > 0) return workingCapacity;
  if (Number.isFinite(row.Sqft) && row.Sqft > 0) return row.Sqft;
  return Number.POSITIVE_INFINITY;
};

const buildRawCandidates = (lane: ScenarioRunResultsLane): LaneCandidate[] => {
  const candidates: LaneCandidate[] = [];
  const addCandidate = (dc: unknown, costPerUnit: unknown, days: unknown, sourceIndex: 1 | 2 | 3 | 4) => {
    const dcName = normalizeText(dc);
    if (!dcName) return;
    const parsedCpu = Number(costPerUnit);
    const parsedDays = Number(days);
    candidates.push({
      dc: dcName,
      costPerUnit: Number.isFinite(parsedCpu) ? parsedCpu : 0,
      days: Number.isFinite(parsedDays) ? parsedDays : 0,
      sourceIndex,
    });
  };

  addCandidate(lane.RankedOption1DC, lane.RankedOption1Cost, lane.RankedOption1Days, 1);
  addCandidate(lane.RankedOption2DC, lane.RankedOption2Cost, lane.RankedOption2Days, 2);
  addCandidate(lane.RankedOption3DC, lane.RankedOption3Cost, lane.RankedOption3Days, 3);
  addCandidate(lane.RankedOption4DC, lane.RankedOption4Cost, lane.RankedOption4Days, 4);

  if (candidates.length === 0) {
    const fallbackDc = normalizeText(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom);
    if (fallbackDc) {
      const fallbackCpu = Number(
        lane.CostPerUnit ??
        (Number.isFinite(Number(lane.LaneCost)) && inferLaneUnits(lane) > 0
          ? Number(lane.LaneCost) / inferLaneUnits(lane)
          : 0),
      );
      candidates.push({
        dc: fallbackDc,
        costPerUnit: Number.isFinite(fallbackCpu) ? fallbackCpu : 0,
        days: Number(lane.DeliveryDays ?? 0) || 0,
        sourceIndex: 1,
      });
    }
  }

  return candidates
    .filter((candidate) => candidate.dc && normalizeDcKey(candidate.dc) !== 'na')
    .sort((a, b) => {
      const costA = a.totalCost ?? a.costPerUnit;
      const costB = b.totalCost ?? b.costPerUnit;
      if (costA !== costB && costA > 0 && costB > 0) return costA - costB;
      if (a.days !== b.days) return a.days - b.days;
      return a.sourceIndex - b.sourceIndex;
    });
};

const laneQualityScore = (lane: ScenarioRunResultsLane): number => {
  const ranked1Dc = normalizeText(lane.RankedOption1DC);
  const ranked2Dc = normalizeText(lane.RankedOption2DC);
  const ranked3Dc = normalizeText(lane.RankedOption3DC);
  let score = 0;

  if (ranked1Dc) score += 10;
  if (ranked2Dc) score += 8;
  if (ranked3Dc) score += 6;
  if (Number(lane.RankedOption1Cost ?? 0) > 0) score += 10;
  if (Number(lane.RankedOption2Cost ?? 0) > 0) score += 8;
  if (Number(lane.RankedOption3Cost ?? 0) > 0) score += 6;
  if (Number(lane.CostPerUnit ?? 0) > 0) score += 4;
  if (Number(lane.TotalCost ?? 0) > 0) score += 2;
  if (normalizeText(lane.ChosenRank)) score += 1;

  return score;
};

const canonicalizeLaneRows = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] => {
  const grouped = new Map<string, ScenarioRunResultsLane[]>();
  rows.forEach((row) => {
    const key = laneGroupKey(row);
    const list = grouped.get(key) || [];
    list.push({ ...row });
    grouped.set(key, list);
  });

  return Array.from(grouped.values()).map((group) =>
    group.sort((a, b) => {
      const scoreDelta = laneQualityScore(b) - laneQualityScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      const costA = Number(a.TotalCost ?? a.LaneCost ?? a.RankedOption1Cost ?? 0);
      const costB = Number(b.TotalCost ?? b.LaneCost ?? b.RankedOption1Cost ?? 0);
      if (costA !== costB && costA > 0 && costB > 0) return costA - costB;
      const cpuA = Number(a.CostPerUnit ?? 0);
      const cpuB = Number(b.CostPerUnit ?? 0);
      if (cpuA !== cpuB) return cpuA - cpuB;
      return normalizeText(a.AssignedDC || a.CostingWarehouse || a.DefaultShipFrom).localeCompare(
        normalizeText(b.AssignedDC || b.CostingWarehouse || b.DefaultShipFrom),
      );
    })[0],
  );
};

const buildLaneGroups = (rows: ScenarioRunResultsLane[]): LaneGroup[] => {
  const grouped = new Map<string, ScenarioRunResultsLane[]>();
  rows.forEach((row) => {
    const key = laneGroupKey(row);
    const list = grouped.get(key) || [];
    list.push({ ...row });
    grouped.set(key, list);
  });

  return Array.from(grouped.entries()).map(([key, groupRows]) => {
    const sortedGroupRows = [...groupRows].sort((a, b) => {
      const costA = Number(a.TotalCost ?? a.LaneCost ?? 0);
      const costB = Number(b.TotalCost ?? b.LaneCost ?? 0);
      if (costA !== costB && costA > 0 && costB > 0) return costA - costB;
      const cpuA = Number(a.CostPerUnit ?? 0);
      const cpuB = Number(b.CostPerUnit ?? 0);
      return cpuA - cpuB;
    });

    const sourceRow = { ...sortedGroupRows[0] };
    const laneUnits = inferLaneUnits(sourceRow);
    const spaceReq = laneSpaceRequired(sourceRow);

    const candidatesFromGroupRows: LaneCandidate[] = [];
    const seenDcs = new Set<string>();

    sortedGroupRows.forEach((row) => {
      const dcName = normalizeText(canonicalizeDcName(row.CostingWarehouse || row.AssignedDC || row.DefaultShipFrom));
      const dcKey = normalizeDcKey(dcName);
      if (!dcName || !dcKey || dcKey === 'na' || seenDcs.has(dcKey)) return;
      seenDcs.add(dcKey);
      const cpu = Number(row.CostPerUnit ?? 0);
      const days = Number(row.DeliveryDays ?? row.AvgDeliveryDays ?? 0);
      const totalCost = Number(row.TotalCost ?? row.LaneCost ?? 0);
      candidatesFromGroupRows.push({
        dc: dcName,
        costPerUnit: Number.isFinite(cpu) ? cpu : 0,
        days: Number.isFinite(days) ? days : 0,
        totalCost: Number.isFinite(totalCost) && totalCost > 0 ? totalCost : undefined,
        sourceIndex: (candidatesFromGroupRows.length + 1) as 1 | 2 | 3 | 4,
      });
    });

    // Populate 4 distinct ranked option properties onto sourceRow
    const opt1 = candidatesFromGroupRows[0];
    const opt2 = candidatesFromGroupRows[1];
    const opt3 = candidatesFromGroupRows[2];
    const opt4 = candidatesFromGroupRows[3];

    sourceRow.RankedOption1DC = opt1 ? formatDcDisplayName(opt1.dc) : '';
    sourceRow.RankedOption1Cost = opt1 ? (opt1.totalCost ?? opt1.costPerUnit) : 0;
    sourceRow.RankedOption1Days = opt1 ? opt1.days : 0;

    sourceRow.RankedOption2DC = opt2 ? formatDcDisplayName(opt2.dc) : '';
    sourceRow.RankedOption2Cost = opt2 ? (opt2.totalCost ?? opt2.costPerUnit) : 0;
    sourceRow.RankedOption2Days = opt2 ? opt2.days : 0;

    sourceRow.RankedOption3DC = opt3 ? formatDcDisplayName(opt3.dc) : '';
    sourceRow.RankedOption3Cost = opt3 ? (opt3.totalCost ?? opt3.costPerUnit) : 0;
    sourceRow.RankedOption3Days = opt3 ? opt3.days : 0;

    sourceRow.RankedOption4DC = opt4 ? formatDcDisplayName(opt4.dc) : '';
    sourceRow.RankedOption4Cost = opt4 ? (opt4.totalCost ?? opt4.costPerUnit) : 0;
    sourceRow.RankedOption4Days = opt4 ? opt4.days : 0;

    const finalCandidates = candidatesFromGroupRows.length > 0
      ? candidatesFromGroupRows
      : buildRawCandidates(sourceRow);

    return {
      key: key || sourceRow.ScenarioRunID || 'UNKNOWN',
      sourceRow,
      laneUnits,
      laneSpaceRequired: spaceReq,
      candidates: finalCandidates,
    };
  });
};

export const buildCapacityMap = (rows: DomoDcCapacityRow[] | undefined, utilCap: number) => {
  const byName = new Map<string, number>();
  const rawByName = new Map<string, number>();
  const meta = new Map<string, DomoDcCapacityRow>();
  (rows || []).forEach((row) => {
    const dcName = normalizeText(canonicalizeDcName(row.DCName));
    const dcKey = normalizeDcKey(dcName);
    if (!dcName) return;
    const rawCapacity = capacityValue(row);
    rawByName.set(dcKey, rawCapacity);
    byName.set(
      dcKey,
      Number.isFinite(rawCapacity) && rawCapacity > 0
        ? rawCapacity * clampUtilCap(utilCap) / 100
        : Number.POSITIVE_INFINITY,
    );
    meta.set(dcKey, row);
  });
  return { byName, rawByName, meta };
};

const isCandidateActive = (
  dc: string,
  activeSet: Set<string>,
  suppressedSet: Set<string>,
): boolean => {
  const dcKey = normalizeDcKey(canonicalizeDcName(dc));
  if (!dcKey) return false;
  if (suppressedSet.has(dcKey)) return false;
  if (activeSet.size === 0) return true;
  return activeSet.has(dcKey);
};

const resolveMode = (input: AllocationInput, suppressedSet: Set<string>): AllocationMode => {
  const policy = resolveScenarioTypePolicy(input.scenarioType);
  if (policy.allocationMode !== 'auto') {
    if (policy.allocationMode === 'tacticalConsolidation') return 'constrained';
    return policy.allocationMode as AllocationMode;
  }
  const utilCap = clampUtilCap(input.utilCap);
  const hasSuppressed = suppressedSet.size > 0;
  if (!hasSuppressed && utilCap >= 100) return 'baseline';
  if (utilCap >= 100) return 'overload';
  return 'constrained';
};

const laneCollectPolicy = (input: AllocationInput): 'fixed' | 'relocatable' =>
  resolveScenarioTypePolicy(input.scenarioType).collectPolicy;

const isStrictFixedBcvScenario = (input: AllocationInput): boolean =>
  resolveScenarioTypePolicy(input.scenarioType).scenarioType === 'BCV Ingestion Only';

const canRelocateLane = (
  lane: ScenarioRunResultsLane,
  input: AllocationInput,
  suppressedSet: Set<string>,
): boolean => {
  const terms = laneTerms(lane);
  if (terms.includes('collect')) {
    if (laneCollectPolicy(input) === 'relocatable') return true;
    if (isStrictFixedBcvScenario(input)) return false;
    const sourceDc = normalizeDcKey(laneSourceDc(lane));
    return Boolean(sourceDc) && suppressedSet.has(sourceDc);
  }
  if (terms.includes('prepaid') || terms === 'pp') {
    return input.allowRelocationPrepaid !== false;
  }
  return true;
};

const restrictCandidatesForLane = (
  lane: ScenarioRunResultsLane,
  candidates: LaneCandidate[],
  input: AllocationInput,
  suppressedSet: Set<string>,
): LaneCandidate[] => {
  const terms = laneTerms(lane);
  if (terms.includes('collect')) {
    if (laneCollectPolicy(input) === 'relocatable') return candidates;
    if (isStrictFixedBcvScenario(input)) {
      const sourceDc = normalizeDcKey(laneSourceDc(lane));
      const fixedCandidate = candidates.find((candidate) => normalizeDcKey(candidate.dc) === sourceDc);
      return fixedCandidate ? [fixedCandidate] : candidates;
    }
    const sourceDc = normalizeDcKey(laneSourceDc(lane));
    if (sourceDc && !suppressedSet.has(sourceDc)) {
      const fixedCandidate = candidates.find((candidate) => normalizeDcKey(candidate.dc) === sourceDc);
      return fixedCandidate ? [fixedCandidate] : candidates;
    }
    return candidates;
  }

  if (canRelocateLane(lane, input, suppressedSet)) return candidates;
  const sourceDc = normalizeDcKey(laneSourceDc(lane));
  if (!sourceDc) return candidates;
  const fixedCandidate = candidates.find((candidate) => normalizeDcKey(candidate.dc) === sourceDc);
  return fixedCandidate ? [fixedCandidate] : candidates;
};

const selectedCandidateRank = (sourceRow: ScenarioRunResultsLane, selectedDc: string): number => {
  const rawCandidates = buildRawCandidates(sourceRow);
  const normalized = normalizeDcKey(selectedDc);
  const index = rawCandidates.findIndex(c => normalizeDcKey(c.dc) === normalized);
  return index >= 0 ? index + 1 : rawCandidates.length + 1;
};

const buildSelectedLaneRow = (
  scenarioId: string,
  sourceRow: ScenarioRunResultsLane,
  demand: number,
  laneUnits: number,
  selected: LaneCandidate,
  selectedCapacity: number,
): ScenarioRunResultsLane => {
  const selectedCpu = Number(selected.costPerUnit.toFixed(2));
  const bestCpu = Number(
    Math.min(
      ...buildRawCandidates(sourceRow)
        .map((candidate) => candidate.costPerUnit)
        .filter((value) => Number.isFinite(value) && value > 0),
      selectedCpu,
    ).toFixed(2),
  );
  const selectedRank = selectedCandidateRank(sourceRow, selected.dc);

  const isOriginalDc = normalizeDcKey(selected.dc) === normalizeDcKey(laneSourceDc(sourceRow));
  let selectedTotal: number;
  let inboundSpend = sourceRow.InboundSpend;
  let distributionCost = sourceRow.DistributionCost;
  let parcelSpend = sourceRow.ParcelSpend;
  let ltlSpend = sourceRow.LtlSpend;
  let tlSpend = sourceRow.TlSpend;

  if (isOriginalDc && Number(sourceRow.TotalCost ?? sourceRow.LaneCost ?? 0) > 0) {
    selectedTotal = Number(sourceRow.TotalCost ?? sourceRow.LaneCost ?? 0);
  } else {
    const baseCpu = Number(sourceRow.CostPerUnit ?? 0);
    const cpuRatio = baseCpu > 0 ? selectedCpu / baseCpu : 1;
    distributionCost = typeof sourceRow.DistributionCost === 'number'
      ? Number((sourceRow.DistributionCost * cpuRatio).toFixed(2))
      : undefined;
    const computedTotal = (inboundSpend ?? 0) + (distributionCost ?? 0) + (parcelSpend ?? 0) + (ltlSpend ?? 0) + (tlSpend ?? 0);
    selectedTotal = computedTotal > 0
      ? Number(computedTotal.toFixed(2))
      : Number(sourceRow.TotalCost ?? sourceRow.LaneCost ?? (selectedCpu * Math.max(laneUnits, 1)));
  }

  return {
    ...sourceRow,
    ScenarioRunID: scenarioId,
    OriginalAssignedDC: formatDcDisplayName(laneSourceDc(sourceRow)),
    OriginalCostPerUnit: Number(Number(sourceRow.CostPerUnit ?? 0).toFixed(2)),
    AssignedDC: formatDcDisplayName(selected.dc),
    CostingWarehouse: formatDcDisplayName(selected.dc),
    DefaultShipFrom: formatDcDisplayName(sourceRow.DefaultShipFrom || selected.dc),
    ChosenRank: selectedRank,
    CostRank: selectedRank,
    LaneCost: selectedTotal,
    TotalCost: selectedTotal,
    CostPerUnit: selectedCpu,
    CostDeltaVsBest: Number(Math.max(0, selectedCpu - bestCpu).toFixed(2)),
    DeliveryDays: Number(selected.days.toFixed(2)),
    AvgDeliveryDays: Number(selected.days.toFixed(2)),
    AvgTransitDays: sourceRow.AvgTransitDays ?? null,
    FootprintContribution: demand,
    UtilImpactPct: Number((
      Number.isFinite(selectedCapacity) && selectedCapacity > 0
        ? (demand / selectedCapacity) * 100
        : 0
    ).toFixed(2)),
    OvercapFlag: Number.isFinite(selectedCapacity) && selectedCapacity > 0 && demand > selectedCapacity ? 'Y' : 'N',
    InboundSpend: inboundSpend,
    DistributionCost: distributionCost,
    ParcelSpend: parcelSpend,
    LtlSpend: ltlSpend,
    TlSpend: tlSpend,
  } as ScenarioRunResultsLane & CollectRelocationDebugRow;
};

const logBcvCollectRelocationSummary = (scenarioType: string, rows: ScenarioRunResultsLane[]) => {
  const normalizedScenarioType = normalizeText(scenarioType).toLowerCase();
  if (!normalizedScenarioType.includes('bcv ingestion')) return;

  const collectRows = rows.filter((row) => laneTerms(row).includes('collect'));
  if (collectRows.length === 0) return;

  const totals = collectRows.reduce(
    (acc, row) => {
      const debugRow = row as ScenarioRunResultsLane & CollectRelocationDebugRow;
      const sourceDc = normalizeDcKey(debugRow.OriginalAssignedDC || row.DefaultShipFrom || row.CostingWarehouse || row.AssignedDC);
      const selectedDc = normalizeDcKey(row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom);
      const units = Number(row.TotalCount ?? row.VolumeUnits ?? 0) || 0;
      const beforeCpu = Number(debugRow.OriginalCostPerUnit ?? row.CostPerUnit ?? 0);
      const afterCpu = Number(row.CostPerUnit ?? 0);
      const relocated = Boolean(sourceDc && selectedDc && sourceDc !== selectedDc);

      acc.collectLaneCount += 1;
      acc.collectUnits += units;
      acc.beforeCpuUnits += beforeCpu * Math.max(units, 1);
      acc.afterCpuUnits += afterCpu * Math.max(units, 1);
      if (relocated) {
        acc.relocatedCollectLaneCount += 1;
        if (sourceDc === 'r virginia') {
          acc.movedFromSuppressedSourceCount += 1;
        } else {
          acc.movedFromActiveSourceCount += 1;
        }
      }

      const destination = formatDcDisplayName(selectedDc) || 'NA';
      acc.destinations.set(destination, (acc.destinations.get(destination) || 0) + 1);
      return acc;
    },
    {
      collectLaneCount: 0,
      relocatedCollectLaneCount: 0,
      movedFromSuppressedSourceCount: 0,
      movedFromActiveSourceCount: 0,
      collectUnits: 0,
      beforeCpuUnits: 0,
      afterCpuUnits: 0,
      destinations: new Map<string, number>(),
    },
  );

  const beforeAvgCpu = totals.collectUnits > 0 ? totals.beforeCpuUnits / totals.collectUnits : 0;
  const afterAvgCpu = totals.collectUnits > 0 ? totals.afterCpuUnits / totals.collectUnits : 0;
  const sampleRows = collectRows.slice(0, 12).map((row) => {
    const debugRow = row as ScenarioRunResultsLane & CollectRelocationDebugRow;
    const sourceDc = normalizeDcKey(debugRow.OriginalAssignedDC || row.DefaultShipFrom || row.CostingWarehouse || row.AssignedDC);
    const selectedDc = normalizeDcKey(row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom);
    return {
      sourceDc: formatDcDisplayName(sourceDc) || 'NA',
      selectedDc: formatDcDisplayName(selectedDc) || 'NA',
      relocated: sourceDc && selectedDc && sourceDc !== selectedDc ? 'Y' : 'N',
      beforeCpu: Number((debugRow.OriginalCostPerUnit ?? row.CostPerUnit ?? 0).toFixed(2)),
      afterCpu: Number(Number(row.CostPerUnit ?? 0).toFixed(2)),
    };
  });

  console.groupCollapsed('[Scenario Allocation] BCV collect relocation');
  console.log({
    scenarioType,
    collectLaneCount: totals.collectLaneCount,
    relocatedCollectLaneCount: totals.relocatedCollectLaneCount,
    movedFromSuppressedSourceCount: totals.movedFromSuppressedSourceCount,
    movedFromActiveSourceCount: totals.movedFromActiveSourceCount,
    collectUnits: Number(totals.collectUnits.toFixed(2)),
    beforeAvgCpu: Number(beforeAvgCpu.toFixed(2)),
    afterAvgCpu: Number(afterAvgCpu.toFixed(2)),
    deltaCpu: Number((afterAvgCpu - beforeAvgCpu).toFixed(2)),
  });
  console.table(
    Array.from(totals.destinations.entries())
      .map(([DCName, LaneCount]) => ({ DCName, LaneCount }))
      .sort((a, b) => b.LaneCount - a.LaneCount || a.DCName.localeCompare(b.DCName)),
  );
  console.table(sampleRows);
  console.groupEnd();
};

type LaneTermsBucket = 'Prepaid' | 'Collect' | 'Other';

const laneTermsBucket = (lane: ScenarioRunResultsLane): LaneTermsBucket => {
  const terms = laneTerms(lane);
  if (terms.includes('collect')) return 'Collect';
  if (terms.includes('prepaid') || terms === 'pp') return 'Prepaid';
  return 'Other';
};

const laneUnitsForTrace = (lane: ScenarioRunResultsLane): number => {
  const typedLane = lane as ScenarioRunResultsLane & {
    TotalCount?: number;
    TotalUnits?: number;
    VolumeUnits?: number;
  };
  const units = Number(typedLane.TotalCount ?? typedLane.TotalUnits ?? typedLane.VolumeUnits ?? 0);
  return Number.isFinite(units) && units > 0 ? units : 0;
};

const originalDcForTrace = (lane: ScenarioRunResultsLane): string => {
  const debugRow = lane as ScenarioRunResultsLane & CollectRelocationDebugRow;
  return formatDcDisplayName(debugRow.OriginalAssignedDC || lane.DefaultShipFrom || lane.CostingWarehouse || lane.AssignedDC) || 'NA';
};

const assignedDcForTrace = (lane: ScenarioRunResultsLane): string =>
  formatDcDisplayName(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom) || 'NA';

const laneMovedForTrace = (lane: ScenarioRunResultsLane): boolean => {
  const originalDc = normalizeDcKey(originalDcForTrace(lane));
  const assignedDc = normalizeDcKey(assignedDcForTrace(lane));
  return Boolean(originalDc && assignedDc && originalDc !== assignedDc);
};

const laneAllocationDecisionReason = (
  lane: ScenarioRunResultsLane,
  input: AllocationInput,
  suppressedSet: Set<string>,
  mode: AllocationMode,
): string => {
  const termsBucket = laneTermsBucket(lane);
  const originalDc = originalDcForTrace(lane);
  const assignedDc = assignedDcForTrace(lane);
  const originalKey = normalizeDcKey(originalDc);
  const assignedKey = normalizeDcKey(assignedDc);
  const moved = Boolean(originalKey && assignedKey && originalKey !== assignedKey);
  const originalSuppressed = Boolean(originalKey && suppressedSet.has(originalKey));
  const selectedRank = Number(lane.ChosenRank || selectedCandidateRank(lane, assignedDc) || 0);
  const rankText = selectedRank > 0 ? `rank ${selectedRank}` : 'an eligible ranked option';

  if (termsBucket === 'Collect') {
    const collectPolicy = laneCollectPolicy(input);
    if (moved) {
      if (originalSuppressed) {
        return `Moved because original collect DC ${originalDc} is suppressed; allocator selected ${assignedDc}.`;
      }
      if (collectPolicy === 'relocatable') {
        return `Moved because scenario policy allows collect relocation; allocator selected ${rankText} ${assignedDc}.`;
      }
      return `Moved because the fixed collect source candidate was unavailable, so allocator selected eligible DC ${assignedDc}.`;
    }
    if (isStrictFixedBcvScenario(input)) {
      return `Not moved because BCV ingestion collect policy fixes the lane to original DC ${originalDc}.`;
    }
    if (collectPolicy !== 'relocatable' && !originalSuppressed) {
      return `Not moved because collect relocation is fixed while original DC ${originalDc} is active.`;
    }
    if (collectPolicy === 'relocatable') {
      return `Not moved because ${originalDc} remained the best eligible collect assignment in ${mode} mode.`;
    }
    return `Not moved because no eligible alternate assignment was selected.`;
  }

  if (termsBucket === 'Prepaid') {
    if (moved) {
      if (originalSuppressed) {
        return `Moved because original prepaid DC ${originalDc} is suppressed; allocator selected ${assignedDc}.`;
      }
      return `Moved because prepaid relocation is enabled; allocator selected ${rankText} ${assignedDc}.`;
    }
    if (input.allowRelocationPrepaid === false) {
      return `Not moved because prepaid relocation is disabled for this scenario.`;
    }
    return `Not moved because ${originalDc} remained the best eligible prepaid assignment in ${mode} mode.`;
  }

  if (moved) {
    return originalSuppressed
      ? `Moved because original DC ${originalDc} is suppressed; allocator selected ${assignedDc}.`
      : `Moved because allocator selected ${rankText} ${assignedDc} for this lane.`;
  }

  return `Not moved because ${originalDc} remained the selected eligible assignment.`;
};

const logScenarioLaneAllocationTrace = (
  input: AllocationInput,
  rows: ScenarioRunResultsLane[],
  suppressedSet: Set<string>,
  mode: AllocationMode,
) => {
  if (rows.length === 0) return;

  const summary = new Map<LaneTermsBucket, {
    laneCount: number;
    movedLaneCount: number;
    units: number;
    movedUnits: number;
    totalCost: number;
  }>();
  const movementMatrix = new Map<string, { terms: LaneTermsBucket; movement: string; laneCount: number; units: number; totalCost: number }>();
  const reasonCounts = new Map<string, { terms: LaneTermsBucket; moved: string; reason: string; laneCount: number }>();

  rows.forEach((lane) => {
    const terms = laneTermsBucket(lane);
    const moved = laneMovedForTrace(lane);
    const units = laneUnitsForTrace(lane);
    const totalCost = Number(lane.TotalCost ?? lane.LaneCost ?? 0) || 0;
    const existingSummary = summary.get(terms) || { laneCount: 0, movedLaneCount: 0, units: 0, movedUnits: 0, totalCost: 0 };
    existingSummary.laneCount += 1;
    existingSummary.movedLaneCount += moved ? 1 : 0;
    existingSummary.units += units;
    existingSummary.movedUnits += moved ? units : 0;
    existingSummary.totalCost += totalCost;
    summary.set(terms, existingSummary);

    const movement = `${originalDcForTrace(lane)} -> ${assignedDcForTrace(lane)}`;
    const movementKey = `${terms}|${movement}`;
    const existingMovement = movementMatrix.get(movementKey) || { terms, movement, laneCount: 0, units: 0, totalCost: 0 };
    existingMovement.laneCount += 1;
    existingMovement.units += units;
    existingMovement.totalCost += totalCost;
    movementMatrix.set(movementKey, existingMovement);

    const reason = laneAllocationDecisionReason(lane, input, suppressedSet, mode);
    const reasonKey = `${terms}|${moved ? 'Moved' : 'Not moved'}|${reason}`;
    const existingReason = reasonCounts.get(reasonKey) || { terms, moved: moved ? 'Moved' : 'Not moved', reason, laneCount: 0 };
    existingReason.laneCount += 1;
    reasonCounts.set(reasonKey, existingReason);
  });

  const summaryRows = Array.from(summary.entries())
    .map(([terms, value]) => ({
      Terms: terms,
      LaneCount: value.laneCount,
      MovedLaneCount: value.movedLaneCount,
      StayedLaneCount: value.laneCount - value.movedLaneCount,
      Units: Number(value.units.toFixed(2)),
      MovedUnits: Number(value.movedUnits.toFixed(2)),
      TotalCost: Number(value.totalCost.toFixed(2)),
    }))
    .sort((a, b) => a.Terms.localeCompare(b.Terms));

  const movementRows = Array.from(movementMatrix.values())
    .map((value) => ({
      Terms: value.terms,
      Movement: value.movement,
      LaneCount: value.laneCount,
      Units: Number(value.units.toFixed(2)),
      TotalCost: Number(value.totalCost.toFixed(2)),
    }))
    .sort((a, b) => b.LaneCount - a.LaneCount || a.Terms.localeCompare(b.Terms) || a.Movement.localeCompare(b.Movement));

  const reasonRows = Array.from(reasonCounts.values())
    .filter((value) => value.terms === 'Collect' || value.terms === 'Prepaid')
    .sort((a, b) => b.laneCount - a.laneCount || a.terms.localeCompare(b.terms) || a.moved.localeCompare(b.moved));

  const collectDecisionSample = rows
    .filter((lane) => laneTermsBucket(lane) === 'Collect')
    .slice(0, 12)
    .map((lane) => ({
      Dest3Zip: lane.Dest3Zip,
      Channel: lane.Channel,
      OriginalDC: originalDcForTrace(lane),
      AssignedDC: assignedDcForTrace(lane),
      Moved: laneMovedForTrace(lane) ? 'Y' : 'N',
      ChosenRank: lane.ChosenRank || selectedCandidateRank(lane, assignedDcForTrace(lane)),
      TotalCost: Number(Number(lane.TotalCost ?? lane.LaneCost ?? 0).toFixed(2)),
      Reason: laneAllocationDecisionReason(lane, input, suppressedSet, mode),
    }));

  console.groupCollapsed('[Scenario Allocation] Scenario-wise terms movement trace');
  console.log({
    scenarioId: input.scenarioId,
    scenarioType: input.scenarioType,
    mode,
    utilCapPct: input.utilCap,
    collectPolicy: laneCollectPolicy(input),
    allowRelocationCollectRequested: input.allowRelocationCollect,
    allowRelocationPrepaid: input.allowRelocationPrepaid !== false,
    activeDcs: input.activeDcs,
    suppressedDcs: input.suppressedDcs,
  });
  console.table(summaryRows);
  console.table(movementRows);
  if (reasonRows.length > 0) {
    console.table(reasonRows);
  }
  if (collectDecisionSample.length > 0) {
    console.table(collectDecisionSample);
  }
  console.groupEnd();
};

const selectBaselineRows = (
  scenarioId: string,
  laneGroups: LaneGroup[],
): ScenarioRunResultsLane[] =>
  laneGroups.map((group) => ({
    ...group.sourceRow,
    ScenarioRunID: scenarioId,
  }));

const selectOverloadRows = (
  scenarioId: string,
  laneGroups: LaneGroup[],
  activeSet: Set<string>,
  suppressedSet: Set<string>,
  capacityMap: Map<string, number>,
  input: AllocationInput,
): ScenarioRunResultsLane[] => {
  const activeDcScores = new Map<string, number>();

  laneGroups.forEach((group) => {
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input, suppressedSet);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : eligibleCandidates;
    eligible.forEach((candidate) => {
      const dcKey = normalizeDcKey(candidate.dc);
      if (!dcKey) return;
      const currentScore = activeDcScores.get(dcKey) || 0;
      activeDcScores.set(dcKey, currentScore + (candidate.costPerUnit * Math.max(group.laneUnits, 1)));
    });
  });

  const globalCheapestDc = Array.from(activeDcScores.entries())
    .sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0].localeCompare(b[0]);
    })[0]?.[0] || '';

  const buildForcedCandidate = (group: LaneGroup): LaneCandidate | null => {
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input, suppressedSet);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : eligibleCandidates;
    if (eligible.length === 0) return null;
    const actual = eligible.find((candidate) => normalizeDcKey(candidate.dc) === globalCheapestDc);
    if (actual) return actual;
    return eligible[0];
  };

  const selectedRows: ScenarioRunResultsLane[] = [];

  laneGroups.forEach((group) => {
    const selected = buildForcedCandidate(group);
    if (!selected) return;
    const selectedCapacity = capacityMap.get(normalizeDcKey(selected.dc)) || Number.POSITIVE_INFINITY;
    selectedRows.push(buildSelectedLaneRow(scenarioId, group.sourceRow, group.laneSpaceRequired, group.laneUnits, selected, selectedCapacity));
  });

  return selectedRows;
};

const selectUnconstrainedRows = (
  scenarioId: string,
  laneGroups: LaneGroup[],
  activeSet: Set<string>,
  suppressedSet: Set<string>,
  capacityMap: Map<string, number>,
  input: AllocationInput,
): ScenarioRunResultsLane[] => {
  const selectedRows: ScenarioRunResultsLane[] = [];

  laneGroups.forEach((group) => {
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input, suppressedSet);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : eligibleCandidates;
    const selected = eligible[0] || group.candidates[0];
    if (!selected) return;
    const selectedCapacity = capacityMap.get(normalizeDcKey(selected.dc)) || Number.POSITIVE_INFINITY;
    selectedRows.push(buildSelectedLaneRow(scenarioId, group.sourceRow, group.laneSpaceRequired, group.laneUnits, selected, selectedCapacity));
  });

  return selectedRows;
};

const selectConstrainedRows = (
  scenarioId: string,
  laneGroups: LaneGroup[],
  activeSet: Set<string>,
  suppressedSet: Set<string>,
  capacityMap: Map<string, number>,
  input: AllocationInput,
): ScenarioRunResultsLane[] => {
  const remainingCapacity = new Map<string, number>();
  capacityMap.forEach((capacity, dcKey) => {
    remainingCapacity.set(dcKey, Number.isFinite(capacity) ? capacity : Number.POSITIVE_INFINITY);
  });

  const ordered = [...laneGroups].sort((a, b) => {
    const activeA = a.candidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const activeB = b.candidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const bestA = activeA[0] || a.candidates[0];
    const bestB = activeB[0] || b.candidates[0];
    const regretA = ((activeA[1] || activeA[0] || a.candidates[1] || a.candidates[0])?.costPerUnit ?? Number.POSITIVE_INFINITY)
      - (bestA?.costPerUnit ?? Number.POSITIVE_INFINITY);
    const regretB = ((activeB[1] || activeB[0] || b.candidates[1] || b.candidates[0])?.costPerUnit ?? Number.POSITIVE_INFINITY)
      - (bestB?.costPerUnit ?? Number.POSITIVE_INFINITY);
    if (regretA !== regretB) return regretB - regretA;
    if (a.laneSpaceRequired !== b.laneSpaceRequired) return b.laneSpaceRequired - a.laneSpaceRequired;
    if ((bestA?.costPerUnit ?? Number.POSITIVE_INFINITY) !== (bestB?.costPerUnit ?? Number.POSITIVE_INFINITY)) {
      return (bestA?.costPerUnit ?? Number.POSITIVE_INFINITY) - (bestB?.costPerUnit ?? Number.POSITIVE_INFINITY);
    }
    return a.key.localeCompare(b.key);
  });

  const unallocated: LaneGroup[] = [];
  const selectedRows: ScenarioRunResultsLane[] = [];

  const isLevelLoad = Boolean(input.levelLoad) || resolveScenarioTypePolicy(input.scenarioType).defaults.levelLoad;

  ordered.forEach((group) => {
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input, suppressedSet);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : eligibleCandidates;

    // Get all candidates that physically fit within their remaining capacity
    const fittingCandidates = eligible.filter((candidate) => {
      const remaining = remainingCapacity.get(normalizeDcKey(candidate.dc));
      if (remaining === undefined || !Number.isFinite(remaining)) return true;
      return remaining + 1e-9 >= group.laneSpaceRequired;
    });

    if (fittingCandidates.length === 0) {
      unallocated.push(group);
      return;
    }

    let fitting: LaneCandidate;
    if (isLevelLoad && fittingCandidates.length > 1) {
      // Level-load: prefer the cheapest fitting candidate (fittingCandidates[0] is cost-sorted),
      // but skip it in favour of a cheaper-leaning alternative only when the cheapest DC is
      // *materially* more loaded than another option (its remaining fraction is >5% of total
      // capacity below the next candidate's remaining fraction).  This keeps cost-efficiency
      // while still preventing a single DC from filling disproportionately fast.
      const cheapest = fittingCandidates[0];
      const cheapestKey = normalizeDcKey(cheapest.dc);
      const cheapestCap = capacityMap.get(cheapestKey) ?? Number.POSITIVE_INFINITY;
      const cheapestRemaining = remainingCapacity.get(cheapestKey) ?? Number.POSITIVE_INFINITY;
      const cheapestFillFraction = Number.isFinite(cheapestCap) && cheapestCap > 0
        ? (cheapestCap - cheapestRemaining) / cheapestCap
        : 0;

      let bestCandidate = cheapest;
      for (const candidate of fittingCandidates.slice(1)) {
        const key = normalizeDcKey(candidate.dc);
        const cap = capacityMap.get(key) ?? Number.POSITIVE_INFINITY;
        const remaining = remainingCapacity.get(key) ?? Number.POSITIVE_INFINITY;
        const fillFraction = Number.isFinite(cap) && cap > 0
          ? (cap - remaining) / cap
          : 0;
        // Only prefer this cheaper-by-cost candidate if cheapest is materially more loaded
        // (>5% fill fraction ahead). Once found, stop — candidates are cost-sorted so the
        // first one that qualifies is the best cost-aware alternative.
        if (cheapestFillFraction - fillFraction > 0.05) {
          bestCandidate = candidate;
          break;
        }
      }
      fitting = bestCandidate;
    } else {
      // Default: pick the cheapest fitting candidate (cost-first greedy)
      fitting = fittingCandidates[0];
    }

    const dcKey = normalizeDcKey(fitting.dc);
    const currentRemaining = remainingCapacity.get(dcKey);
    if (currentRemaining !== undefined && Number.isFinite(currentRemaining)) {
      remainingCapacity.set(dcKey, currentRemaining - group.laneSpaceRequired);
    }
    const selectedCapacity = capacityMap.get(dcKey) || Number.POSITIVE_INFINITY;
    selectedRows.push(buildSelectedLaneRow(scenarioId, group.sourceRow, group.laneSpaceRequired, group.laneUnits, fitting, selectedCapacity));
  });

  unallocated.forEach((group) => {
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input, suppressedSet);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : eligibleCandidates;
    
    let selected: LaneCandidate | undefined;
    
    // Group candidates into those currently under their utilization cap (> 0 remaining capacity)
    // and those already at or over their utilization cap (<= 0 remaining capacity)
    const underCap = eligible.filter((candidate) => {
      const dcKey = normalizeDcKey(candidate.dc);
      const remaining = remainingCapacity.get(dcKey);
      return remaining === undefined || !Number.isFinite(remaining) || remaining > 0;
    });

    if (underCap.length > 0) {
      // If there are candidates still under their cap, select the cheapest one (first in the cost-sorted list)
      selected = underCap[0];
    } else if (eligible.length > 0) {
      // If all candidates are over their cap, level-load the spillover by choosing the one with the highest remaining capacity (least negative)
      let maxRemaining = Number.NEGATIVE_INFINITY;
      eligible.forEach((candidate) => {
        const dcKey = normalizeDcKey(candidate.dc);
        const remaining = remainingCapacity.get(dcKey) ?? Number.POSITIVE_INFINITY;
        if (remaining > maxRemaining) {
          maxRemaining = remaining;
          selected = candidate;
        }
      });
    } else {
      selected = group.candidates[0];
    }

    if (!selected) return;
    const dcKey = normalizeDcKey(selected.dc);
    const currentRemaining = remainingCapacity.get(dcKey);
    if (currentRemaining !== undefined && Number.isFinite(currentRemaining)) {
      remainingCapacity.set(dcKey, currentRemaining - group.laneSpaceRequired);
    }
    const selectedCapacity = capacityMap.get(dcKey) || Number.POSITIVE_INFINITY;
    selectedRows.push(buildSelectedLaneRow(scenarioId, group.sourceRow, group.laneSpaceRequired, group.laneUnits, selected, selectedCapacity));
  });

  return selectedRows;
};

const buildEmptyDcRow = (scenarioId: string, dcName: string): ScenarioRunResultsDC => {
  const costs = getAdditionalCostsForDc(dcName);
  return {
    ScenarioRunID: scenarioId,
    DCName: dcName,
    TotalCost: 0,
    VolumeUnits: 0,
    AvgDays: 0,
    AvgTransitDays: null,
    UtilPct: 0,
    ActualSpace: 0,
    SpaceRequired: 0,
    SpaceCore: 0,
    SpaceBCV: 0,
    SLABreachCount: 0,
    ExcludedBySLACount: 0,
    RankOverall: 0,
    IsSuppressed: 'Y',
    OvercapFlag: 'N',
    ...costs,
  };
};

export const annotateCapacityOutputs = (
  scenarioId: string,
  laneRows: ScenarioRunResultsLane[],
  dcRows: ScenarioRunResultsDC[],
  capacityMap: Map<string, number>,
  rawCapacityMap: Map<string, number>,
): { laneRows: ScenarioRunResultsLane[]; dcRows: ScenarioRunResultsDC[] } => {
  const laneUsageByDc = new Map<string, number>();
  const orderedLaneRows = [...laneRows].sort((a, b) => {
    const dcA = normalizeDcKey(a.AssignedDC || a.CostingWarehouse || a.DefaultShipFrom);
    const dcB = normalizeDcKey(b.AssignedDC || b.CostingWarehouse || b.DefaultShipFrom);
    if (dcA !== dcB) return dcA.localeCompare(dcB);
    const zipCompare = String(a.Dest3Zip || '').localeCompare(String(b.Dest3Zip || ''));
    if (zipCompare !== 0) return zipCompare;
    const channelCompare = String(a.Channel || '').localeCompare(String(b.Channel || ''));
    if (channelCompare !== 0) return channelCompare;
    const termsCompare = String(a.Terms || '').localeCompare(String(b.Terms || ''));
    if (termsCompare !== 0) return termsCompare;
    const cpuA = Number(a.CostPerUnit ?? a.LaneCost ?? 0);
    const cpuB = Number(b.CostPerUnit ?? b.LaneCost ?? 0);
    if (cpuA !== cpuB) return cpuA - cpuB;
    return String(a.ScenarioRunID || '').localeCompare(String(b.ScenarioRunID || ''));
  });

  const annotatedLanes = orderedLaneRows.map((row) => {
    const dcKey = normalizeDcKey(row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom);
    const demand = laneSpaceRequired(row);
    const capacity = capacityMap.get(dcKey);
    const usedBefore = laneUsageByDc.get(dcKey) || 0;
    const usedAfter = usedBefore + demand;
    laneUsageByDc.set(dcKey, usedAfter);
    const overcap = Number.isFinite(capacity as number) && Number(capacity) > 0 && usedAfter > Number(capacity);
    return {
      ...row,
      OvercapFlag: overcap ? 'Y' : 'N',
    };
  });

  const usageByDc = new Map<string, boolean>();
  annotatedLanes.forEach((row) => {
    const dcKey = normalizeDcKey(row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom);
    if (row.OvercapFlag === 'Y') usageByDc.set(dcKey, true);
  });

  const annotatedDcRows = dcRows.map((row) => {
    const dcKey = normalizeDcKey(row.DCName);
    const rawCapacity = rawCapacityMap.get(dcKey);
    const selectedCapacity = capacityMap.get(dcKey);
    const overcap = row.IsSuppressed === 'N' && Number.isFinite(selectedCapacity as number) && Number(row.UtilPct) > 100;
    return {
      ...row,
      ScenarioRunID: scenarioId,
      ActualSpace: Number.isFinite(rawCapacity as number) ? Number(rawCapacity) : 0,
      OvercapFlag: overcap ? 'Y' : 'N',
    };
  });

  return {
    laneRows: annotatedLanes,
    dcRows: annotatedDcRows,
  };
};

const buildDcRows = (
  scenarioId: string,
  laneRows: ScenarioRunResultsLane[],
  activeSet: Set<string>,
  suppressedSet: Set<string>,
  capacityMap: Map<string, number>,
  entityScope?: string,
): ScenarioRunResultsDC[] => {
  const allDcNames = Array.from(new Set([
    ...Array.from(activeSet),
    ...Array.from(suppressedSet),
    ...Array.from(capacityMap.keys()),
    ...laneRows.flatMap((row) => [
      normalizeDcKey(row.AssignedDC),
      normalizeDcKey(row.CostingWarehouse),
      normalizeDcKey(row.DefaultShipFrom),
    ]),
  ].filter(Boolean)));

  const displayNames = new Map<string, string>();
  laneRows.forEach((row) => {
    [row.AssignedDC, row.CostingWarehouse, row.DefaultShipFrom].forEach((value) => {
      const key = normalizeDcKey(value);
      if (key && !displayNames.has(key) && normalizeText(value)) {
        displayNames.set(key, formatDcDisplayName(value));
      }
    });
  });

  const dcAccum = new Map<string, DcAccumulator>();
  allDcNames.forEach((dcKey) => {
    dcAccum.set(dcKey, {
      totalCost: 0,
      volumeUnits: 0,
      avgDaysWeight: 0,
      avgDaysNumerator: 0,
      avgTransitDaysWeight: 0,
      avgTransitDaysNumerator: 0,
      spaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      slaBreachCount: 0,
      excludedBySlaCount: 0,
      actualSpace: 0,
      inboundSpend: 0,
      parcelSpend: 0,
      ltlSpend: 0,
      tlSpend: 0,
      distributionCost: 0,
    });
  });

  laneRows.forEach((row) => {
    const dcKey = normalizeDcKey(row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom);
    const acc = dcAccum.get(dcKey) || {
      totalCost: 0,
      volumeUnits: 0,
      avgDaysWeight: 0,
      avgDaysNumerator: 0,
      avgTransitDaysWeight: 0,
      avgTransitDaysNumerator: 0,
      spaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      slaBreachCount: 0,
      excludedBySlaCount: 0,
      actualSpace: 0,
      inboundSpend: 0,
      parcelSpend: 0,
      ltlSpend: 0,
      tlSpend: 0,
      distributionCost: 0,
    };
    const laneUnits = inferLaneUnits(row);
    acc.totalCost += Number(row.TotalCost ?? row.LaneCost ?? 0);
    acc.volumeUnits += laneUnits;
    acc.avgDaysNumerator += Number(row.DeliveryDays ?? 0) * laneUnits;
    acc.avgDaysWeight += laneUnits;
    if (Number(row.AvgTransitDays ?? 0) > 0) {
      acc.avgTransitDaysNumerator += Number(row.AvgTransitDays) * laneUnits;
      acc.avgTransitDaysWeight += laneUnits;
    }
    const spaceDemand = laneSpaceRequired(row);
    const entitySpace = splitLaneSpaceByEntity(row, spaceDemand, entityScope);
    acc.spaceRequired += spaceDemand;
    acc.spaceCore += entitySpace.core;
    acc.spaceBCV += entitySpace.bcv;
    if (isLaneSlaBreach(row)) {
      acc.slaBreachCount += laneUnits;
      acc.excludedBySlaCount += laneUnits;
    }
    acc.inboundSpend += Number(row.InboundSpend ?? 0);
    acc.parcelSpend += Number(row.ParcelSpend ?? 0);
    acc.ltlSpend += Number(row.LtlSpend ?? 0);
    acc.tlSpend += Number(row.TlSpend ?? 0);
    acc.distributionCost += Number(row.DistributionCost ?? 0);
    dcAccum.set(dcKey, acc);
  });

  const rows = allDcNames.map((dcKey) => {
    const displayName = displayNames.get(dcKey) || formatDcDisplayName(dcKey);
    const capacity = capacityMap.get(dcKey);
    const acc = dcAccum.get(dcKey) || {
      totalCost: 0,
      volumeUnits: 0,
      avgDaysWeight: 0,
      avgDaysNumerator: 0,
      avgTransitDaysWeight: 0,
      avgTransitDaysNumerator: 0,
      spaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      slaBreachCount: 0,
      excludedBySlaCount: 0,
      actualSpace: 0,
      inboundSpend: 0,
      parcelSpend: 0,
      ltlSpend: 0,
      tlSpend: 0,
      distributionCost: 0,
    };
    const isSuppressed = suppressedSet.has(dcKey) || (activeSet.size > 0 && !activeSet.has(dcKey));
    const utilPct = Number.isFinite(capacity as number) && Number(capacity) > 0
      ? (acc.spaceRequired / Number(capacity)) * 100
      : 0;
    const costs = getAdditionalCostsForDc(displayName);
    return {
      ScenarioRunID: scenarioId,
      DCName: displayName,
      TotalCost: isSuppressed ? 0 : Number(acc.totalCost.toFixed(2)),
      VolumeUnits: isSuppressed ? 0 : Number(acc.volumeUnits.toFixed(2)),
      AvgDays: isSuppressed ? 0 : Number((acc.avgDaysWeight > 0 ? acc.avgDaysNumerator / acc.avgDaysWeight : 0).toFixed(2)),
      AvgTransitDays: isSuppressed ? null : (acc.avgTransitDaysWeight > 0 ? Number((acc.avgTransitDaysNumerator / acc.avgTransitDaysWeight).toFixed(2)) : null),
      UtilPct: isSuppressed ? 0 : Number(utilPct.toFixed(2)),
      SpaceRequired: isSuppressed ? 0 : Number(acc.spaceRequired.toFixed(2)),
      SpaceCore: isSuppressed ? 0 : Number(acc.spaceCore.toFixed(2)),
      SpaceBCV: isSuppressed ? 0 : Number(acc.spaceBCV.toFixed(2)),
      SLABreachCount: isSuppressed ? 0 : acc.slaBreachCount,
      ExcludedBySLACount: isSuppressed ? 0 : acc.excludedBySlaCount,
      InboundSpend: isSuppressed ? 0 : Number(acc.inboundSpend.toFixed(2)),
      ParcelSpend: isSuppressed ? 0 : Number(acc.parcelSpend.toFixed(2)),
      LtlSpend: isSuppressed ? 0 : Number(acc.ltlSpend.toFixed(2)),
      TlSpend: isSuppressed ? 0 : Number(acc.tlSpend.toFixed(2)),
      DistributionCost: isSuppressed ? 0 : Number(acc.distributionCost.toFixed(2)),
      RankOverall: 0,
      IsSuppressed: isSuppressed ? 'Y' : 'N',
      ...costs,
    } satisfies ScenarioRunResultsDC;
  });

  const activeRows = rows
    .filter((row) => row.IsSuppressed === 'N')
    .sort((a, b) => {
      if (a.TotalCost !== b.TotalCost) return a.TotalCost - b.TotalCost;
      if (a.SpaceRequired !== b.SpaceRequired) return a.SpaceRequired - b.SpaceRequired;
      return a.DCName.localeCompare(b.DCName);
    });
  const suppressedRows = rows
    .filter((row) => row.IsSuppressed === 'Y')
    .sort((a, b) => a.DCName.localeCompare(b.DCName));

  return [...activeRows, ...suppressedRows].map((row, index) => ({
    ...row,
    RankOverall: index + 1,
  }));
};

const buildAllocationSummary = (rows: ScenarioRunResultsDC[]): ScenarioBuildSummary =>
  summarizeDcResults(rows);

export const allocateScenarioOutputs = (input: AllocationInput): AllocationResult => {
  const activeSet = new Set(input.activeDcs.map(normalizeDcKey).filter(Boolean));
  const suppressedSet = new Set(input.suppressedDcs.map(normalizeDcKey).filter(Boolean));
  const capacityMap = buildCapacityMap(input.dcCapacityRows, input.utilCap);

  const validDcs = new Set(capacityMap.rawByName.keys());
  const regionLanes = input.lanes.filter(lane => {
    const rawCandidates = buildRawCandidates(lane);
    return rawCandidates.some(c => validDcs.has(normalizeDcKey(c.dc)));
  });

  const laneGroups = buildLaneGroups(regionLanes);
  const mode = resolveMode(input, suppressedSet);

  if (shouldLogAllocation) {
    console.groupCollapsed('[Scenario Allocation] mode');
    console.log({ mode, utilCap: input.utilCap, activeDcs: input.activeDcs, suppressedDcs: input.suppressedDcs });
    console.groupEnd();
  }

  let resultsLanes: ScenarioRunResultsLane[] = [];
  if (mode === 'baseline') {
    resultsLanes = selectBaselineRows(input.scenarioId, laneGroups);
  } else if (mode === 'overload') {
    resultsLanes = selectOverloadRows(input.scenarioId, laneGroups, activeSet, suppressedSet, capacityMap.byName, input);
  } else if (mode === 'unconstrained') {
    resultsLanes = selectUnconstrainedRows(input.scenarioId, laneGroups, activeSet, suppressedSet, capacityMap.byName, input);
  } else if (mode === 'tacticalConsolidation') {
    resultsLanes = selectConstrainedRows(input.scenarioId, laneGroups, activeSet, suppressedSet, capacityMap.byName, input);
  } else {
    resultsLanes = selectConstrainedRows(input.scenarioId, laneGroups, activeSet, suppressedSet, capacityMap.byName, input);
  }

  const dcRows = buildDcRows(input.scenarioId, resultsLanes, activeSet, suppressedSet, capacityMap.byName, input.entityScope);
  const annotated = annotateCapacityOutputs(
    input.scenarioId,
    resultsLanes,
    dcRows,
    capacityMap.byName,
    capacityMap.rawByName,
  );
  resultsLanes = annotated.laneRows;
  const finalDcRows = annotated.dcRows;
  const summary = buildAllocationSummary(finalDcRows);

  if (shouldLogAllocation) {
    const reassignmentCounts: Record<string, { totalLanes: number; movedLanes: number; totalCost: number }> = {};
    const movementMatrix: Record<string, number> = {};
    resultsLanes.forEach((lane) => {
      const debugRow = lane as ScenarioRunResultsLane & CollectRelocationDebugRow;
      const origDc = normalizeText(canonicalizeDcName(debugRow.OriginalAssignedDC || lane.DefaultShipFrom || 'NA'));
      const assignedDc = normalizeText(canonicalizeDcName(lane.AssignedDC || lane.CostingWarehouse || 'NA'));
      const moveKey = `${origDc} -> ${assignedDc}`;
      movementMatrix[moveKey] = (movementMatrix[moveKey] || 0) + 1;

      if (!reassignmentCounts[assignedDc]) {
        reassignmentCounts[assignedDc] = { totalLanes: 0, movedLanes: 0, totalCost: 0 };
      }
      reassignmentCounts[assignedDc].totalLanes += 1;
      if (origDc !== assignedDc) {
        reassignmentCounts[assignedDc].movedLanes += 1;
      }
      reassignmentCounts[assignedDc].totalCost += Number(lane.TotalCost ?? lane.LaneCost ?? 0);
    });

    console.groupCollapsed('[Scenario Allocation] Detailed Lane Reassignment Trace');
    console.log('scenarioId', input.scenarioId);
    console.log('scenarioType', input.scenarioType);
    console.log('mode', mode);
    console.log('reassignmentCountsByAssignedDc', reassignmentCounts);
    console.log('movementMatrix', movementMatrix);
    console.log('utilCapPct', input.utilCap);
    console.log('activeDcs', input.activeDcs);
    console.log('suppressedDcs', input.suppressedDcs);
    console.table(finalDcRows.map((row) => ({
      DCName: row.DCName,
      TotalCost: row.TotalCost,
      VolumeUnits: row.VolumeUnits,
      AvgTransitDays: row.AvgTransitDays ?? 'NA',
      SLABreachCount: row.SLABreachCount,
      UtilPct: row.UtilPct,
      SpaceRequired: row.SpaceRequired,
      IsSuppressed: row.IsSuppressed,
      RankOverall: row.RankOverall,
    })));
    console.groupEnd();

    // Sample 5 moved lanes trace for deep diagnostic inspection
    const movedLanesSample = resultsLanes
      .filter((lane) => {
        const orig = normalizeDcKey((lane as any).OriginalAssignedDC || lane.DefaultShipFrom || '');
        const assigned = normalizeDcKey(lane.AssignedDC || lane.CostingWarehouse || '');
        return orig && assigned && orig !== assigned;
      })
      .slice(0, 5)
      .map((lane) => {
        const origDc = formatDcDisplayName((lane as any).OriginalAssignedDC || lane.DefaultShipFrom);
        const movedToDc = formatDcDisplayName(lane.AssignedDC || lane.CostingWarehouse);
        const isSuppressedSource = suppressedSet.has(normalizeDcKey(origDc));

        const opt1Cost = Number(lane.RankedOption1Cost || 0);
        const opt2Cost = Number(lane.RankedOption2Cost || 0);
        const opt3Cost = Number(lane.RankedOption3Cost || 0);
        const opt4Cost = Number((lane as any).RankedOption4Cost || 0);

        const candidateOptions = [
          lane.RankedOption1DC ? `Option 1: ${lane.RankedOption1DC} ($${opt1Cost.toFixed(2)})` : null,
          lane.RankedOption2DC ? `Option 2: ${lane.RankedOption2DC} ($${opt2Cost.toFixed(2)})` : null,
          lane.RankedOption3DC ? `Option 3: ${lane.RankedOption3DC} ($${opt3Cost.toFixed(2)})` : null,
          (lane as any).RankedOption4DC ? `Option 4: ${(lane as any).RankedOption4DC} ($${opt4Cost.toFixed(2)})` : null,
        ].filter(Boolean).join(' | ');

        let reason = '';
        if (isSuppressedSource) {
          reason = `Original DC (${origDc}) is Suppressed -> Reassigned to lowest-cost available active DC (${movedToDc}).`;
        } else if (normalizeDcKey(movedToDc) === normalizeDcKey(lane.RankedOption1DC)) {
          reason = `Reallocated to lowest-cost Option 1 DC (${movedToDc}) to minimize network spend.`;
        } else {
          reason = `Lowest-cost DC (${lane.RankedOption1DC}) hit utilization cap (${input.utilCap}%) -> Reassigned to next cheapest active DC (${movedToDc}).`;
        }

        const beforeCostVal = Number((lane as any).OriginalCostPerUnit
          ? (lane as any).OriginalCostPerUnit * Math.max(lane.TotalCount || 1, 1)
          : (lane.RankedOption2Cost || lane.TotalCost || lane.LaneCost || 0));

        return {
          Dest3Zip: lane.Dest3Zip,
          Channel: lane.Channel,
          Terms: lane.Terms,
          ActualDC: origDc || 'NA',
          MovedToDC: movedToDc || 'NA',
          BeforeCost: `$${beforeCostVal.toFixed(2)}`,
          AfterCost: `$${Number(lane.TotalCost ?? lane.LaneCost ?? 0).toFixed(2)}`,
          CandidateOptionsWithCost: candidateOptions,
          ReassignmentReason: reason,
        };
      });

    if (movedLanesSample.length > 0) {
      console.group('[Scenario Allocation] Sample 5 Moved Lanes Detailed Trace');
      console.log('Scenario ID:', input.scenarioId, '| Mode:', mode, '| Utilization Cap:', `${input.utilCap}%`);
      console.table(movedLanesSample);
      console.groupEnd();
    }

    logScenarioLaneAllocationTrace(input, resultsLanes, suppressedSet, mode);
    logBcvCollectRelocationSummary(input.scenarioType, resultsLanes);
  }

  return {
    resultsDC: finalDcRows,
    resultsLanes: resultsLanes.sort((a, b) => {
      const zipCompare = String(a.Dest3Zip || '').localeCompare(String(b.Dest3Zip || ''));
      if (zipCompare !== 0) return zipCompare;
      const channelCompare = String(a.Channel || '').localeCompare(String(b.Channel || ''));
      if (channelCompare !== 0) return channelCompare;
      const termsCompare = String(a.Terms || '').localeCompare(String(b.Terms || ''));
      if (termsCompare !== 0) return termsCompare;
      const dcCompare = String(a.AssignedDC || '').localeCompare(String(b.AssignedDC || ''));
      if (dcCompare !== 0) return dcCompare;
      return String(a.ScenarioType || '').localeCompare(String(b.ScenarioType || ''));
    }),
    summary,
  };
};

export type { AllocationInput, AllocationResult };
