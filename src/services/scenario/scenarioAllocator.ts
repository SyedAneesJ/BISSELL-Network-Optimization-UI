import type { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';
import type { DomoDcCapacityRow } from '@/services';
import type { ScenarioBuildSummary } from './scenarioModels';
import { summarizeDcResults } from './scenarioMetrics';

type LaneCandidate = {
  dc: string;
  totalCost: number;
  days: number;
  sourceIndex: number;
  scoreCostPerUnit: number;
};

type LaneGroup = {
  key: string;
  sourceRow: ScenarioRunResultsLane;
  candidates: LaneCandidate[];
  laneSpaceRequired: number;
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
};

type AllocationInput = {
  scenarioId: string;
  lanes: ScenarioRunResultsLane[];
  activeDcs: string[];
  suppressedDcs: string[];
  dcCapacityRows?: DomoDcCapacityRow[];
  utilCap: number;
};

type AllocationResult = {
  resultsDC: ScenarioRunResultsDC[];
  resultsLanes: ScenarioRunResultsLane[];
  summary: ScenarioBuildSummary;
};

const shouldLogAllocation = String(import.meta.env.VITE_SCENARIO_ALLOCATION_LOGS ?? 'true').toLowerCase() !== 'false';

const normalizeText = (value: unknown): string => String(value || '').trim();

const laneGroupKey = (lane: ScenarioRunResultsLane): string =>
  [
    lane.Dest3Zip || '',
    lane.Channel || '',
    lane.Terms || '',
    lane.DestState || '',
    lane.ScenarioType || '',
  ].join('|');

const laneSpaceRequired = (lane: ScenarioRunResultsLane): number => {
  const demand = Number(
    lane.FootprintContribution ??
    lane.WorkingCapacity ??
    lane.Threshold ??
    0,
  );
  return Number.isFinite(demand) && demand > 0 ? demand : 1;
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

const buildCandidate = (
  dc: string,
  totalCost: number,
  days: number,
  sourceIndex: number,
  demand: number,
): LaneCandidate | null => {
  const dcName = normalizeText(dc);
  if (!dcName || dcName === 'NA') return null;
  const cost = Number(totalCost);
  const safeTotalCost = Number.isFinite(cost) ? cost : 0;
  const safeDays = Number.isFinite(days) ? days : 0;
  return {
    dc: dcName,
    totalCost: safeTotalCost,
    days: safeDays,
    sourceIndex,
    scoreCostPerUnit: safeTotalCost / Math.max(demand, 1),
  };
};

const buildCandidates = (lane: ScenarioRunResultsLane): LaneCandidate[] => {
  const demand = laneSpaceRequired(lane);
  const candidates = [
    buildCandidate(lane.RankedOption1DC, lane.RankedOption1Cost, lane.RankedOption1Days, 1, demand),
    buildCandidate(lane.RankedOption2DC, lane.RankedOption2Cost, lane.RankedOption2Days, 2, demand),
    buildCandidate(lane.RankedOption3DC, lane.RankedOption3Cost, lane.RankedOption3Days, 3, demand),
  ].filter((item): item is LaneCandidate => Boolean(item));

  const fallbackDc = normalizeText(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom);
  if (candidates.length === 0 && fallbackDc) {
    const totalCost = Number(lane.TotalCost ?? lane.LaneCost ?? lane.CostPerUnit ?? 0);
    candidates.push({
      dc: fallbackDc,
      totalCost: Number.isFinite(totalCost) ? totalCost : 0,
      days: Number(lane.DeliveryDays ?? 0) || 0,
      sourceIndex: 1,
      scoreCostPerUnit: (Number.isFinite(totalCost) ? totalCost : 0) / Math.max(demand, 1),
    });
  }

  return candidates.sort((a, b) => {
    if (a.scoreCostPerUnit !== b.scoreCostPerUnit) return a.scoreCostPerUnit - b.scoreCostPerUnit;
    if (a.totalCost !== b.totalCost) return a.totalCost - b.totalCost;
    if (a.days !== b.days) return a.days - b.days;
    const dcCompare = a.dc.localeCompare(b.dc);
    if (dcCompare !== 0) return dcCompare;
    return a.sourceIndex - b.sourceIndex;
  });
};

const dedupeRowsByKey = <T>(rows: T[], getKey: (row: T) => string): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  rows.forEach((row) => {
    const key = normalizeText(getKey(row));
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(row);
  });
  return result;
};

const buildLaneGroups = (rows: ScenarioRunResultsLane[]): LaneGroup[] => {
  const grouped = rows.reduce<Record<string, ScenarioRunResultsLane[]>>((acc, row) => {
    const key = laneGroupKey(row) || row.ScenarioRunID || 'UNKNOWN';
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, laneRows]) => {
    const deduped = dedupeRowsByKey(laneRows, (row) => [
      row.Dest3Zip || '',
      row.Channel || '',
      row.Terms || '',
      row.DestState || '',
      row.ScenarioType || '',
      row.AssignedDC || row.CostingWarehouse || row.DefaultShipFrom || '',
      row.RankedOption1DC || '',
      row.RankedOption2DC || '',
      row.RankedOption3DC || '',
    ].join('|'));

    const sourceRow = [...deduped].sort((a, b) => {
      const cpuA = a.CostPerUnit ?? Number.POSITIVE_INFINITY;
      const cpuB = b.CostPerUnit ?? Number.POSITIVE_INFINITY;
      if (cpuA !== cpuB) return cpuA - cpuB;
      const costA = Number(a.LaneCost ?? a.TotalCost ?? a.CostPerUnit ?? 0);
      const costB = Number(b.LaneCost ?? b.TotalCost ?? b.CostPerUnit ?? 0);
      if (costA !== costB) return costA - costB;
      return normalizeText(a.AssignedDC || a.CostingWarehouse || a.DefaultShipFrom).localeCompare(
        normalizeText(b.AssignedDC || b.CostingWarehouse || b.DefaultShipFrom),
      );
    })[0] || laneRows[0];

    const demand = laneSpaceRequired(sourceRow);
    return {
      key,
      sourceRow,
      laneSpaceRequired: demand,
      candidates: buildCandidates(sourceRow),
    };
  });
};

const getCapacityMap = (rows: DomoDcCapacityRow[] | undefined, utilCap: number) => {
  const byName = new Map<string, number>();
  const meta = new Map<string, DomoDcCapacityRow>();
  (rows || []).forEach((row) => {
    const dcName = normalizeText(row.DCName);
    if (!dcName) return;
    byName.set(dcName, row.Sqft > 0 ? row.Sqft * Math.max(0, Math.min(100, utilCap)) / 100 : Number.POSITIVE_INFINITY);
    meta.set(dcName, row);
  });
  return { byName, meta };
};

const isCandidateActive = (
  dc: string,
  activeSet: Set<string>,
  suppressedSet: Set<string>,
): boolean => {
  const dcName = normalizeText(dc);
  if (!dcName) return false;
  if (suppressedSet.has(dcName)) return false;
  if (activeSet.size === 0) return true;
  return activeSet.has(dcName);
};

const buildSelectedLaneRow = (
  sourceRow: ScenarioRunResultsLane,
  demand: number,
  laneUnits: number,
  candidates: LaneCandidate[],
  selected: LaneCandidate,
  selectedCapacity: number,
): ScenarioRunResultsLane => {
  const best = candidates[0] || selected;
  const second = candidates[1];
  const third = candidates[2];
  const selectedIndex = Math.max(1, candidates.findIndex((candidate) =>
    candidate.dc === selected.dc &&
    candidate.totalCost === selected.totalCost &&
    candidate.days === selected.days &&
    candidate.sourceIndex === selected.sourceIndex,
  ) + 1);

  return {
    ...sourceRow,
    AssignedDC: selected.dc,
    RankedOption1DC: best?.dc || '',
    RankedOption1Cost: best?.totalCost || 0,
    RankedOption1Days: best?.days || 0,
    RankedOption2DC: second?.dc || '',
    RankedOption2Cost: second?.totalCost || 0,
    RankedOption2Days: second?.days || 0,
    RankedOption3DC: third?.dc || '',
    RankedOption3Cost: third?.totalCost || 0,
    RankedOption3Days: third?.days || 0,
    ChosenRank: selectedIndex,
    CostRank: selectedIndex,
    LaneCost: selected.totalCost,
    TotalCost: selected.totalCost,
    CostPerUnit: Number(((sourceRow.CostPerUnit ?? (selected.totalCost / Math.max(laneUnits, 1))) || 0).toFixed(2)),
    CostDeltaVsBest: Number(Math.max(0, selected.totalCost - (best?.totalCost || selected.totalCost)).toFixed(2)),
    DeliveryDays: selected.days,
    FootprintContribution: demand,
    UtilImpactPct: Number((
      Number.isFinite(selectedCapacity) && selectedCapacity > 0
        ? (demand / selectedCapacity) * 100
        : (sourceRow.UtilImpactPct || 0)
    ).toFixed(2)),
    OverrideAppliedFlag: sourceRow.OverrideAppliedFlag || 'N',
    OverrideVersion: sourceRow.OverrideVersion ?? null,
    NotesFlag: sourceRow.NotesFlag || '',
    ScenarioType: sourceRow.ScenarioType || '',
    RunName: sourceRow.RunName || '',
    CostingWarehouse: selected.dc,
    DefaultShipFrom: sourceRow.DefaultShipFrom || '',
    SLABreachFlag: String(sourceRow.SLABreachFlag || sourceRow.ExcludedBySLAFlag || sourceRow.BreachFlag || '').toUpperCase() === 'Y' ? 'Y' : 'N',
    ExcludedBySLAFlag: String(sourceRow.ExcludedBySLAFlag || sourceRow.SLABreachFlag || sourceRow.BreachFlag || '').toUpperCase() === 'Y' ? 'Y' : 'N',
    SourceDatasetId: sourceRow.SourceDatasetId || '',
  };
};

const createEmptyDcRow = (scenarioId: string, dcName: string): ScenarioRunResultsDC => ({
  ScenarioRunID: scenarioId,
  DCName: dcName,
  TotalCost: 0,
  VolumeUnits: 0,
  AvgDays: 0,
  UtilPct: 0,
  SpaceRequired: 0,
  SpaceCore: 0,
  SpaceBCV: 0,
  SLABreachCount: 0,
  ExcludedBySLACount: 0,
  RankOverall: 0,
  IsSuppressed: 'Y',
});

export const allocateScenarioOutputs = (input: AllocationInput): AllocationResult => {
  const activeSet = new Set(input.activeDcs.map(normalizeText).filter(Boolean));
  const suppressedSet = new Set(input.suppressedDcs.map(normalizeText).filter(Boolean));
  const capacityMap = getCapacityMap(input.dcCapacityRows, input.utilCap);
  const laneGroups = buildLaneGroups(input.lanes);
  const laneJobs = laneGroups
    .map((group) => {
      const candidates = group.candidates;
      const best = candidates[0];
      const second = candidates[1];
      const regret = (second?.scoreCostPerUnit ?? best?.scoreCostPerUnit ?? Number.POSITIVE_INFINITY) - (best?.scoreCostPerUnit ?? Number.POSITIVE_INFINITY);
      return {
        ...group,
        bestCostPerUnit: best?.scoreCostPerUnit ?? Number.POSITIVE_INFINITY,
        regret,
      };
    })
    .sort((a, b) => {
      if (a.regret !== b.regret) return b.regret - a.regret;
      if (a.laneSpaceRequired !== b.laneSpaceRequired) return b.laneSpaceRequired - a.laneSpaceRequired;
      if (a.bestCostPerUnit !== b.bestCostPerUnit) return a.bestCostPerUnit - b.bestCostPerUnit;
      return a.key.localeCompare(b.key);
    });

  const remainingCapacity = new Map<string, number>();
  const dcAccum = new Map<string, DcAccumulator>();

  const allDcNames = Array.from(new Set([
    ...input.activeDcs,
    ...input.suppressedDcs,
    ...(input.dcCapacityRows || []).map((row) => row.DCName),
    ...laneGroups.flatMap((group) => group.candidates.map((candidate) => candidate.dc)),
  ].map(normalizeText).filter(Boolean)));

  allDcNames.forEach((dcName) => {
    const capacity = capacityMap.byName.get(dcName);
    remainingCapacity.set(dcName, Number.isFinite(capacity as number) ? Number(capacity) : Number.POSITIVE_INFINITY);
    dcAccum.set(dcName, {
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

  const selectedLaneRows: ScenarioRunResultsLane[] = [];

  laneJobs.forEach((job) => {
    const activeCandidates = job.candidates.filter((candidate) => isCandidateActive(candidate.dc, activeSet, suppressedSet));
    const eligibleCandidates = activeCandidates.length > 0 ? activeCandidates : job.candidates;
    const fits = eligibleCandidates.find((candidate) => {
      const remaining = remainingCapacity.get(candidate.dc);
      if (remaining === undefined || !Number.isFinite(remaining)) return true;
      return remaining + 1e-9 >= job.laneSpaceRequired;
    });
    const selected = fits || eligibleCandidates[0] || job.candidates[0];
    if (!selected) return;

    const currentRemaining = remainingCapacity.get(selected.dc);
    const selectedCapacity = capacityMap.byName.get(selected.dc) || Number.POSITIVE_INFINITY;
    if (currentRemaining !== undefined && Number.isFinite(currentRemaining)) {
      remainingCapacity.set(selected.dc, currentRemaining - job.laneSpaceRequired);
    }

    const laneUnits = inferLaneUnits(job.sourceRow);
    const selectedRow = buildSelectedLaneRow(job.sourceRow, job.laneSpaceRequired, laneUnits, job.candidates, selected, selectedCapacity);
    selectedLaneRows.push(selectedRow);

    const dcRow = dcAccum.get(selected.dc) || {
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
    dcRow.totalCost += selected.totalCost;
    dcRow.volumeUnits += laneUnits;
    dcRow.avgDaysNumerator += selected.days;
    dcRow.avgDaysWeight += laneUnits;
    dcRow.spaceRequired += job.laneSpaceRequired;
    dcRow.spaceCore += job.laneSpaceRequired;
    dcRow.spaceBCV += job.laneSpaceRequired;
    if (String(job.sourceRow.SLABreachFlag || job.sourceRow.ExcludedBySLAFlag || job.sourceRow.BreachFlag || '').toUpperCase() === 'Y') {
      dcRow.slaBreachCount += 1;
      dcRow.excludedBySlaCount += 1;
    }
    dcAccum.set(selected.dc, dcRow);

    if (shouldLogAllocation) {
      console.info('[Scenario Allocation] lane assigned', {
        laneKey: job.key,
        zip: job.sourceRow.Dest3Zip,
        channel: job.sourceRow.Channel,
        terms: job.sourceRow.Terms,
        laneSpaceRequired: Number(job.laneSpaceRequired.toFixed(2)),
        laneUnits: Number(laneUnits.toFixed(2)),
        selectedDc: selected.dc,
        selectedCost: Number(selected.totalCost.toFixed(2)),
        selectedDays: Number(selected.days.toFixed(2)),
        remainingCapacity: Number.isFinite(remainingCapacity.get(selected.dc) as number)
          ? Number((remainingCapacity.get(selected.dc) ?? 0).toFixed(2))
          : 'unbounded',
      });
    }
  });

  const dcRows = allDcNames.map((dcName) => {
    const capacity = capacityMap.byName.get(dcName);
    const acc = dcAccum.get(dcName) || {
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
    const isSuppressed = suppressedSet.has(dcName) || (activeSet.size > 0 && !activeSet.has(dcName));
    const utilPct = Number.isFinite(capacity as number) && Number(capacity) > 0
      ? (acc.spaceRequired / Number(capacity)) * 100
      : 0;
    return {
      ScenarioRunID: input.scenarioId,
      DCName: dcName,
      TotalCost: isSuppressed ? 0 : Number(acc.totalCost.toFixed(2)),
      VolumeUnits: isSuppressed ? 0 : acc.volumeUnits,
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

  const activeRows = dcRows
    .filter((row) => row.IsSuppressed === 'N')
    .sort((a, b) => {
      if (a.TotalCost !== b.TotalCost) return a.TotalCost - b.TotalCost;
      if (a.SpaceRequired !== b.SpaceRequired) return a.SpaceRequired - b.SpaceRequired;
      return a.DCName.localeCompare(b.DCName);
    });
  const suppressedRows = dcRows
    .filter((row) => row.IsSuppressed === 'Y')
    .sort((a, b) => a.DCName.localeCompare(b.DCName));

  const orderedDcRows = [...activeRows, ...suppressedRows].map((row, index) => ({
    ...row,
    RankOverall: index + 1,
  }));

  if (shouldLogAllocation) {
    console.groupCollapsed('[Scenario Allocation] summary');
      console.log('utilCapPct', input.utilCap);
      console.log('activeDcs', input.activeDcs);
      console.log('suppressedDcs', input.suppressedDcs);
    console.table(orderedDcRows.map((row) => ({
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
    resultsDC: orderedDcRows,
    resultsLanes: selectedLaneRows.sort((a, b) => {
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
    summary: summarizeDcResults(orderedDcRows),
  };
};

export type { AllocationInput, AllocationResult };
