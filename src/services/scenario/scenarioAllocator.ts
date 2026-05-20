import type { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';
import type { DomoDcCapacityRow } from '@/services';
import type { ScenarioBuildSummary } from './scenarioModels';
import { resolveScenarioTypePolicy } from './scenarioTypeRules';
import { summarizeDcResults } from './scenarioMetrics';

type AllocationMode = 'baseline' | 'overload' | 'constrained' | 'unconstrained' | 'tacticalConsolidation';

type LaneCandidate = {
  dc: string;
  costPerUnit: number;
  days: number;
  sourceIndex: 1 | 2 | 3;
};

type LaneGroup = {
  key: string;
  sourceRow: ScenarioRunResultsLane;
  laneUnits: number;
  laneSpaceRequired: number;
  candidates: LaneCandidate[];
};

type DcAccumulator = {
  totalCost: number;
  volumeUnits: number;
  avgDaysWeight: number;
  avgDaysNumerator: number;
  spaceRequired: number;
  spaceCore: number;
  spaceBCV: number;
  slaBreachCount: number;
  excludedBySlaCount: number;
  actualSpace: number;
};

type AllocationInput = {
  scenarioId: string;
  scenarioType: string;
  lanes: ScenarioRunResultsLane[];
  activeDcs: string[];
  suppressedDcs: string[];
  dcCapacityRows?: DomoDcCapacityRow[];
  utilCap: number;
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

const normalizeDcKey = (value: unknown): string => normalizeText(value).toLowerCase();

const formatDcDisplayName = (value: unknown): string => {
  const text = normalizeText(value);
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
  const demand = Number(
    lane.WorkingCapacity ??
    lane.FootprintContribution ??
    lane.Threshold ??
    0,
  );
  return Number.isFinite(demand) && demand > 0 ? demand : 1;
};

const laneTerms = (lane: ScenarioRunResultsLane): string =>
  normalizeText(lane.Terms).toLowerCase();

const laneCostPerUnit = (lane: ScenarioRunResultsLane): number => {
  const direct = Number(lane.CostPerUnit ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const units = inferLaneUnits(lane);
  const laneCost = Number(lane.LaneCost ?? lane.TotalCost ?? 0);
  if (Number.isFinite(laneCost) && laneCost > 0 && units > 0) {
    return laneCost / units;
  }
  return 0;
};

const laneSourceDc = (lane: ScenarioRunResultsLane): string =>
  normalizeText(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom);

const canRelocateLane = (lane: ScenarioRunResultsLane, input: AllocationInput): boolean => {
  const terms = laneTerms(lane);
  if (terms.includes('collect')) {
    return input.allowRelocationCollect !== false;
  }
  if (terms.includes('prepaid') || terms === 'pp') {
    return input.allowRelocationPrepaid !== false;
  }
  return true;
};

const restrictCandidatesForLane = (lane: ScenarioRunResultsLane, candidates: LaneCandidate[], input: AllocationInput): LaneCandidate[] => {
  if (canRelocateLane(lane, input)) return candidates;
  const sourceDc = normalizeDcKey(laneSourceDc(lane));
  if (!sourceDc) return candidates;
  const fixedCandidate = candidates.find((candidate) => normalizeDcKey(candidate.dc) === sourceDc);
  if (fixedCandidate) return [fixedCandidate];
  return candidates;
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

const capacityValue = (row?: DomoDcCapacityRow): number => {
  if (!row) return Number.POSITIVE_INFINITY;
  const workingCapacity = Number(row.WorkingCapacitySqFt ?? 0);
  if (Number.isFinite(workingCapacity) && workingCapacity > 0) return workingCapacity;
  if (Number.isFinite(row.Sqft) && row.Sqft > 0) return row.Sqft;
  return Number.POSITIVE_INFINITY;
};

const buildRawCandidates = (lane: ScenarioRunResultsLane): LaneCandidate[] => {
  const candidates: LaneCandidate[] = [];
  const addCandidate = (dc: unknown, costPerUnit: unknown, days: unknown, sourceIndex: 1 | 2 | 3) => {
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
      if (a.costPerUnit !== b.costPerUnit) return a.costPerUnit - b.costPerUnit;
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
      const cpuA = Number(a.CostPerUnit ?? a.RankedOption1Cost ?? a.LaneCost ?? 0);
      const cpuB = Number(b.CostPerUnit ?? b.RankedOption1Cost ?? b.LaneCost ?? 0);
      if (cpuA !== cpuB) return cpuA - cpuB;
      const costA = Number(a.TotalCost ?? a.LaneCost ?? 0);
      const costB = Number(b.TotalCost ?? b.LaneCost ?? 0);
      if (costA !== costB) return costA - costB;
      return normalizeText(a.AssignedDC || a.CostingWarehouse || a.DefaultShipFrom).localeCompare(
        normalizeText(b.AssignedDC || b.CostingWarehouse || b.DefaultShipFrom),
      );
    })[0],
  );
};

const buildLaneGroups = (rows: ScenarioRunResultsLane[]): LaneGroup[] =>
  canonicalizeLaneRows(rows).map((sourceRow) => ({
    key: laneGroupKey(sourceRow) || sourceRow.ScenarioRunID || 'UNKNOWN',
    sourceRow,
    laneUnits: inferLaneUnits(sourceRow),
    laneSpaceRequired: laneSpaceRequired(sourceRow),
    candidates: buildRawCandidates(sourceRow),
  }));

export const buildCapacityMap = (rows: DomoDcCapacityRow[] | undefined, utilCap: number) => {
  const byName = new Map<string, number>();
  const rawByName = new Map<string, number>();
  const meta = new Map<string, DomoDcCapacityRow>();
  (rows || []).forEach((row) => {
    const dcName = normalizeText(row.DCName);
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
  const dcKey = normalizeDcKey(dc);
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

const selectedCandidateRank = (sourceRow: ScenarioRunResultsLane, selectedDc: string): number => {
  const normalized = normalizeDcKey(selectedDc);
  const candidates = [
    normalizeDcKey(sourceRow.RankedOption1DC) === normalized ? 1 : 0,
    normalizeDcKey(sourceRow.RankedOption2DC) === normalized ? 2 : 0,
    normalizeDcKey(sourceRow.RankedOption3DC) === normalized ? 3 : 0,
  ].filter(Boolean);
  return candidates[0] || 1;
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
  const selectedTotal = Number((selectedCpu * Math.max(laneUnits, 1)).toFixed(2));
  const bestCpu = Number(
    Math.min(
      ...buildRawCandidates(sourceRow)
        .map((candidate) => candidate.costPerUnit)
        .filter((value) => Number.isFinite(value) && value > 0),
      selectedCpu,
    ).toFixed(2),
  );
  const selectedRank = selectedCandidateRank(sourceRow, selected.dc);

  return {
    ...sourceRow,
    ScenarioRunID: scenarioId,
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
    FootprintContribution: demand,
    UtilImpactPct: Number((
      Number.isFinite(selectedCapacity) && selectedCapacity > 0
        ? (demand / selectedCapacity) * 100
        : 0
    ).toFixed(2)),
    OvercapFlag: Number.isFinite(selectedCapacity) && selectedCapacity > 0 && demand > selectedCapacity ? 'Y' : 'N',
  };
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
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : group.candidates;
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
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : group.candidates;
    if (eligible.length === 0) return null;
    const actual = eligible.find((candidate) => normalizeDcKey(candidate.dc) === globalCheapestDc);
    if (actual) return actual;
    const fallback = eligible[0];
    return {
      dc: globalCheapestDc || fallback.dc,
      costPerUnit: fallback.costPerUnit,
      days: fallback.days,
      sourceIndex: fallback.sourceIndex,
    };
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
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : group.candidates;
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
    const collectPriorityA = laneTerms(a.sourceRow).includes('collect') && input.allowRelocationCollect !== false ? 1 : 0;
    const collectPriorityB = laneTerms(b.sourceRow).includes('collect') && input.allowRelocationCollect !== false ? 1 : 0;
    if (collectPriorityA !== collectPriorityB) return collectPriorityB - collectPriorityA;
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

  ordered.forEach((group) => {
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : group.candidates;
    const fitting = eligible.find((candidate) => {
      const remaining = remainingCapacity.get(normalizeDcKey(candidate.dc));
      if (remaining === undefined || !Number.isFinite(remaining)) return true;
      return remaining + 1e-9 >= group.laneSpaceRequired;
    });
    if (!fitting) {
      unallocated.push(group);
      return;
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
    const eligibleCandidates = restrictCandidatesForLane(group.sourceRow, group.candidates, input);
    const activeCandidates = eligibleCandidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligible = activeCandidates.length > 0 ? activeCandidates : group.candidates;
    const selected = eligible[0] || group.candidates[0];
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

const buildEmptyDcRow = (scenarioId: string, dcName: string): ScenarioRunResultsDC => ({
  ScenarioRunID: scenarioId,
  DCName: dcName,
  TotalCost: 0,
  VolumeUnits: 0,
  AvgDays: 0,
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
});

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
      spaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      slaBreachCount: 0,
      excludedBySlaCount: 0,
    });
  });

  laneRows.forEach((row) => {
    const dcKey = normalizeDcKey(row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom);
    const acc = dcAccum.get(dcKey) || {
      totalCost: 0,
      volumeUnits: 0,
      avgDaysWeight: 0,
      avgDaysNumerator: 0,
      spaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      slaBreachCount: 0,
      excludedBySlaCount: 0,
    };
    const laneUnits = inferLaneUnits(row);
    acc.totalCost += Number(row.TotalCost ?? row.LaneCost ?? 0);
    acc.volumeUnits += laneUnits;
    acc.avgDaysNumerator += Number(row.DeliveryDays ?? 0) * laneUnits;
    acc.avgDaysWeight += laneUnits;
    acc.spaceRequired += Number(row.WorkingCapacity ?? row.FootprintContribution ?? 0);
    acc.spaceCore += Number(row.WorkingCapacity ?? row.FootprintContribution ?? 0);
    acc.spaceBCV += Number(row.WorkingCapacity ?? row.FootprintContribution ?? 0);
    if (String(row.SLABreachFlag || row.ExcludedBySLAFlag || row.BreachFlag || '').toUpperCase() === 'Y') {
      acc.slaBreachCount += 1;
      acc.excludedBySlaCount += 1;
    }
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
      spaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      slaBreachCount: 0,
      excludedBySlaCount: 0,
    };
    const isSuppressed = suppressedSet.has(dcKey) || (activeSet.size > 0 && !activeSet.has(dcKey));
    const utilPct = Number.isFinite(capacity as number) && Number(capacity) > 0
      ? (acc.spaceRequired / Number(capacity)) * 100
      : 0;
    return {
      ScenarioRunID: scenarioId,
      DCName: displayName,
      TotalCost: isSuppressed ? 0 : Number(acc.totalCost.toFixed(2)),
      VolumeUnits: isSuppressed ? 0 : Number(acc.volumeUnits.toFixed(2)),
      AvgDays: isSuppressed ? 0 : Number((acc.avgDaysWeight > 0 ? acc.avgDaysNumerator / acc.avgDaysWeight : 0).toFixed(2)),
      UtilPct: isSuppressed ? 0 : Number(utilPct.toFixed(2)),
      SpaceRequired: isSuppressed ? 0 : Number(acc.spaceRequired.toFixed(2)),
      SpaceCore: isSuppressed ? 0 : Number(acc.spaceCore.toFixed(2)),
      SpaceBCV: isSuppressed ? 0 : Number(acc.spaceBCV.toFixed(2)),
      SLABreachCount: isSuppressed ? 0 : acc.slaBreachCount,
      ExcludedBySLACount: isSuppressed ? 0 : acc.excludedBySlaCount,
      RankOverall: 0,
      IsSuppressed: isSuppressed ? 'Y' : 'N',
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

const buildCollectRelocationSummary = (
  sourceRows: ScenarioRunResultsLane[],
  finalRows: ScenarioRunResultsLane[],
  input: AllocationInput,
) => {
  const finalByKey = new Map<string, ScenarioRunResultsLane>();
  finalRows.forEach((row) => {
    finalByKey.set(laneGroupKey(row), row);
  });

  const collectRows = sourceRows.filter((row) => laneTerms(row).includes('collect'));
  const summary = {
    collectLaneCount: collectRows.length,
    relocatedCollectLaneCount: 0,
    collectUnits: 0,
    beforeTotalCost: 0,
    afterTotalCost: 0,
    beforeAvgCpu: 0,
    afterAvgCpu: 0,
    movedToDcs: new Map<string, number>(),
  };

  collectRows.forEach((sourceRow) => {
    const key = laneGroupKey(sourceRow);
    const finalRow = finalByKey.get(key);
    if (!finalRow) return;

    const units = inferLaneUnits(sourceRow);
    const beforeCpu = laneCostPerUnit(sourceRow);
    const afterCpu = laneCostPerUnit(finalRow);
    const sourceDc = normalizeDcKey(laneSourceDc(sourceRow));
    const finalDc = normalizeDcKey(finalRow.AssignedDC || finalRow.CostingWarehouse || finalRow.DefaultShipFrom);
    const relocatable = canRelocateLane(sourceRow, input);

    summary.collectUnits += units;
    summary.beforeTotalCost += beforeCpu * units;
    summary.afterTotalCost += afterCpu * units;

    if (relocatable && sourceDc && finalDc && sourceDc !== finalDc) {
      summary.relocatedCollectLaneCount += 1;
      const current = summary.movedToDcs.get(formatDcDisplayName(finalRow.AssignedDC || finalRow.CostingWarehouse || finalRow.DefaultShipFrom)) || 0;
      summary.movedToDcs.set(formatDcDisplayName(finalRow.AssignedDC || finalRow.CostingWarehouse || finalRow.DefaultShipFrom), current + 1);
    }
  });

  if (summary.collectUnits > 0) {
    summary.beforeAvgCpu = summary.beforeTotalCost / summary.collectUnits;
    summary.afterAvgCpu = summary.afterTotalCost / summary.collectUnits;
  }

  return summary;
};

export const allocateScenarioOutputs = (input: AllocationInput): AllocationResult => {
  const activeSet = new Set(input.activeDcs.map(normalizeDcKey).filter(Boolean));
  const suppressedSet = new Set(input.suppressedDcs.map(normalizeDcKey).filter(Boolean));
  const capacityMap = buildCapacityMap(input.dcCapacityRows, input.utilCap);
  const laneGroups = buildLaneGroups(input.lanes);
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

  const dcRows = buildDcRows(input.scenarioId, resultsLanes, activeSet, suppressedSet, capacityMap.byName);
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
    const collectRelocationSummary = buildCollectRelocationSummary(input.lanes, resultsLanes, input);
    console.groupCollapsed('[Scenario Allocation] summary');
    console.log('utilCapPct', input.utilCap);
    console.log('activeDcs', input.activeDcs);
    console.log('suppressedDcs', input.suppressedDcs);
    console.groupCollapsed('[Scenario Allocation] collect relocation');
    console.table([{
      collectLaneCount: collectRelocationSummary.collectLaneCount,
      relocatedCollectLaneCount: collectRelocationSummary.relocatedCollectLaneCount,
      collectUnits: Number(collectRelocationSummary.collectUnits.toFixed(2)),
      beforeAvgCpu: Number(collectRelocationSummary.beforeAvgCpu.toFixed(2)),
      afterAvgCpu: Number(collectRelocationSummary.afterAvgCpu.toFixed(2)),
      deltaCpu: Number((collectRelocationSummary.afterAvgCpu - collectRelocationSummary.beforeAvgCpu).toFixed(2)),
    }]);
    console.table(Array.from(collectRelocationSummary.movedToDcs.entries()).map(([dc, count]) => ({
      movedToDc: dc,
      relocatedCollectLaneCount: count,
    })));
    console.groupEnd();
    console.table(finalDcRows.map((row) => ({
      DCName: row.DCName,
      TotalCost: row.TotalCost,
      VolumeUnits: row.VolumeUnits,
      UtilPct: row.UtilPct,
      SpaceRequired: row.SpaceRequired,
      IsSuppressed: row.IsSuppressed,
      RankOverall: row.RankOverall,
    })));
    console.groupEnd();
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
