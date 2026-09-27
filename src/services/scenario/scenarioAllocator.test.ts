import { describe, expect, it } from 'vitest';
import type { ScenarioRunResultsLane } from '@/data';
import type { DomoDcCapacityRow } from '@/services/domo/domoDataset';
import { allocateScenarioOutputs } from './scenarioAllocator';

const makeLane = (
  costingWarehouse: string,
  fullCost: number,
  relocatableCost: number,
): ScenarioRunResultsLane => ({
  ScenarioRunID: 'BASELINE',
  Dest3Zip: '123',
  DestState: 'TX',
  Channel: 'B2C',
  Terms: 'Prepaid',
  CustomerGroup: 'Core',
  AssignedDC: 'Dallas',
  DefaultShipFrom: 'Dallas',
  CostingWarehouse: costingWarehouse,
  RankedOption1DC: '',
  RankedOption1Cost: 0,
  RankedOption1Days: 0,
  RankedOption2DC: '',
  RankedOption2Cost: 0,
  RankedOption2Days: 0,
  RankedOption3DC: '',
  RankedOption3Cost: 0,
  RankedOption3Days: 0,
  ChosenRank: 0,
  LaneCost: relocatableCost,
  TotalCost: relocatableCost,
  CostDeltaVsBest: 0,
  DeliveryDays: 2,
  SLABreachFlag: 'N',
  ExcludedBySLAFlag: 'N',
  FootprintContribution: 1,
  UtilImpactPct: 0,
  OverrideAppliedFlag: 'N',
  OverrideVersion: null,
  NotesFlag: '',
  FullCost: fullCost,
  RelocatableCost: relocatableCost,
  CostBasis: 'EXCLUDING_DISTRIBUTION_FIXED',
});

const allocate = (
  scenarioType: string,
  lanes: ScenarioRunResultsLane[],
  suppressedDcs: string[],
) => {
  const dcCapacityRows: DomoDcCapacityRow[] = ['Dallas', 'Elwood', 'Los Angeles'].map((DCName) => ({
    DCName,
    Sqft: 100,
    WorkingCapacitySqFt: 100,
    Region: 'US',
    Status: 'Active',
    IsActive: true,
  }));
  return allocateScenarioOutputs({
    scenarioId: 'TEST',
    scenarioType,
    lanes,
    activeDcs: ['Elwood', 'Los Angeles'],
    suppressedDcs,
    dcCapacityRows,
    utilCap: 100,
  });
};

describe('suppressed-lane strategic ranking', () => {
  const lanes = [
    makeLane('Dallas', 100, 80),
    makeLane('Elwood', 200, 50),
    makeLane('Los Angeles', 150, 70),
  ];

  it('uses FullCost only for replacement selection and keeps exclusion cost as output cost', () => {
    const result = allocate('Strategic Pro Forma (Suppressed Lanes Only)', lanes, ['Dallas']);
    const selected = result.resultsLanes[0];

    expect(selected.AssignedDC).toBe('Los Angeles');
    expect(selected.FullCost).toBe(150);
    expect(selected.TotalCost).toBe(70);
    expect(selected.CostBasis).toBe('EXCLUDING_DISTRIBUTION_FIXED');
  });

  it('keeps an unsuppressed lane on its baseline DC even when another DC is cheaper', () => {
    const unsuppressedLanes = lanes.map((lane) => ({ ...lane, DefaultShipFrom: 'Elwood', AssignedDC: 'Elwood' }));
    const result = allocate('Strategic Pro Forma (Suppressed Lanes Only)', unsuppressedLanes, ['Dallas']);

    expect(result.resultsLanes[0].AssignedDC).toBe('Elwood');
  });

  it('retains exclusion-cost ranking for strategic collect-relocatable', () => {
    const result = allocate('Strategic Pro Forma (Collect Relocatable)', lanes, ['Dallas']);

    expect(result.resultsLanes[0].AssignedDC).toBe('Elwood');
    expect(result.resultsLanes[0].TotalCost).toBe(50);
  });

  it('does not apply FullCost ranking to tactical or normal strategic scenarios', () => {
    const tactical = allocate('Tactical Pro Forma', lanes, ['Dallas']);
    const strategic = allocate('Strategic Pro Forma', lanes, ['Dallas']);
    const baseline = allocate('US Baseline', lanes, ['Dallas']);

    expect(tactical.resultsLanes[0].AssignedDC).toBe('Elwood');
    expect(strategic.resultsLanes[0].AssignedDC).toBe('Elwood');
    expect(baseline.resultsLanes[0].AssignedDC).toBe('Dallas');
  });
});
