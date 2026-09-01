import type { ScenarioBuildSummary } from './scenarioModels';
import type { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';

export const summarizeDcResults = (rows: ScenarioRunResultsDC[]): ScenarioBuildSummary => {
  if (rows.length === 0) {
    return {
      totalCost: 0,
      totalUnits: 0,
      costPerUnit: 0,
      avgDays: 0,
      avgTransitDays: null,
      maxUtil: 0,
      totalSpaceRequired: 0,
      spaceCore: 0,
      spaceBCV: 0,
      excludedBySla: 0,
      slaBreachCount: 0,
      slaBreachPct: 0,
      missingAvgDays: 0,
    };
  }

  const totalCost = rows.reduce((sum, row) => sum + row.TotalCost, 0);
  const totalUnits = rows.reduce((sum, row) => sum + row.VolumeUnits, 0);

  let avgDaysNumerator = 0;
  let avgDaysWeight = 0;
  let avgTransitDaysNumerator = 0;
  let avgTransitDaysWeight = 0;
  rows.forEach((row) => {
    const weight = row.VolumeUnits > 0 ? row.VolumeUnits : 1;
    avgDaysNumerator += row.AvgDays * weight;
    avgDaysWeight += weight;
    if (Number(row.AvgTransitDays ?? 0) > 0) {
      avgTransitDaysNumerator += Number(row.AvgTransitDays) * weight;
      avgTransitDaysWeight += weight;
    }
  });
  const avgDays = avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;
  const avgTransitDays = avgTransitDaysWeight > 0 ? avgTransitDaysNumerator / avgTransitDaysWeight : null;
  const maxUtil = rows.reduce((max, row) => Math.max(max, row.UtilPct), 0);
  const totalSpaceRequired = rows.reduce((sum, row) => sum + row.SpaceRequired, 0);
  const spaceCore = rows.reduce((sum, row) => sum + row.SpaceCore, 0);
  const spaceBCV = rows.reduce((sum, row) => sum + row.SpaceBCV, 0);
  const excludedBySla = rows.reduce((sum, row) => sum + row.ExcludedBySLACount, 0);
  const slaBreachCount = rows.reduce((sum, row) => sum + row.SLABreachCount, 0);
  const slaBreachPct = totalUnits > 0 ? (slaBreachCount / totalUnits) * 100 : 0;
  const missingAvgDays = rows.filter((row) => row.AvgDays === 0).length;

  return {
    totalCost,
    totalUnits,
    costPerUnit: Number((totalUnits > 0 ? totalCost / totalUnits : 0).toFixed(2)),
    avgDays: Number(avgDays.toFixed(2)),
    avgTransitDays: avgTransitDays === null ? null : Number(avgTransitDays.toFixed(2)),
    maxUtil: Number(maxUtil.toFixed(2)),
    totalSpaceRequired,
    spaceCore,
    spaceBCV,
    excludedBySla,
    slaBreachCount,
    slaBreachPct,
    missingAvgDays,
  };
};

export const summarizeLaneResults = (rows: ScenarioRunResultsLane[]) => {
  const grouped = new Set<string>();
  const byScenario = new Map<string, number>();
  rows.forEach((row) => {
    grouped.add(`${row.Dest3Zip}|${row.Channel}|${row.Terms}|${row.DestState}|${row.ScenarioType || ''}`);
    byScenario.set(row.ScenarioRunID, (byScenario.get(row.ScenarioRunID) || 0) + 1);
  });
  return {
    laneGroupCount: grouped.size,
    scenarioGroupCount: byScenario.size,
  };
};
