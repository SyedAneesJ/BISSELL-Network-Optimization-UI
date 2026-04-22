import DatasetApi from './datasetApi';
import { csvToObjects } from '@/utils';
import {
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  DataHealthSnapshot,
} from '@/data';
import { scenarioDatasetRegistry, ScenarioDatasetRegistryItem } from './datasetRegistry';

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

export type ScenarioDatasetFetchResult = {
  datasetId: string;
  datasetMeta: any;
  registryItem: ScenarioDatasetRegistryItem;
  rows: DomoDcRow[];
  rawCsv: string;
};

const detectRegionFromText = (text: string): 'US' | 'Canada' | null => {
  const normalized = text.toLowerCase();
  if (normalized.includes('canada') || normalized.includes(' ca ') || normalized.startsWith('ca ')) {
    return 'Canada';
  }
  if (
    normalized.includes('united states') ||
    normalized.includes(' usa ') ||
    normalized.includes(' us ') ||
    normalized.startsWith('us ')
  ) {
    return 'US';
  }
  return null;
};

const FIELD_ALIASES = {
  dc: ['DC', 'dc', 'DC Name', 'DCName'],
  region: ['DC_region', 'dcRegion', 'region'],
  entity: ['DC_entity', 'dcEntity'],
  entityScope: ['entityScope'],
  totalCost: ['totalCost'],
  totalUnits: ['totalUnitShipped', 'totalcount'],
  avgDeliveryDays: ['averageDeliveryDays'],
  avgTransitDays: ['averageTransitDays'],
  slaBreachCount: ['slaBreach'],
  totalOrderCount: ['totalOrderCount', 'totalcount'],
  costPerUnit: ['costPerUnit'],
  slaBreachPct: ['slaBreach%', ' slaBreach%'],
  maxUtilizationPct: ['maxUtilization%', 'maxUtilization %', 'maxUtilization'],
  palletUtilizationPct: ['Pallet Pos Util %', 'Pallet Pos Util % '],
  squareFootage: ['Square Footage', 'SquareFootage', 'Square Footage ', 'sqft'],
  workingCapacity: ['Working Capacity Sq Ft', 'WorkingCapacitySqFt', 'Working Capacity Sq Ft ', 'spaceRequired'],
  coreSpace: ['coreSpace'],
  bcvSpace: ['bcvSpace'],
  scenarioType: ['scenarioType'],
  channelScope: ['ChannelScope', 'Channel'],
  termsScope: ['TermsScope', 'Terms'],
  tags: ['Tags'],
  assumptionsSummary: ['AssumptionsSummary'],
  dataSnapshotVersion: ['DataSnapshotVersion'],
  latestComment: ['LatestComment', 'Comment'],
  footprintMode: ['FootprintMode', 'footprintMode'],
  utilCap: ['UtilCapPct', 'UtilizationCap', 'utilizationCap', 'maxUtilization%', 'maxUtilization %', 'maxUtilization'],
  levelLoad: ['LevelLoadMode', 'levelLoad'],
  leadTimeCap: ['LeadTimeCapDays'],
  excludeBeyondCap: ['ExcludeBeyondCap'],
  costVsServiceWeight: ['CostVsServiceWeight'],
  fuelSurchargeMode: ['FuelSurchargeMode'],
  accessorialFlags: ['AccessorialFlags'],
  allowRelocationPrepaid: ['AllowRelocationPrepaid'],
  allowRelocationCollect: ['AllowRelocationCollect'],
  collectTreatment: ['collectTreatment'],
  bcvRuleSet: ['BCVRuleSet'],
  allowManualOverride: ['AllowManualOverride'],
} as const;

const getField = (row: DomoDcRow, keys: readonly string[]): unknown => {
  const rowEntries = Object.entries(row);
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
    const normalized = key.trim().toLowerCase();
    const fallback = rowEntries.find(([rowKey]) => rowKey.trim().toLowerCase() === normalized);
    if (fallback) return fallback[1];
  }
  return undefined;
};

const asNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const cleaned = String(value).replace(/,/g, '').replace(/%/g, '').trim();
  if (cleaned === '') return fallback;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const asNumberOptional = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').replace(/%/g, '').trim();
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

const asAbsNumber = (value: unknown, fallback = 0): number =>
  Math.abs(asNumber(value, fallback));

const uniqueStrings = (values: Array<string | null | undefined>): string[] => {
  const set = new Set<string>();
  values.forEach((v) => {
    const trimmed = asText(v);
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
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
    if (text === 'y' || text === 'yes' || text === 'true' || text === 'on') set.add(true);
    if (text === 'n' || text === 'no' || text === 'false' || text === 'off') set.add(false);
  });
  return Array.from(set);
};

const describeValues = (values: string[]): string => {
  if (values.length === 0) return 'NA';
  if (values.length === 1) return values[0];
  return 'Multiple';
};

const normalizeRegion = (regionRaw: string, defaultRegion: ScenarioDatasetRegistryItem['regionDefault']): 'US' | 'Canada' => {
  const normalized = regionRaw.toLowerCase();
  if (normalized.includes('canada') || normalized === 'ca') return 'Canada';
  if (normalized.includes('us') || normalized.includes('usa') || normalized.includes('united states')) return 'US';
  if (defaultRegion === 'Canada') return 'Canada';
  return 'US';
};

const scenarioIdPart = (value: string): string =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'NA';

export const getEntityOrder = (rows: DomoDcRow[]): string[] => {
  const entities: string[] = [];
  rows.forEach((row) => {
    const entity = asText(getField(row, FIELD_ALIASES.entity)) || asText(getField(row, FIELD_ALIASES.entityScope));
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

export const buildDatasetOptionSets = (rows: DomoDcRow[]): DatasetOptionSets => {
  const scenarioTypes = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.scenarioType))));
  const channelScopes = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.channelScope))));
  const termsScopes = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.termsScope))));
  const tags = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.tags))));
  const footprintModes = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.footprintMode))));
  const utilCaps = uniqueNumbers(rows.map((row) => asNumberOptional(getField(row, FIELD_ALIASES.utilCap))));
  const levelLoadModes = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.levelLoad))));
  const leadTimeCaps = uniqueNumbers(rows.map((row) => asNumberOptional(getField(row, FIELD_ALIASES.leadTimeCap))));
  const excludeBeyondCap = uniqueBooleans(rows.map((row) => getField(row, FIELD_ALIASES.excludeBeyondCap)));
  const costVsServiceWeights = uniqueNumbers(rows.map((row) => asNumberOptional(getField(row, FIELD_ALIASES.costVsServiceWeight))));
  const fuelSurchargeModes = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.fuelSurchargeMode))));
  const accessorialFlags = uniqueStrings(
    rows.flatMap((row) => asText(getField(row, FIELD_ALIASES.accessorialFlags)).split(','))
  );
  const allowRelocationPrepaid = uniqueBooleans(rows.map((row) => getField(row, FIELD_ALIASES.allowRelocationPrepaid)));
  const allowRelocationCollect = uniqueBooleans(rows.map((row) => getField(row, FIELD_ALIASES.allowRelocationCollect)));
  const bcvRuleSets = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.bcvRuleSet))));
  const allowManualOverride = uniqueBooleans(rows.map((row) => getField(row, FIELD_ALIASES.allowManualOverride)));

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

export const fetchAllScenarioDatasets = async (): Promise<ScenarioDatasetFetchResult[]> => {
  const enabledDatasets = scenarioDatasetRegistry.filter((item) => item.enabled);
  if (enabledDatasets.length === 0) return [];

  const token = await DatasetApi.fetchAccessToken();
  const results = await Promise.all(
    enabledDatasets.map(async (item) => {
      const [datasetMeta, rawCsv] = await Promise.all([
        DatasetApi.getDataset(item.datasetId, token),
        DatasetApi.getDatasetDataCsv(item.datasetId, token, 50000, 0),
      ]);
      const rows = csvToObjects(rawCsv) as DomoDcRow[];
      return {
        datasetId: item.datasetId,
        datasetMeta,
        registryItem: item,
        rows,
        rawCsv,
      };
    })
  );

  return results;
};

export const resolveRegistryItemFromMeta = (
  item: ScenarioDatasetRegistryItem,
  datasetMeta: any
): ScenarioDatasetRegistryItem => {
  const metaName = asText(datasetMeta?.name);
  const inferredRegion = detectRegionFromText(metaName);
  const regionDefault =
    item.regionDefault === 'Auto'
      ? (inferredRegion ?? 'Auto')
      : item.regionDefault;

  const scenarioLabel =
    item.scenarioLabel.startsWith('Dataset ') && metaName
      ? metaName
      : item.scenarioLabel;

  return {
    ...item,
    regionDefault,
    scenarioLabel,
  };
};

export const fetchDomoDcDatasetRows = async (): Promise<{
  dataset: any;
  rows: DomoDcRow[];
  rawCsv: string;
}> => {
  const all = await fetchAllScenarioDatasets();
  if (all.length === 0) {
    return { dataset: null, rows: [], rawCsv: '' };
  }
  return {
    dataset: all[0].datasetMeta,
    rows: all[0].rows,
    rawCsv: all[0].rawCsv,
  };
};

export const buildScenarioIdentityFromRows = (
  rows: DomoDcRow[],
  datasetInfo: ScenarioDatasetRegistryItem
): {
  scenarioId: string;
  region: 'US' | 'Canada';
  scenarioType: string;
  entityScope: string;
} => {
  const regionRaw = asText(getField(rows[0] ?? {}, FIELD_ALIASES.region));
  const region = normalizeRegion(regionRaw, datasetInfo.regionDefault);
  const scenarioType = asText(getField(rows[0] ?? {}, FIELD_ALIASES.scenarioType)) || datasetInfo.scenarioLabel || 'Baseline';

  const explicitEntityScope = asText(getField(rows[0] ?? {}, FIELD_ALIASES.entityScope));
  const inferredEntities = getEntityOrder(rows);
  const entityScope = explicitEntityScope || (inferredEntities.length > 0 ? inferredEntities.join('/') : 'NA');

  const scenarioId = `SR_${scenarioIdPart(datasetInfo.scenarioKey)}_${scenarioIdPart(region)}_${scenarioIdPart(scenarioType)}_${scenarioIdPart(entityScope)}`;
  return { scenarioId, region, scenarioType, entityScope };
};

export const mapDcResultsFromRows = (
  rows: DomoDcRow[],
  scenarioRunId: string,
  _entityOrder: string[],
  _datasetInfo?: ScenarioDatasetRegistryItem
): ScenarioRunResultsDC[] => {
  return rows.map((row, idx) => {
    const squareFootage = asNumber(getField(row, FIELD_ALIASES.squareFootage));
    const workingCapacity = asNumber(getField(row, FIELD_ALIASES.workingCapacity));
    const explicitCoreSpace = asNumberOptional(getField(row, FIELD_ALIASES.coreSpace));
    const explicitBcvSpace = asNumberOptional(getField(row, FIELD_ALIASES.bcvSpace));
    const spaceRequired = asNumberOptional(getField(row, FIELD_ALIASES.workingCapacity)) ?? workingCapacity;
    const maxUtil = asNumber(getField(row, FIELD_ALIASES.maxUtilizationPct));
    const avgDaysRaw =
      asNumberOptional(getField(row, FIELD_ALIASES.avgDeliveryDays)) ??
      asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays));

    return {
      ScenarioRunID: scenarioRunId,
      DCName: asText(getField(row, FIELD_ALIASES.dc)),
      TotalCost: asAbsNumber(getField(row, FIELD_ALIASES.totalCost)),
      VolumeUnits: asNumber(getField(row, FIELD_ALIASES.totalUnits)),
      AvgDays: avgDaysRaw ?? 0,
      UtilPct: Number((maxUtil || asPercent(getField(row, FIELD_ALIASES.palletUtilizationPct))).toFixed(2)),
      SpaceRequired: Number(spaceRequired.toFixed(2)),
      SpaceCore: Number((explicitCoreSpace ?? squareFootage).toFixed(2)),
      SpaceBCV: Number((explicitBcvSpace ?? workingCapacity).toFixed(2)),
      SLABreachCount: asNumber(getField(row, FIELD_ALIASES.slaBreachCount)),
      ExcludedBySLACount: Math.max(0, Math.round(squareFootage - spaceRequired)),
      RankOverall: idx + 1,
      IsSuppressed: 'N',
    };
  });
};

export const buildScenarioHeaderFromRows = (
  rows: DomoDcRow[],
  scenarioRunId: string,
  entityOrderOverride?: string[],
  datasetInfo?: ScenarioDatasetRegistryItem
): ScenarioRunHeader => {
  const totalCost = rows.reduce((sum, row) => sum + asAbsNumber(getField(row, FIELD_ALIASES.totalCost)), 0);
  const totalUnits = rows.reduce((sum, row) => sum + asNumber(getField(row, FIELD_ALIASES.totalUnits)), 0);
  let avgDaysNumerator = 0;
  let avgDaysWeight = 0;
  rows.forEach((row) => {
    const avgDaysRaw =
      asNumberOptional(getField(row, FIELD_ALIASES.avgDeliveryDays)) ??
      asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays));
    if (avgDaysRaw === null) return;
    const units = asNumber(getField(row, FIELD_ALIASES.totalUnits));
    const weight = units > 0 ? units : 1;
    avgDaysNumerator += avgDaysRaw * weight;
    avgDaysWeight += weight;
  });
  const avgDays = avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;

  let slaNumerator = 0;
  let slaWeight = 0;
  rows.forEach((row) => {
    const slaRaw = asNumberOptional(getField(row, FIELD_ALIASES.slaBreachPct));
    if (slaRaw === null) return;
    const orders = asNumber(getField(row, FIELD_ALIASES.totalOrderCount));
    const weight = orders > 0 ? orders : 1;
    slaNumerator += slaRaw * weight;
    slaWeight += weight;
  });
  const slaBreachPct = slaWeight > 0 ? slaNumerator / slaWeight : 0;
  const maxUtil = rows.reduce((max, row) => {
    const value = asNumber(getField(row, FIELD_ALIASES.maxUtilizationPct));
    return Math.max(max, value || asPercent(getField(row, FIELD_ALIASES.palletUtilizationPct)));
  }, 0);

  const entityOrder = entityOrderOverride && entityOrderOverride.length > 0
    ? entityOrderOverride
    : getEntityOrder(rows);
  const explicitEntityScope = asText(getField(rows[0] ?? {}, FIELD_ALIASES.entityScope));
  const entityScopeParts = entityOrder.filter((entity) =>
    rows.some((row) => asText(getField(row, FIELD_ALIASES.entity)) === entity)
  );
  const entityScope = explicitEntityScope || (
    entityScopeParts.length === 0
      ? 'NA'
      : entityScopeParts.length === 1
        ? entityScopeParts[0]
        : `${entityScopeParts[0]}/${entityScopeParts[1]}` 
  );

  const regionRaw = asText(getField(rows[0] ?? {}, FIELD_ALIASES.region));
  const region = normalizeRegion(regionRaw, datasetInfo?.regionDefault ?? 'Auto');
  const scenarioTypeRaw = asText(getField(rows[0] ?? {}, FIELD_ALIASES.scenarioType));
  const scenarioType = scenarioTypeRaw || datasetInfo?.scenarioLabel || 'Baseline';
  const footprintMode = describeValues(uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.footprintMode)))));
  const levelLoad = describeValues(uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.levelLoad)))));
  const utilCaps = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.utilCap))));
  const utilizationCap = utilCaps.length === 0 ? 'NA' : utilCaps[0];
  const collectTreatment = describeValues(uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.collectTreatment)))));

  const channelScope = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.channelScope))));
  const termsScope = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.termsScope))));
  const tags = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.tags))));
  const assumptions = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.assumptionsSummary))));
  const snapshotVersions = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.dataSnapshotVersion))));
  const latestComments = uniqueStrings(rows.map((row) => asText(getField(row, FIELD_ALIASES.latestComment))));

  const totalSquareFootage = Math.round(rows.reduce(
    (sum, row) => sum + asNumber(getField(row, FIELD_ALIASES.squareFootage)),
    0
  ));
  const totalWorkingCapacity = Math.round(rows.reduce(
    (sum, row) => sum + asNumber(getField(row, FIELD_ALIASES.workingCapacity)),
    0
  ));
  const excludedBySla = Math.max(0, totalSquareFootage - totalWorkingCapacity);

  const totalCoreSpace = rows.reduce((sum, row) => {
    const explicit = asNumberOptional(getField(row, FIELD_ALIASES.coreSpace));
    return sum + (explicit ?? asNumber(getField(row, FIELD_ALIASES.squareFootage)));
  }, 0);
  const totalBcvSpace = rows.reduce((sum, row) => {
    const explicit = asNumberOptional(getField(row, FIELD_ALIASES.bcvSpace));
    return sum + (explicit ?? asNumber(getField(row, FIELD_ALIASES.workingCapacity)));
  }, 0);

  const weightedCostPerUnit = totalUnits > 0
    ? rows.reduce((sum, row) => {
        const units = asNumber(getField(row, FIELD_ALIASES.totalUnits));
        const cpu = asAbsNumber(getField(row, FIELD_ALIASES.costPerUnit));
        return sum + cpu * units;
      }, 0) / totalUnits
    : 0;

  let transitDaysNumerator = 0;
  let transitDaysWeight = 0;
  rows.forEach((row) => {
    const transitDaysRaw = asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays));
    if (transitDaysRaw === null) return;
    const units = asNumber(getField(row, FIELD_ALIASES.totalUnits));
    const weight = units > 0 ? units : 1;
    transitDaysNumerator += transitDaysRaw * weight;
    transitDaysWeight += weight;
  });
  const avgTransitDays = transitDaysWeight > 0 ? transitDaysNumerator / transitDaysWeight : null;

  const totalCountRaw = rows.reduce((sum, row) => sum + asNumber(getField(row, ['totalcount'])), 0);
  const totalCount = totalCountRaw > 0 ? totalCountRaw : totalUnits;

  const alertFlags: string[] = [];
  if (maxUtil > 100) alertFlags.push('OverCap');
  if (slaBreachPct > 5) alertFlags.push('SLA');
  if (rows.some((row) =>
    asNumberOptional(getField(row, FIELD_ALIASES.avgDeliveryDays)) === null &&
    asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays)) === null
  )) {
    alertFlags.push('MissingRates');
  }
  if (rows.some((row) => asNumberOptional(getField(row, FIELD_ALIASES.squareFootage)) === null)) alertFlags.push('Assumed');

  return {
    ScenarioRunID: scenarioRunId,
    RunName: `${datasetInfo?.scenarioLabel || 'Dataset'} - ${region} - ${scenarioType}`,
    Region: region,
    ScenarioType: scenarioType as ScenarioRunHeader['ScenarioType'],
    EntityScope: entityScope,
    DataflowID: datasetInfo?.dataflowId,
    ChannelScope: describeValues(channelScope),
    TermsScope: describeValues(termsScope),
    CreatedBy: 'NA',
    CreatedAt: new Date().toISOString(),
    LastUpdatedAt: new Date().toISOString(),
    Status: 'Completed',
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
    AvgTransitDays: avgTransitDays === null ? null : Number(avgTransitDays.toFixed(2)),
    TotalCount: totalCount,
    SLABreachPct: Number(slaBreachPct.toFixed(2)),
    ExcludedBySLACount: excludedBySla,
    MaxUtilPct: Number(maxUtil.toFixed(2)),
    TotalSpaceRequired: totalWorkingCapacity,
    SpaceCore: Math.round(totalCoreSpace),
    SpaceBCV: Math.round(totalBcvSpace),
    FootprintMode: footprintMode,
    LevelLoad: levelLoad,
    UtilizationCap: utilizationCap,
    CollectTreatment: collectTreatment,
    OverrideCount: 0,
    LaneCount: rows.length,
    ChangedLaneCountVsBaseline: 0,
  };
};

export const buildDataHealthSnapshotFromRows = (rows: DomoDcRow[]): DataHealthSnapshot => {
  const totalRows = rows.length || 1;
  const missingAvgDays = rows.filter((row) =>
    asNumberOptional(getField(row, FIELD_ALIASES.avgDeliveryDays)) === null &&
    asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays)) === null
  ).length;
  const missingSlaPct = rows.filter((row) => asNumberOptional(getField(row, FIELD_ALIASES.slaBreachPct)) === null).length;
  const missingCapacity = rows.filter((row) => {
    const capacity = asNumberOptional(getField(row, FIELD_ALIASES.workingCapacity));
    return capacity === null || capacity === 0;
  }).length;
  const missingSquare = rows.filter((row) => {
    const square = asNumberOptional(getField(row, FIELD_ALIASES.squareFootage));
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
