import DatasetApi, { DatasetApiHelpers } from './datasetApi';
import {
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  DataHealthSnapshot,
} from '../data/mockData';

export const DOMO_DC_DATASET_ID = '0f804e68-b63f-4409-a979-64dea90018fe';

export type DomoDcRow = Record<string, string | number | null>;

export type DatasetOptionSets = {
  scenarioTypes: string[];
  channelScopes: string[];
  termsScopes: string[];
  tags: string[];
  footprintModes: string[];
  utilCaps: number[];
  levelLoadModes: string[];
  leadTimeCaps: number[];
  excludeBeyondCap: boolean[];
  costVsServiceWeights: number[];
  fuelSurchargeModes: string[];
  accessorialFlags: string[];
  allowRelocationPrepaid: boolean[];
  allowRelocationCollect: boolean[];
  bcvRuleSets: string[];
  allowManualOverride: boolean[];
};

export const getEntityOrder = (rows: DomoDcRow[]): string[] => {
  const entities: string[] = [];
  rows.forEach((row) => {
    const entity = asText(getField(row, ['DC_entity']));
    if (entity && !entities.includes(entity)) {
      entities.push(entity);
    }
  });
  return entities;
};

export const parseEntityScope = (entityScope: string): string[] => {
  if (!entityScope) return [];
  return entityScope.split('/').map((e) => e.trim()).filter(Boolean);
};

const getField = (row: DomoDcRow, keys: string[]): unknown => {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return undefined;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (cleaned === '') return fallback;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const asNumberOptional = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const asPercent = (value: unknown): number => {
  const num = asNumber(value, 0);
  if (num <= 1) return Math.round(num * 1000) / 10;
  return Math.round(num * 10) / 10;
};

const uniqueStrings = (values: Array<string | null | undefined>): string[] => {
  const set = new Set<string>();
  values.forEach((v) => {
    const trimmed = asText(v);
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
};

const describeValues = (values: string[]): string => {
  if (values.length === 0) return 'NA';
  if (values.length === 1) return values[0];
  return 'Multiple';
};

const uniqueNumbers = (values: Array<number | null | undefined>): number[] => {
  const set = new Set<number>();
  values.forEach((v) => {
    if (v === null || v === undefined) return;
    if (!Number.isNaN(v)) set.add(v);
  });
  return Array.from(set).sort((a, b) => a - b);
};

const uniqueBooleans = (values: Array<unknown>): boolean[] => {
  const set = new Set<boolean>();
  values.forEach((v) => {
    const text = asText(v).toLowerCase();
    if (text === 'y' || text === 'yes' || text === 'true') set.add(true);
    if (text === 'n' || text === 'no' || text === 'false') set.add(false);
  });
  return Array.from(set);
};

export const buildDatasetOptionSets = (rows: DomoDcRow[]): DatasetOptionSets => {
  const scenarioTypes = uniqueStrings(rows.map((row) => getField(row, ['scenarioType']) as string));
  const channelScopes = uniqueStrings(rows.map((row) => getField(row, ['ChannelScope', 'Channel']) as string));
  const termsScopes = uniqueStrings(rows.map((row) => getField(row, ['TermsScope', 'Terms']) as string));
  const tags = uniqueStrings(rows.map((row) => getField(row, ['Tags']) as string));
  const footprintModes = uniqueStrings(rows.map((row) => getField(row, ['FootprintMode']) as string));
  const utilCaps = uniqueNumbers(
    rows.map((row) =>
      asNumberOptional(getField(row, ['UtilCapPct', 'UtilizationCap', 'maxUtilization%', 'maxUtilization %', 'maxUtilization']))
    )
  );
  const levelLoadModes = uniqueStrings(rows.map((row) => getField(row, ['LevelLoadMode']) as string));
  const leadTimeCaps = uniqueNumbers(rows.map((row) => asNumberOptional(getField(row, ['LeadTimeCapDays']))));
  const excludeBeyondCap = uniqueBooleans(rows.map((row) => getField(row, ['ExcludeBeyondCap'])));
  const costVsServiceWeights = uniqueNumbers(rows.map((row) => asNumberOptional(getField(row, ['CostVsServiceWeight']))));
  const fuelSurchargeModes = uniqueStrings(rows.map((row) => getField(row, ['FuelSurchargeMode']) as string));
  const accessorialFlags = uniqueStrings(
    rows.flatMap((row) => asText(getField(row, ['AccessorialFlags'])).split(','))
  );
  const allowRelocationPrepaid = uniqueBooleans(rows.map((row) => getField(row, ['AllowRelocationPrepaid'])));
  const allowRelocationCollect = uniqueBooleans(rows.map((row) => getField(row, ['AllowRelocationCollect'])));
  const bcvRuleSets = uniqueStrings(rows.map((row) => getField(row, ['BCVRuleSet']) as string));
  const allowManualOverride = uniqueBooleans(rows.map((row) => getField(row, ['AllowManualOverride'])));

  return {
    scenarioTypes,
    channelScopes,
    termsScopes,
    tags,
    footprintModes,
    utilCaps,
    levelLoadModes,
    leadTimeCaps,
    excludeBeyondCap,
    costVsServiceWeights,
    fuelSurchargeModes,
    accessorialFlags,
    allowRelocationPrepaid,
    allowRelocationCollect,
    bcvRuleSets,
    allowManualOverride,
  };
};
export const fetchDomoDcDatasetRows = async (): Promise<{
  dataset: any;
  rows: DomoDcRow[];
  rawCsv: string;
}> => {
  const token = await DatasetApi.fetchAccessToken();
  const dataset = await DatasetApi.getDataset(DOMO_DC_DATASET_ID, token);
  const csv = await DatasetApi.getDatasetDataCsv(DOMO_DC_DATASET_ID, token, 50000, 0);
  const parsed = DatasetApiHelpers.csvToObjects(csv) as DomoDcRow[];
  return { dataset, rows: parsed, rawCsv: csv };
};

export const mapDcResultsFromRows = (
  rows: DomoDcRow[],
  scenarioRunId: string,
  _entityOrder: string[]
): ScenarioRunResultsDC[] => {
  return rows.map((row, idx) => {
    const squareFootage = asNumber(
      getField(row, ['Square Footage', 'SquareFootage', 'Square Footage '])
    );
    const workingCapacity = asNumber(
      getField(row, ['Working Capacity Sq Ft', 'WorkingCapacitySqFt', 'Working Capacity Sq Ft '])
    );
    const maxUtil = asNumber(getField(row, ['maxUtilization%', 'maxUtilization %', 'maxUtilization']));
    const avgDaysRaw = asNumberOptional(getField(row, ['averageDeliveryDays']));

    return {
      ScenarioRunID: scenarioRunId,
      DCName: asText(getField(row, ['DC', 'DC Name', 'DCName'])),
      TotalCost: asNumber(getField(row, ['totalCost'])),
      VolumeUnits: asNumber(getField(row, ['totalUnitShipped'])),
      AvgDays: avgDaysRaw ?? 0,
      UtilPct: Number((maxUtil || asPercent(getField(row, ['Pallet Pos Util %', 'Pallet Pos Util % ']))).toFixed(2)),
      SpaceRequired: workingCapacity,
      SpaceCore: squareFootage,
      SpaceBCV: workingCapacity,
      SLABreachCount: asNumber(getField(row, ['slaBreach'])),
      ExcludedBySLACount: Math.max(0, Math.round(squareFootage - workingCapacity)),
      RankOverall: idx + 1,
      IsSuppressed: 'N',
    };
  });
};

export const buildScenarioHeaderFromRows = (
  rows: DomoDcRow[],
  scenarioRunId: string,
  entityOrderOverride?: string[]
): ScenarioRunHeader => {
  const totalCost = rows.reduce((sum, row) => sum + asNumber(getField(row, ['totalCost'])), 0);
  const totalUnits = rows.reduce((sum, row) => sum + asNumber(getField(row, ['totalUnitShipped'])), 0);
  let avgDaysNumerator = 0;
  let avgDaysWeight = 0;
  rows.forEach((row) => {
    const avgDaysRaw = asNumberOptional(getField(row, ['averageDeliveryDays']));
    if (avgDaysRaw === null) return;
    const units = asNumber(getField(row, ['totalUnitShipped']));
    const weight = units > 0 ? units : 1;
    avgDaysNumerator += avgDaysRaw * weight;
    avgDaysWeight += weight;
  });
  const avgDays = avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;

  let slaNumerator = 0;
  let slaWeight = 0;
  rows.forEach((row) => {
    const slaRaw = asNumberOptional(getField(row, ['slaBreach%']));
    if (slaRaw === null) return;
    const orders = asNumber(getField(row, ['totalOrderCount']));
    const weight = orders > 0 ? orders : 1;
    slaNumerator += slaRaw * weight;
    slaWeight += weight;
  });
  const slaBreachPct = slaWeight > 0 ? slaNumerator / slaWeight : 0;
  const maxUtil = rows.reduce((max, row) => {
    const value = asNumber(getField(row, ['maxUtilization%', 'maxUtilization %', 'maxUtilization']));
    return Math.max(max, value || asPercent(getField(row, ['Pallet Pos Util %', 'Pallet Pos Util % '])));
  }, 0);

  const entityOrder = entityOrderOverride && entityOrderOverride.length > 0
    ? entityOrderOverride
    : getEntityOrder(rows);
  const entityScopeParts = entityOrder.filter((entity) =>
    rows.some((row) => asText(getField(row, ['DC_entity'])) === entity)
  );
  const entityScope =
    entityScopeParts.length === 0
      ? 'Unknown'
      : entityScopeParts.length === 1
        ? entityScopeParts[0]
        : `${entityScopeParts[0]}/${entityScopeParts[1]}`;

  const regionRaw = asText(getField(rows[0] ?? {}, ['DC_region']));
  const region = regionRaw === 'Canada' ? 'Canada' : 'US';
  const scenarioTypeRaw = asText(getField(rows[0] ?? {}, ['scenarioType']));
  const scenarioType = scenarioTypeRaw || 'Baseline';

  const channelScope = uniqueStrings(rows.map((row) => asText(getField(row, ['ChannelScope', 'Channel']))));
  const termsScope = uniqueStrings(rows.map((row) => asText(getField(row, ['TermsScope', 'Terms']))));
  const tags = uniqueStrings(rows.map((row) => asText(getField(row, ['Tags']))));
  const assumptions = uniqueStrings(rows.map((row) => asText(getField(row, ['AssumptionsSummary']))));
  const snapshotVersions = uniqueStrings(rows.map((row) => asText(getField(row, ['DataSnapshotVersion']))));
  const latestComments = uniqueStrings(rows.map((row) => asText(getField(row, ['LatestComment', 'Comment']))));

  const totalSquareFootageByEntity = entityOrder.map((entity) =>
    Math.round(
      rows.reduce((sum, row) => {
        const rowEntity = asText(getField(row, ['DC_entity']));
        if (rowEntity !== entity) return sum;
        return sum + asNumber(getField(row, ['Square Footage', 'SquareFootage', 'Square Footage ']));
      }, 0)
    )
  );
  const totalWorkingCapacity = Math.round(
    rows.reduce(
      (sum, row) => sum + asNumber(getField(row, ['Working Capacity Sq Ft', 'WorkingCapacitySqFt', 'Working Capacity Sq Ft '])),
      0
    )
  );
  const totalSquareFootage = totalSquareFootageByEntity.reduce((sum, val) => sum + val, 0);
  const excludedBySla = Math.max(0, totalSquareFootage - totalWorkingCapacity);

  const weightedCostPerUnit = totalUnits > 0
    ? rows.reduce((sum, row) => {
        const units = asNumber(getField(row, ['totalUnitShipped']));
        const cpu = asNumber(getField(row, ['costPerUnit']));
        return sum + cpu * units;
      }, 0) / totalUnits
    : 0;

  const alertFlags: string[] = [];
  if (maxUtil > 100) alertFlags.push('OverCap');
  if (slaBreachPct > 5) alertFlags.push('SLA');
  if (rows.some((row) => asNumberOptional(getField(row, ['averageDeliveryDays'])) === null)) alertFlags.push('MissingRates');
  if (rows.some((row) => asNumberOptional(getField(row, ['Square Footage', 'SquareFootage', 'Square Footage '])) === null)) alertFlags.push('Assumed');

  return {
    ScenarioRunID: scenarioRunId,
    RunName: `DC - ${region} - ${scenarioType}`,
    Region: region,
    ScenarioType: scenarioType as ScenarioRunHeader['ScenarioType'],
    EntityScope: entityScope,
    ChannelScope: describeValues(channelScope),
    TermsScope: describeValues(termsScope),
    CreatedBy: 'NA',
    CreatedAt: new Date().toISOString(),
    LastUpdatedAt: new Date().toISOString(),
    Status: 'Running',
    ApprovedBy: null,
    ApprovedAt: null,
    LatestComment: describeValues(latestComments),
    Tags: describeValues(tags),
    DataSnapshotVersion: describeValues(snapshotVersions),
    AssumptionsSummary: describeValues(assumptions),
    AlertFlags: alertFlags.join(','),
    TotalCost: Math.round(totalCost),
    CostPerUnit: Number(weightedCostPerUnit.toFixed(2)),
    AvgDeliveryDays: Number(avgDays.toFixed(2)),
    SLABreachPct: Number(slaBreachPct.toFixed(2)),
    ExcludedBySLACount: excludedBySla,
    MaxUtilPct: Number(maxUtil.toFixed(2)),
    TotalSpaceRequired: totalWorkingCapacity,
    SpaceCore: totalSquareFootageByEntity[0] || 0,
    SpaceBCV: totalSquareFootageByEntity[1] || 0,
    OverrideCount: 0,
    LaneCount: rows.length,
    ChangedLaneCountVsBaseline: 0,
  };
};

export const buildDataHealthSnapshotFromRows = (rows: DomoDcRow[]): DataHealthSnapshot => {
  const totalRows = rows.length || 1;
  const missingAvgDays = rows.filter((row) => asNumberOptional(getField(row, ['averageDeliveryDays'])) === null).length;
  const missingSlaPct = rows.filter((row) => asNumberOptional(getField(row, ['slaBreach%'])) === null).length;
  const missingCapacity = rows.filter((row) => {
    const capacity = asNumberOptional(getField(row, ['Working Capacity Sq Ft', 'WorkingCapacitySqFt', 'Working Capacity Sq Ft ']));
    return capacity === null || capacity === 0;
  }).length;
  const missingSquare = rows.filter((row) => {
    const square = asNumberOptional(getField(row, ['Square Footage', 'SquareFootage', 'Square Footage ']));
    return square === null || square === 0;
  }).length;

  const coverage = Math.round(((totalRows - missingAvgDays) / totalRows) * 1000) / 10;
  const slaCoverage = Math.round(((totalRows - missingSlaPct) / totalRows) * 1000) / 10;

  const forecastFreshness: DataHealthSnapshot['ForecastFreshness'] = missingAvgDays > 0 ? 'Warn' : 'OK';
  const capacityFreshness: DataHealthSnapshot['CapacityFreshness'] = missingCapacity > 0 ? 'Warn' : 'OK';
  const bcvAvailability: DataHealthSnapshot['BCVDimsAvailability'] = missingSquare > 0 ? 'Assumed' : 'OK';

  return {
    SnapshotTime: new Date().toISOString(),
    ForecastFreshness: forecastFreshness,
    RatesCoveragePct: Math.min(100, Math.round((coverage + slaCoverage) / 2 * 10) / 10),
    MissingRatesLaneCount: missingAvgDays + missingSlaPct,
    CapacityFreshness: capacityFreshness,
    MissingCapacityDCCount: missingCapacity,
    BCVDimsAvailability: bcvAvailability,
    Notes: 'Derived from dataset completeness (avg days, SLA%, capacity, square footage).',
  };
};
