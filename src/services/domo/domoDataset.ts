import DatasetApi from './datasetApi';
import { csvToObjects, toCSV } from '@/utils';
import {
  ScenarioRunResultsLane,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  DataHealthSnapshot,
} from '@/data';
import { DEFAULT_SCENARIO_DATASET_REGISTRY, ScenarioDatasetRegistryItem } from './datasetRegistry';

export type DomoDcRow = Record<string, string | number | null>;
export type DomoLaneRow = Record<string, string | number | boolean | null | undefined>;
export type DomoDcCapacityRow = {
  DCName: string;
  Sqft: number;
  WorkingCapacitySqFt?: number;
  Region: string;
  Status: string;
  IsActive: boolean;
};

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

type ScenarioDatasetRegistryCsvRow = Record<string, string | number | boolean | null | undefined>;

const REGISTRY_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_REGISTRY_DATASET_ID || '').trim();
const RAW_LANE_DATASET_ENV_ID = String(
  import.meta.env.VITE_SCENARIO_LANE_RAW_DATASET_ID ||
  import.meta.env.VITE_SCENARIO_LANE_DATASET_ID ||
  ''
).trim();
const BCV_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_LANE_BCV_DATASET_ID || '').trim();
const TACTICAL_CONSOLIDATION_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_LANE_TACTICAL_CONSOLIDATION_DATASET_ID || '').trim();
const CANADA_BASELINE_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_LANE_CANADA_BASELINE_DATASET_ID || '').trim();
const CANADA_STRATFORD_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_CANADA_STRATFORD_DATASET_ID || '').trim();
const NORMALIZED_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_LANE_NORMALIZED_DATASET_ID || '').trim();
const DC_CAPACITY_DATASET_ENV_ID = String(import.meta.env.VITE_DC_CAPACITY_DATASET_ID || '').trim();
const REGISTRY_BOOTSTRAP_DATASET_NAME = 'Network Optimization Scenario Registry';
const REGISTRY_BOOTSTRAP_DATASET_DESCRIPTION = 'Scenario registry used by the Network Optimization UI';
const REGISTRY_BOOTSTRAP_STORAGE_KEY = `bissell-scenario-registry-bootstrap-${typeof window !== 'undefined' ? window.location.hostname : 'local'}`;
const LANE_BOOTSTRAP_DATASET_NAME = 'Network Optimization Normalized Lanes';
const LANE_BOOTSTRAP_DATASET_DESCRIPTION = 'Normalized lane rows used by the Network Optimization UI';
const LANE_BOOTSTRAP_STORAGE_KEY = `bissell-scenario-lane-bootstrap-${typeof window !== 'undefined' ? window.location.hostname : 'local'}`;
const DC_CAPACITY_DATASET_NAME = 'Network Optimization DC Capacity';

const REGISTRY_SCHEMA = {
  columns: [
    { name: 'datasetId', type: 'STRING' },
    { name: 'dataflowId', type: 'STRING' },
    { name: 'scenarioKey', type: 'STRING' },
    { name: 'scenarioLabel', type: 'STRING' },
    { name: 'regionDefault', type: 'STRING' },
    { name: 'enabled', type: 'STRING' },
    { name: 'sortOrder', type: 'LONG' },
  ],
};

const RAW_LANE_FIELD_ALIASES = {
  scenarioRunId: ['ScenarioRunID', 'scenarioRunId', 'scenario_id', 'Scenario Run ID', 'scenarioRunID'],
  zip3: ['3-zip', '3Zip', '3-Zip', 'Dest3Zip', 'dest3Zip', 'zip3'],
  distributionCost: ['3-zip x Channel Distribution Cost', 'distributionCost', 'distribution_cost'],
  totalUnits: [
    '3-zip x Channel line_id Count x Origin',
    'totalUnits',
    'TotalUnits',
    'totalcount',
    'TotalCount',
  ],
  tlSpend: ['3-zip x Channel TL Spend', '3-zip x Channel TL Spend ', 'tlSpend', 'LtlSpend'],
  workingCapacity: [
    'laneSpaceSqFt',
    '3-zip x Channel Containers x Origin', 
    'workingCapacity', 
    'working_capacity'
  ],
  breachFlag: ['breach_flag', 'breachFlag', 'BreachFlag'],
  channel: ['Channel', 'channel'],
  costingWarehouse: ['Costing Warehouse', 'CostingWarehouse', 'costingWarehouse'],
  costPerUnit: ['costPerUnit', 'CostPerUnit'],
  defaultShipFrom: ['Default Ship From', 'DefaultShipFrom', 'defaultShipFrom'],
  inboundSpend: ['Inbound Spend', 'InboundSpend', 'inboundSpend'],
  ltlSpend: ['LTL Spend x 3-zip x Channel', 'LTL Spend x 3-zip x Channel ', 'LtlSpend', 'ltlSpend'],
  orderToDeliverDays: ['Order to Deliver Calendar Days_Days', 'Order to Deliver Calendar Days', 'orderToDeliverDays'],
  parcelSpend: ['Parcel Spend', 'ParcelSpend', 'parcelSpend'],
  partyName: ['party_name', 'partyName', 'party name'],
  scenarioType: ['scenarioType', 'ScenarioType'],
  shipToDeliverDays: ['Ship to Deliver Calendar Days', 'ShipToDeliverCalendarDays', 'shipToDeliverDays'],
  deliveryDays: ['DeliveryDays', 'deliveryDays'],
  avgDeliveryDays: ['avgDeliveryDays', 'AverageDeliveryDays', 'averageDeliveryDays'],
  avgTransitDays: ['avgTransitDays', 'AverageTransitDays', 'averageTransitDays'],
  squareFootage: ['Square Footage', 'SquareFootage', 'squareFootage'],
  state: ['state', 'State'],
  terms: ['terms', 'Terms', 'freight_terms', 'freightTerms', 'freight terms'],
  threshold: ['threshold', 'Threshold'],
  totalCost: ['totalCost', 'TotalCost', '3-zip x Channel Scenario Cost', '3-zip x Channel Scenario Cost '],
} as const;

const NORMALIZED_LANE_FIELD_ALIASES = {
  scenarioRunId: ['ScenarioRunID', 'scenarioRunId'],
  dest3Zip: ['Dest3Zip', 'dest3Zip'],
  destState: ['DestState', 'destState'],
  channel: ['Channel', 'channel'],
  terms: ['Terms', 'terms', 'freight_terms', 'freightTerms', 'freight terms'],
  customerGroup: ['CustomerGroup', 'customerGroup'],
  assignedDc: ['AssignedDC', 'assignedDc'],
  rankedOption1Dc: ['RankedOption1DC', 'rankedOption1Dc'],
  rankedOption1Cost: ['RankedOption1Cost', 'rankedOption1Cost'],
  rankedOption1Days: ['RankedOption1Days', 'rankedOption1Days'],
  rankedOption2Dc: ['RankedOption2DC', 'rankedOption2Dc'],
  rankedOption2Cost: ['RankedOption2Cost', 'rankedOption2Cost'],
  rankedOption2Days: ['RankedOption2Days', 'rankedOption2Days'],
  rankedOption3Dc: ['RankedOption3DC', 'rankedOption3Dc'],
  rankedOption3Cost: ['RankedOption3Cost', 'rankedOption3Cost'],
  rankedOption3Days: ['RankedOption3Days', 'rankedOption3Days'],
  chosenRank: ['ChosenRank', 'chosenRank'],
  laneCost: ['LaneCost', 'laneCost', '3-zip x Channel Scenario Cost', '3-zip x Channel Scenario Cost '],
  costDeltaVsBest: ['CostDeltaVsBest', 'costDeltaVsBest'],
  deliveryDays: ['DeliveryDays', 'deliveryDays'],
  slaBreachFlag: ['SLABreachFlag', 'slaBreachFlag'],
  excludedBySlaFlag: ['ExcludedBySLAFlag', 'excludedBySlaFlag'],
  footprintContribution: ['FootprintContribution', 'footprintContribution'],
  utilImpactPct: ['UtilImpactPct', 'utilImpactPct'],
  overrideAppliedFlag: ['OverrideAppliedFlag', 'overrideAppliedFlag'],
  overrideVersion: ['OverrideVersion', 'overrideVersion'],
  notesFlag: ['NotesFlag', 'notesFlag'],
  scenarioType: ['ScenarioType', 'scenarioType'],
  runName: ['RunName', 'runName'],
  costingWarehouse: ['CostingWarehouse', 'Costing Warehouse', 'costingWarehouse'],
  defaultShipFrom: ['DefaultShipFrom', 'Default Ship From', 'defaultShipFrom'],
  inboundSpend: ['InboundSpend', 'Inbound Spend', 'inboundSpend'],
  parcelSpend: ['ParcelSpend', 'Parcel Spend', 'parcelSpend'],
  ltlSpend: ['LtlSpend', 'LTL Spend', 'ltlSpend'],
  totalCost: ['TotalCost', 'totalCost', '3-zip x Channel Scenario Cost', '3-zip x Channel Scenario Cost '],
  costRank: ['CostRank', 'costRank'],
  workingCapacity: ['WorkingCapacity', 'workingCapacity'],
  squareFootage: ['Square Footage', 'SquareFootage', 'squareFootage'],
  distributionCost: ['DistributionCost', 'distributionCost'],
  tlSpend: ['TlSpend', 'tlSpend'],
  breachFlag: ['BreachFlag', 'breachFlag'],
  orderToDeliverDays: ['OrderToDeliverCalendarDays', 'Order to Deliver Calendar Days_Days', 'orderToDeliverDays'],
  shipToDeliverDays: ['ShipToDeliverCalendarDays', 'Ship to Deliver Calendar Days', 'shipToDeliverDays'],
  avgDeliveryDays: ['AvgDeliveryDays', 'avgDeliveryDays', 'AverageDeliveryDays', 'averageDeliveryDays'],
  avgTransitDays: ['AvgTransitDays', 'avgTransitDays', 'AverageTransitDays', 'averageTransitDays'],
  state: ['State', 'state'],
  partyName: ['PartyName', 'party_name', 'partyName'],
  threshold: ['Threshold', 'threshold'],
  sourceDatasetId: ['SourceDatasetId', 'sourceDatasetId'],
  totalUnits: ['TotalUnits', 'totalUnits', 'TotalCount', 'totalCount', 'VolumeUnits', 'volumeUnits'],
} as const;

const LANE_NORMALIZED_SCHEMA = {
  columns: [
    { name: 'ScenarioRunID', type: 'STRING' },
    { name: 'Dest3Zip', type: 'STRING' },
    { name: 'DestState', type: 'STRING' },
    { name: 'Channel', type: 'STRING' },
    { name: 'Terms', type: 'STRING' },
    { name: 'CustomerGroup', type: 'STRING' },
    { name: 'AssignedDC', type: 'STRING' },
    { name: 'RankedOption1DC', type: 'STRING' },
    { name: 'RankedOption1Cost', type: 'DOUBLE' },
    { name: 'RankedOption1Days', type: 'DOUBLE' },
    { name: 'RankedOption2DC', type: 'STRING' },
    { name: 'RankedOption2Cost', type: 'DOUBLE' },
    { name: 'RankedOption2Days', type: 'DOUBLE' },
    { name: 'RankedOption3DC', type: 'STRING' },
    { name: 'RankedOption3Cost', type: 'DOUBLE' },
    { name: 'RankedOption3Days', type: 'DOUBLE' },
    { name: 'ChosenRank', type: 'LONG' },
    { name: 'LaneCost', type: 'DOUBLE' },
    { name: 'CostDeltaVsBest', type: 'DOUBLE' },
    { name: 'DeliveryDays', type: 'DOUBLE' },
    { name: 'AvgDeliveryDays', type: 'DOUBLE' },
    { name: 'AvgTransitDays', type: 'DOUBLE' },
    { name: 'SLABreachFlag', type: 'STRING' },
    { name: 'ExcludedBySLAFlag', type: 'STRING' },
    { name: 'FootprintContribution', type: 'DOUBLE' },
    { name: 'UtilImpactPct', type: 'DOUBLE' },
    { name: 'OverrideAppliedFlag', type: 'STRING' },
    { name: 'OverrideVersion', type: 'STRING' },
    { name: 'NotesFlag', type: 'STRING' },
    { name: 'ScenarioType', type: 'STRING' },
    { name: 'RunName', type: 'STRING' },
    { name: 'CostingWarehouse', type: 'STRING' },
    { name: 'DefaultShipFrom', type: 'STRING' },
    { name: 'InboundSpend', type: 'DOUBLE' },
    { name: 'ParcelSpend', type: 'DOUBLE' },
    { name: 'LtlSpend', type: 'DOUBLE' },
    { name: 'TotalCost', type: 'DOUBLE' },
    { name: 'CostRank', type: 'LONG' },
    { name: 'WorkingCapacity', type: 'DOUBLE' },
    { name: 'SquareFootage', type: 'DOUBLE' },
    { name: 'DistributionCost', type: 'DOUBLE' },
    { name: 'TlSpend', type: 'DOUBLE' },
    { name: 'BreachFlag', type: 'STRING' },
    { name: 'OrderToDeliverCalendarDays', type: 'DOUBLE' },
    { name: 'ShipToDeliverCalendarDays', type: 'DOUBLE' },
    { name: 'State', type: 'STRING' },
    { name: 'PartyName', type: 'STRING' },
    { name: 'Threshold', type: 'DOUBLE' },
    { name: 'SourceDatasetId', type: 'STRING' },
  ],
};

const DC_CAPACITY_SCHEMA = {
  columns: [
    { name: 'DCName', type: 'STRING' },
    { name: 'Sqft', type: 'DOUBLE' },
    { name: 'Region', type: 'STRING' },
    { name: 'Status', type: 'STRING' },
    { name: 'IsActive', type: 'STRING' },
  ],
};

const parseBoolean = (value: unknown): boolean => {
  const text = asText(value).toLowerCase();
  return text === 'true' || text === '1' || text === 'y' || text === 'yes' || text === 'on';
};

const readRegistryField = (row: ScenarioDatasetRegistryCsvRow, keys: string[]): string => {
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
      return String(direct).trim();
    }
    const normalized = key.trim().toLowerCase();
    const fallback = Object.entries(row).find(([rowKey]) => rowKey.trim().toLowerCase() === normalized);
    if (fallback && String(fallback[1]).trim() !== '') {
      return String(fallback[1]).trim();
    }
  }
  return '';
};

/**
 * Like readRegistryField but stops at the FIRST column key that EXISTS in the
 * row, returning its raw value even when it is empty/zero.  Returns null only
 * when NO key from the list is found in the row at all.
 *
 * Use this for fields where an explicitly-empty cell must be honoured as 0
 * rather than falling through to the next alias (e.g. laneSpaceSqFt = '' must
 * not cascade to '3-zip x Channel Containers x Origin').
 */
const readRegistryFieldRaw = (row: ScenarioDatasetRegistryCsvRow, keys: string[]): string | null => {
  const rowEntries = Object.entries(row);
  for (const key of keys) {
    const direct = row[key];
    if (direct !== undefined && direct !== null) return String(direct).trim();
    const normalized = key.trim().toLowerCase();
    const match = rowEntries.find(([rowKey]) => rowKey.trim().toLowerCase() === normalized);
    if (match !== undefined) return String(match[1]).trim();
  }
  return null; // column genuinely absent from this row
};
const hasRegistryField = (row: ScenarioDatasetRegistryCsvRow, keys: string[]): boolean => {
  const rowEntries = Object.entries(row);
  for (const key of keys) {
    if (row[key] !== undefined) return true;
    const normalized = key.trim().toLowerCase();
    const fallback = rowEntries.some(([rowKey]) => rowKey.trim().toLowerCase() === normalized);
    if (fallback) return true;
  }
  return false;
};

const REGISTRY_FIELD_ALIASES = {
  datasetId: ['datasetId', 'dataset_id', 'Dataset ID', 'DatasetId'],
  dataflowId: ['dataflowId', 'dataflow_id', 'Dataflow ID', 'DataflowId'],
  scenarioKey: ['scenarioKey', 'scenario_key', 'Scenario Key', 'ScenarioKey'],
  scenarioLabel: ['scenarioLabel', 'scenario_label', 'Scenario Label', 'ScenarioLabel', 'label'],
  regionDefault: ['regionDefault', 'region_default', 'Region Default', 'RegionDefault'],
  enabled: ['enabled', 'Enabled', 'isEnabled', 'IsEnabled'],
  sortOrder: ['sortOrder', 'sort_order', 'Sort Order', 'SortOrder', 'order'],
} as const;

const normalizeRegistryRow = (row: ScenarioDatasetRegistryCsvRow): ScenarioDatasetRegistryItem | null => {
  const datasetId = readRegistryField(row, REGISTRY_FIELD_ALIASES.datasetId);
  const scenarioKey = readRegistryField(row, REGISTRY_FIELD_ALIASES.scenarioKey);
  if (!datasetId || !scenarioKey) return null;

  const scenarioLabel = readRegistryField(row, REGISTRY_FIELD_ALIASES.scenarioLabel) || scenarioKey;
  const rawRegionDefault = readRegistryField(row, REGISTRY_FIELD_ALIASES.regionDefault) || 'Auto';
  const regionDefault = rawRegionDefault === 'US' || rawRegionDefault === 'Canada' ? rawRegionDefault : 'Auto';
  const enabled = parseBoolean(readRegistryField(row, REGISTRY_FIELD_ALIASES.enabled) || 'true');
  const dataflowId = readRegistryField(row, REGISTRY_FIELD_ALIASES.dataflowId);
  const sortOrderRaw = readRegistryField(row, REGISTRY_FIELD_ALIASES.sortOrder);
  const sortOrder = sortOrderRaw === '' ? undefined : Number(sortOrderRaw);

  return {
    datasetId,
    scenarioKey,
    scenarioLabel,
    regionDefault,
    enabled,
    ...(dataflowId ? { dataflowId } : {}),
    ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
  };
};

const normalizeLaneBreachFlag = (value: unknown): 'Y' | 'N' => {
  const text = asText(value).toLowerCase();
  if (!text) return 'N';
  if (parseBoolean(text)) return 'Y';
  if (text.includes('breach') && !text.includes('no breach') && !text.includes('non-breach')) return 'Y';
  return 'N';
};

const normalizeLaneTerms = (value: unknown): ScenarioRunResultsLane['Terms'] => {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 'NA';
  if (text.includes('collect') && text.includes('prepaid')) return 'Collect+Prepaid';
  if (text.includes('collect')) return 'Collect';
  if (text.includes('prepaid')) return 'Prepaid';
  return 'NA';
};

const normalizeScenarioRunIdKey = (value: string): string =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const resolveRawLaneScenarioRunId = (
  row: DomoLaneRow,
  scenarioRunIdLookup: Record<string, string> = {},
): string => {
  const scenarioType = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.scenarioType]);
  const partyName = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.partyName]);
  const freightTerms = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.terms]);
  const terms = normalizeLaneTerms(freightTerms);
  const termsKey = terms === 'NA' ? '' : terms;
  const state = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.state]);
  const candidates = [
    scenarioType,
    partyName,
    termsKey,
    state,
    [scenarioType, partyName].filter(Boolean).join('|'),
    [scenarioType, partyName, termsKey].filter(Boolean).join('|'),
    [scenarioType, partyName, termsKey, state].filter(Boolean).join('|'),
  ].map(normalizeScenarioRunIdKey).filter(Boolean);

  for (const candidate of candidates) {
    const lookupValue = scenarioRunIdLookup[candidate];
    if (lookupValue) return lookupValue;
  }

  if (scenarioType) {
    return scenarioRunIdLookup[normalizeScenarioRunIdKey(scenarioType)] || scenarioType;
  }

  return [partyName, termsKey, state].filter(Boolean).join('|') || 'UNKNOWN';
};

const normalizeRawLaneRow = (
  row: DomoLaneRow,
  scenarioRunIdLookup: Record<string, string> = {},
  sourceDatasetId?: string,
): ScenarioRunResultsLane | null => {
  const scenarioRunId = resolveRawLaneScenarioRunId(row, scenarioRunIdLookup);

  const dest3Zip = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.zip3]);
  const channel = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.channel]) || 'B2C';
  const partyName =
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.partyName]) ||
    'All';
  const state = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.state]);
  const costingWarehouse = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.costingWarehouse]);
  const defaultShipFrom = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.defaultShipFrom]);
  const freightTerms = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.terms]);
  const distributionCost = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.distributionCost]));
  const tlSpend = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.tlSpend]));
  const ltlSpend = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.ltlSpend]));
  // Use readRegistryFieldRaw so that an empty laneSpaceSqFt cell is honoured as 0
  // rather than falling through to the next alias ('3-zip x Channel Containers x Origin').
  const workingCapacityRaw = readRegistryFieldRaw(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.workingCapacity]);
  const hasWorkingCapacityColumn = workingCapacityRaw !== null;
  const workingCapacity = asNumber(workingCapacityRaw ?? '');
  const inboundSpend = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.inboundSpend]));
  const parcelSpend = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.parcelSpend]));
  const costPerUnit = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.costPerUnit]));
  const totalUnits = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.totalUnits]));
  const avgDeliveryDays = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.avgDeliveryDays]));
  const avgTransitDays = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.avgTransitDays]));
  const shipToDeliverDays = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.shipToDeliverDays]));
  const orderToDeliverDays = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.orderToDeliverDays]));
  const threshold = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.threshold]));
  const squareFootage = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.squareFootage]));
  const scenarioType = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.scenarioType]);
  const rawTotalCost = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.totalCost]));
  const breachFlag = normalizeLaneBreachFlag(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.breachFlag]));
  const assignedDc = costingWarehouse || defaultShipFrom || '';
  const laneCost = rawTotalCost > 0 ? rawTotalCost : Math.max(0, distributionCost + inboundSpend + parcelSpend + ltlSpend + tlSpend);
  const deliveryDays = avgDeliveryDays > 0
    ? avgDeliveryDays
    : avgTransitDays > 0
      ? avgTransitDays
      : shipToDeliverDays > 0
        ? shipToDeliverDays
        : orderToDeliverDays;
  const laneUnits = totalUnits > 0 ? totalUnits : 0;
  const footprintContribution = hasWorkingCapacityColumn
    ? workingCapacity
    : (threshold > 0 ? threshold : 0);
  const utilImpactPct = threshold > 0
    ? Number(((workingCapacity / threshold) * 100).toFixed(2))
    : 0;

  return {
    ScenarioRunID: scenarioRunId,
    Dest3Zip: dest3Zip,
    DestState: state,
    Channel: channel as ScenarioRunResultsLane['Channel'],
    Terms: normalizeLaneTerms(freightTerms),
    CustomerGroup: partyName,
    AssignedDC: assignedDc,
    RankedOption1DC: assignedDc,
    RankedOption1Cost: laneCost,
    RankedOption1Days: deliveryDays,
    RankedOption2DC: defaultShipFrom || assignedDc,
    RankedOption2Cost: distributionCost || laneCost,
    RankedOption2Days: orderToDeliverDays || deliveryDays,
    RankedOption3DC: defaultShipFrom || assignedDc || '',
    RankedOption3Cost: tlSpend || laneCost,
    RankedOption3Days: threshold || deliveryDays,
    ChosenRank: 0,
    LaneCost: laneCost,
    CostDeltaVsBest: 0,
    DeliveryDays: deliveryDays,
    AvgDeliveryDays: avgDeliveryDays > 0 ? avgDeliveryDays : undefined,
    AvgTransitDays: avgTransitDays > 0 ? avgTransitDays : undefined,
    SLABreachFlag: breachFlag,
    ExcludedBySLAFlag: breachFlag,
    FootprintContribution: footprintContribution,
    UtilImpactPct: utilImpactPct,
    OverrideAppliedFlag: 'N',
    OverrideVersion: null,
    NotesFlag: '',
    ScenarioType: scenarioType || undefined,
    RunName: scenarioType || undefined,
    CostingWarehouse: costingWarehouse || undefined,
    DefaultShipFrom: defaultShipFrom || undefined,
    InboundSpend: inboundSpend,
    ParcelSpend: parcelSpend,
    LtlSpend: ltlSpend,
    TotalCost: rawTotalCost || laneCost,
    CostRank: 0,
    CostPerUnit: costPerUnit > 0 ? costPerUnit : undefined,
    WorkingCapacity: hasWorkingCapacityColumn ? workingCapacity : (workingCapacity || undefined),
    DistributionCost: distributionCost || undefined,
    TlSpend: tlSpend,
    BreachFlag: breachFlag,
    OrderToDeliverCalendarDays: orderToDeliverDays || undefined,
    ShipToDeliverCalendarDays: shipToDeliverDays || undefined,
    FreightTerms: freightTerms || undefined,
    State: state || undefined,
    PartyName: partyName || undefined,
    Threshold: threshold || undefined,
    SquareFootage: squareFootage || undefined,
    TotalCount: laneUnits || undefined,
    TotalUnits: laneUnits || undefined,
    VolumeUnits: laneUnits || undefined,
    SourceDatasetId:
      String((row as any).SourceDatasetId || '').trim() ||
      String(sourceDatasetId || '').trim() ||
      RAW_LANE_DATASET_ENV_ID ||
      undefined,
  } as ScenarioRunResultsLane;
};

const normalizeNormalizedLaneRow = (row: DomoLaneRow): ScenarioRunResultsLane | null => {
  const normalized = normalizeRawLaneRow(row);
  if (!normalized) return null;

  const costRank = asNumber(
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.costRank]),
    normalized.CostRank || 0,
  );
  const costPerUnit = asNumber(
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.costPerUnit]),
    normalized.CostPerUnit || 0,
  );
  const laneCost = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.laneCost]), normalized.LaneCost);
  const deliveryDays = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.deliveryDays]), normalized.DeliveryDays);
  const avgDeliveryDays = asNumber(
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.avgDeliveryDays]),
    normalized.AvgDeliveryDays || 0,
  );
  const avgTransitDays = asNumber(
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.avgTransitDays]),
    normalized.AvgTransitDays || 0,
  );
  const freightTerms =
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.terms]) ||
    normalized.FreightTerms ||
    normalized.Terms;
  const totalUnits = asNumber(
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.totalUnits]),
    normalized.TotalUnits || normalized.TotalCount || normalized.VolumeUnits || 0,
  );
  const scenarioRunId = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.scenarioRunId]) || normalized.ScenarioRunID;
  const scenarioType = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.scenarioType]) || normalized.ScenarioType || '';
  const runName = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.runName]) || normalized.RunName || '';
  const squareFootage = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.squareFootage]), normalized.SquareFootage || 0);

  return {
    ...normalized,
    ScenarioRunID: scenarioRunId,
    Dest3Zip: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.dest3Zip]) || normalized.Dest3Zip,
    DestState: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.destState]) || normalized.DestState,
    Channel: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.channel]) || normalized.Channel,
    Terms: normalizeLaneTerms(freightTerms),
    FreightTerms: freightTerms || undefined,
    CustomerGroup: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.customerGroup]) || normalized.CustomerGroup,
    AssignedDC: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.assignedDc]) || normalized.AssignedDC,
    RankedOption1DC: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption1Dc]) || normalized.RankedOption1DC,
    RankedOption1Cost: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption1Cost]), normalized.RankedOption1Cost),
    RankedOption1Days: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption1Days]), normalized.RankedOption1Days),
    RankedOption2DC: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption2Dc]) || normalized.RankedOption2DC,
    RankedOption2Cost: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption2Cost]), normalized.RankedOption2Cost),
    RankedOption2Days: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption2Days]), normalized.RankedOption2Days),
    RankedOption3DC: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption3Dc]) || normalized.RankedOption3DC,
    RankedOption3Cost: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption3Cost]), normalized.RankedOption3Cost),
    RankedOption3Days: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption3Days]), normalized.RankedOption3Days),
    ChosenRank: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.chosenRank]), normalized.ChosenRank),
    LaneCost: laneCost,
    CostPerUnit: costPerUnit > 0 ? costPerUnit : normalized.CostPerUnit,
    CostDeltaVsBest: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.costDeltaVsBest]), normalized.CostDeltaVsBest),
    DeliveryDays: deliveryDays,
    AvgDeliveryDays: avgDeliveryDays > 0 ? avgDeliveryDays : normalized.AvgDeliveryDays,
    AvgTransitDays: avgTransitDays > 0 ? avgTransitDays : normalized.AvgTransitDays,
    SLABreachFlag: (() => {
      const raw = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.slaBreachFlag]);
      return raw ? normalizeLaneBreachFlag(raw) : normalized.SLABreachFlag;
    })(),
    ExcludedBySLAFlag: (() => {
      const raw = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.excludedBySlaFlag]);
      return raw ? normalizeLaneBreachFlag(raw) : normalized.ExcludedBySLAFlag;
    })(),
    FootprintContribution: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.footprintContribution]), normalized.FootprintContribution),
    UtilImpactPct: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.utilImpactPct]), normalized.UtilImpactPct),
    OverrideAppliedFlag: (readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.overrideAppliedFlag]) || normalized.OverrideAppliedFlag) as ScenarioRunResultsLane['OverrideAppliedFlag'],
    OverrideVersion: (() => {
      const text = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.overrideVersion]);
      return text || normalized.OverrideVersion || null;
    })(),
    NotesFlag: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.notesFlag]) || normalized.NotesFlag,
    ScenarioType: scenarioType || normalized.ScenarioType,
    RunName: runName || normalized.RunName,
    CostingWarehouse: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.costingWarehouse]) || normalized.CostingWarehouse,
    DefaultShipFrom: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.defaultShipFrom]) || normalized.DefaultShipFrom,
    InboundSpend: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.inboundSpend]), normalized.InboundSpend || 0),
    ParcelSpend: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.parcelSpend]), normalized.ParcelSpend || 0),
    LtlSpend: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.ltlSpend]), normalized.LtlSpend || 0),
    TotalCost: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.totalCost]), normalized.TotalCost || laneCost),
    CostRank: costRank,
    WorkingCapacity: (() => {
      const hasCol = hasRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.workingCapacity]);
      if (hasCol) {
        return asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.workingCapacity]));
      }
      return normalized.WorkingCapacity;
    })(),
    DistributionCost: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.distributionCost]), normalized.DistributionCost || 0) || undefined,
    TlSpend: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.tlSpend]), normalized.TlSpend || 0),
    BreachFlag: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.breachFlag]) || normalized.BreachFlag,
    OrderToDeliverCalendarDays: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.orderToDeliverDays]), normalized.OrderToDeliverCalendarDays || 0) || undefined,
    ShipToDeliverCalendarDays: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.shipToDeliverDays]), normalized.ShipToDeliverCalendarDays || 0) || undefined,
    State: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.state]) || normalized.State,
    PartyName: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.partyName]) || normalized.PartyName,
    Threshold: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.threshold]), normalized.Threshold || 0) || undefined,
    SquareFootage: squareFootage || undefined,
    TotalCount: totalUnits || normalized.TotalCount,
    TotalUnits: totalUnits || normalized.TotalUnits,
    VolumeUnits: totalUnits || normalized.VolumeUnits,
    SourceDatasetId: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.sourceDatasetId]) || normalized.SourceDatasetId,
  };
};

const laneGroupingKey = (row: ScenarioRunResultsLane): string =>
  [
    row.ScenarioRunID || '',
    row.Dest3Zip || '',
    row.Channel || '',
    row.Terms || '',
    row.DestState || '',
    row.PartyName || row.CustomerGroup || '',
    row.ScenarioType || '',
  ].join('|');

const laneCostPerUnit = (row: ScenarioRunResultsLane): number =>
  Number(((row.CostPerUnit ?? row.LaneCost ?? row.TotalCost ?? 0)).toFixed(2));

const laneTotalCost = (row: ScenarioRunResultsLane): number =>
  Number((row.TotalCost ?? row.LaneCost ?? row.RankedOption1Cost ?? 0).toFixed(2));

const laneOptionDc = (row: ScenarioRunResultsLane | null | undefined): string =>
  row?.AssignedDC || row?.CostingWarehouse || row?.DefaultShipFrom || '';

const resolveSpaceProfile = (row: DomoDcRow, datasetInfo?: ScenarioDatasetRegistryItem) => {
  const scenarioTypeValue = asText(getField(row, FIELD_ALIASES.scenarioType)).toLowerCase();
  const datasetScenarioLabel = String(datasetInfo?.scenarioLabel || '').toLowerCase();
  const isBaselineLike =
    scenarioTypeValue.includes('baseline') ||
    datasetScenarioLabel.includes('baseline');
  const isBcvLike =
    scenarioTypeValue.includes('bcv') ||
    scenarioTypeValue.includes('consolidation') ||
    datasetScenarioLabel.includes('bcv') ||
    datasetScenarioLabel.includes('consolidation');
  const isCoreOnly = !isBaselineLike && !isBcvLike;

  const squareFootage = asNumber(getField(row, FIELD_ALIASES.squareFootage));
  const workingCapacity = asNumber(getField(row, FIELD_ALIASES.workingCapacity));
  const rawCoreSpace = asNumberOptional(getField(row, FIELD_ALIASES.coreSpace));
  const explicitBcvSpace = asNumberOptional(getField(row, FIELD_ALIASES.bcvSpace));

  const actualSpace = squareFootage > 0 ? squareFootage : (rawCoreSpace ?? workingCapacity ?? 0);
  const spaceRequired = workingCapacity;
  const spaceCore = isCoreOnly
    ? (spaceRequired > 0 ? spaceRequired : 0)
    : (rawCoreSpace ?? spaceRequired ?? 0);
  const spaceBcv = isCoreOnly
    ? 0
    : (explicitBcvSpace ?? 0);

  return {
    isBaselineLike,
    isBcvLike,
    isCoreOnly,
    actualSpace,
    spaceRequired,
    spaceCore,
    spaceBcv,
  };
};

const rankLaneRows = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] => {
  const grouped = rows.reduce<Record<string, ScenarioRunResultsLane[]>>((acc, row) => {
    const key = laneGroupingKey(row) || row.ScenarioRunID || 'UNKNOWN';
    acc[key] = acc[key] || [];
    acc[key].push(row);
    return acc;
  }, {});

  return Object.entries(grouped)
    .flatMap(([, scenarioRows]) => {
      const sorted = [...scenarioRows].sort((a, b) => {
        const cpuA = laneCostPerUnit(a);
        const cpuB = laneCostPerUnit(b);
        const costDelta = cpuA - cpuB;
        if (costDelta !== 0) return costDelta;
        const totalCostDelta = laneTotalCost(a) - laneTotalCost(b);
        if (totalCostDelta !== 0) return totalCostDelta;
        const warehouseA = `${a.CostingWarehouse || a.AssignedDC || ''}|${a.DefaultShipFrom || ''}`;
        const warehouseB = `${b.CostingWarehouse || b.AssignedDC || ''}|${b.DefaultShipFrom || ''}`;
        const warehouseDelta = warehouseA.localeCompare(warehouseB);
        if (warehouseDelta !== 0) return warehouseDelta;
        const zipA = `${a.Dest3Zip}|${a.Channel}|${a.Terms}|${a.DestState}`;
        const zipB = `${b.Dest3Zip}|${b.Channel}|${b.Terms}|${b.DestState}`;
        return zipA.localeCompare(zipB);
      });
      const [best = null, second = null, third = null] = sorted;
      if (!best) return [];
      const bestCpu = laneCostPerUnit(best);
      const bestTotalCost = laneTotalCost(best);
      return [{
        ...best,
        CostRank: 1,
        ChosenRank: 1,
        AssignedDC: laneOptionDc(best),
        RankedOption1DC: laneOptionDc(best),
        RankedOption1Cost: bestCpu,
        RankedOption1Days: best.DeliveryDays || 0,
        RankedOption2DC: laneOptionDc(second),
        RankedOption2Cost: second ? laneCostPerUnit(second) : 0,
        RankedOption2Days: second?.DeliveryDays || 0,
        RankedOption3DC: laneOptionDc(third),
        RankedOption3Cost: third ? laneCostPerUnit(third) : 0,
        RankedOption3Days: third?.DeliveryDays || 0,
        LaneCost: bestTotalCost,
        TotalCost: bestTotalCost,
        CostPerUnit: best.CostPerUnit ?? bestCpu,
        CostDeltaVsBest: 0,
        FootprintContribution: best.WorkingCapacity || best.FootprintContribution || best.Threshold || 0,
        UtilImpactPct: best.UtilImpactPct || (
          best.Threshold && best.Threshold > 0 && best.WorkingCapacity !== undefined
            ? Number(((best.WorkingCapacity / best.Threshold) * 100).toFixed(2))
            : best.UtilImpactPct
        ),
      }];
    })
    .sort((a, b) => {
      const scenarioCompare = a.ScenarioRunID.localeCompare(b.ScenarioRunID);
      if (scenarioCompare !== 0) return scenarioCompare;
      const zipCompare = `${a.Dest3Zip}|${a.Channel}|${a.Terms}|${a.DestState}`.localeCompare(`${b.Dest3Zip}|${b.Channel}|${b.Terms}|${b.DestState}`);
      if (zipCompare !== 0) return zipCompare;
      return (a.CostRank || 0) - (b.CostRank || 0);
    });
};

const buildLaneNormalizedSeedRows = (rows: ScenarioRunResultsLane[]): Array<Record<string, unknown>> =>
  rows.map((row) => ({
    ScenarioRunID: row.ScenarioRunID,
    Dest3Zip: row.Dest3Zip,
    DestState: row.DestState,
    Channel: row.Channel,
    Terms: row.Terms,
    CustomerGroup: row.CustomerGroup,
    AssignedDC: row.AssignedDC,
    RankedOption1DC: row.RankedOption1DC,
    RankedOption1Cost: row.RankedOption1Cost,
    RankedOption1Days: row.RankedOption1Days,
    RankedOption2DC: row.RankedOption2DC,
    RankedOption2Cost: row.RankedOption2Cost,
    RankedOption2Days: row.RankedOption2Days,
    RankedOption3DC: row.RankedOption3DC,
    RankedOption3Cost: row.RankedOption3Cost,
    RankedOption3Days: row.RankedOption3Days,
    ChosenRank: row.ChosenRank,
    LaneCost: row.LaneCost,
    CostDeltaVsBest: row.CostDeltaVsBest,
    DeliveryDays: row.DeliveryDays,
    AvgDeliveryDays: row.AvgDeliveryDays ?? 0,
    AvgTransitDays: row.AvgTransitDays ?? 0,
    SLABreachFlag: row.SLABreachFlag,
    ExcludedBySLAFlag: row.ExcludedBySLAFlag,
    FootprintContribution: row.FootprintContribution,
    UtilImpactPct: row.UtilImpactPct,
    OverrideAppliedFlag: row.OverrideAppliedFlag,
    OverrideVersion: row.OverrideVersion,
    NotesFlag: row.NotesFlag,
    ScenarioType: row.ScenarioType || '',
    RunName: row.RunName || '',
    CostingWarehouse: row.CostingWarehouse || '',
    DefaultShipFrom: row.DefaultShipFrom || '',
    InboundSpend: row.InboundSpend ?? 0,
    ParcelSpend: row.ParcelSpend ?? 0,
    LtlSpend: row.LtlSpend ?? 0,
    TotalCost: row.TotalCost ?? row.LaneCost,
    CostRank: row.CostRank || 0,
    WorkingCapacity: row.WorkingCapacity ?? 0,
    DistributionCost: row.DistributionCost ?? 0,
    TlSpend: row.TlSpend ?? 0,
    BreachFlag: row.BreachFlag || row.SLABreachFlag || 'N',
    OrderToDeliverCalendarDays: row.OrderToDeliverCalendarDays ?? 0,
    ShipToDeliverCalendarDays: row.ShipToDeliverCalendarDays ?? 0,
    State: row.State || row.DestState || '',
    PartyName: row.PartyName || row.CustomerGroup || '',
    Threshold: row.Threshold ?? 0,
    SquareFootage: row.SquareFootage ?? 0,
    SourceDatasetId: row.SourceDatasetId || RAW_LANE_DATASET_ENV_ID || '',
  }));

const getStoredLaneNormalizedDatasetId = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem(LANE_BOOTSTRAP_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
};

const storeLaneNormalizedDatasetId = (datasetId: string) => {
  if (typeof window === 'undefined' || !datasetId) return;
  try {
    window.localStorage.setItem(LANE_BOOTSTRAP_STORAGE_KEY, datasetId);
  } catch {
    // ignore
  }
};

const findLaneNormalizedDatasetIdFromCatalog = async (): Promise<string> => {
  const datasets = await listDatasets();
  const match = datasets.find((dataset) => {
    const name = asText(dataset?.name).toLowerCase();
    const description = asText(dataset?.description).toLowerCase();
    return (
      name === LANE_BOOTSTRAP_DATASET_NAME.toLowerCase() ||
      name.includes('normalized lanes') ||
      description.includes('normalized lane')
    );
  });
  return asText(match?.id || match?.datasetId || match?.dataSetId);
};

const createLaneNormalizedDataset = async (): Promise<string> => {
  const token = await DatasetApi.fetchAccessToken();
  console.log('[Domo Lanes Normalized] bootstrap=create:start', {
    name: LANE_BOOTSTRAP_DATASET_NAME,
  });
  const created = await DatasetApi.createDataset({
    name: LANE_BOOTSTRAP_DATASET_NAME,
    description: LANE_BOOTSTRAP_DATASET_DESCRIPTION,
    rows: 0,
    schema: LANE_NORMALIZED_SCHEMA,
    token,
  });
  const datasetId = asText(created?.id || created?.datasetId || created?.dataSetId);
  if (!datasetId) {
    throw new Error('Lane normalized dataset was created but no dataset id was returned.');
  }
  console.log('[Domo Lanes Normalized] bootstrap=create:done', { datasetId });
  return datasetId;
};

const ensureLaneNormalizedDatasetId = async (): Promise<string> => {
  if (NORMALIZED_LANE_DATASET_ENV_ID) {
    console.log('[Domo Lanes Normalized] config=env', { datasetId: NORMALIZED_LANE_DATASET_ENV_ID });
    return NORMALIZED_LANE_DATASET_ENV_ID;
  }

  const cachedId = getStoredLaneNormalizedDatasetId();
  if (cachedId) {
    console.log('[Domo Lanes Normalized] config=localStorage', { datasetId: cachedId });
    return cachedId;
  }

  try {
    console.log('[Domo Lanes Normalized] bootstrap=lookup:start');
    const catalogId = await findLaneNormalizedDatasetIdFromCatalog();
    if (catalogId) {
      storeLaneNormalizedDatasetId(catalogId);
      console.log('[Domo Lanes Normalized] config=catalog', { datasetId: catalogId });
      return catalogId;
    }
  } catch (error) {
    console.warn('[Domo Lanes Normalized] Failed to inspect dataset catalog before bootstrap.', error);
  }

  const createdId = await createLaneNormalizedDataset();
  storeLaneNormalizedDatasetId(createdId);
  console.log('[Domo Lanes Normalized] created dataset id for env copy', createdId);
  console.log(`[Domo Lanes Normalized] VITE_SCENARIO_LANE_NORMALIZED_DATASET_ID=${createdId}`);
  return createdId;
};

const loadScenarioLaneDatasetFrom = async (
  datasetId: string,
  label: string,
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> => {
  if (!datasetId) {
    console.log(`[Domo Lanes ${label}] source=fallback (dataset id not set)`);
    return [];
  }

  try {
    const token = await DatasetApi.fetchAccessToken();
    console.log(`[Domo Lanes ${label}] config=env`, { datasetId });
    const rawCsv = await DatasetApi.getDatasetDataCsv(datasetId, token, 50000, 0);
    const rawRows = csvToObjects(rawCsv) as DomoLaneRow[];
    const rawRowsWithScenarioRunId = rawRows.filter((row) => Boolean(resolveRawLaneScenarioRunId(row, scenarioRunIdLookup)));
    const normalizedCandidateRows = rawRows
      .map((row) => normalizeRawLaneRow(row, scenarioRunIdLookup, datasetId))
      .filter((item): item is ScenarioRunResultsLane => Boolean(item));
    const normalizedFromRaw = rankLaneRows(
      normalizedCandidateRows,
    );
    const rankedOptionDiagnostics = normalizedFromRaw.reduce(
      (acc, row) => {
        if (row.RankedOption2Cost > 0) acc.withOption2 += 1;
        if (row.RankedOption3Cost > 0) acc.withOption3 += 1;
        if (Number(row.AvgTransitDays ?? 0) > 0) acc.withTransitDays += 1;
        if (row.SLABreachFlag === 'Y' || row.ExcludedBySLAFlag === 'Y') acc.withSlaBreach += 1;
        return acc;
      },
      { withOption2: 0, withOption3: 0, withTransitDays: 0, withSlaBreach: 0 },
    );
    const debugZip = label === 'Raw' ? '427' : '';
    const rawZipRows = rawRows.filter((row) => {
      const rawZip = String(
        readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.zip3]) ||
        '',
      ).trim();
      return rawZip === debugZip;
    });
    const normalizedZipRows = normalizedFromRaw.filter((row) => String(row.Dest3Zip || '').trim() === debugZip);
    console.log(`[Domo Lanes ${label}] source=dataset`, {
      datasetId,
      rows: rawRows.length,
      rowsWithScenarioRunId: rawRowsWithScenarioRunId.length,
      missingScenarioRunIdRows: Math.max(0, rawRows.length - rawRowsWithScenarioRunId.length),
      normalizedCandidateRows: normalizedCandidateRows.length,
      normalizedRows: normalizedFromRaw.length,
      rankedRowsWithOption2: rankedOptionDiagnostics.withOption2,
      rankedRowsWithOption3: rankedOptionDiagnostics.withOption3,
      rankedRowsWithTransitDays: rankedOptionDiagnostics.withTransitDays,
      rankedRowsWithSlaBreach: rankedOptionDiagnostics.withSlaBreach,
      rankedSample: normalizedFromRaw.slice(0, 3).map((row) => ({
        ScenarioRunID: row.ScenarioRunID,
        Dest3Zip: row.Dest3Zip,
        Channel: row.Channel,
        Terms: row.Terms,
        AvgTransitDays: row.AvgTransitDays ?? null,
        SLABreachFlag: row.SLABreachFlag,
        Option1: `${row.RankedOption1DC}:${row.RankedOption1Cost}`,
        Option2: `${row.RankedOption2DC}:${row.RankedOption2Cost}`,
        Option3: `${row.RankedOption3DC}:${row.RankedOption3Cost}`,
      })),
    });
    if (datasetId === CANADA_STRATFORD_LANE_DATASET_ENV_ID) {
      console.log(`[Domo Lanes ${label}] source=canada-stratford`, {
        datasetId,
        firstRowSourceDatasetId: normalizedFromRaw[0]?.SourceDatasetId || 'missing',
        sampleScenarioRunIds: Array.from(new Set(normalizedFromRaw.slice(0, 5).map((row) => row.ScenarioRunID || ''))),
      });
    }
    if (rawZipRows.length > 0 || normalizedZipRows.length > 0) {
      console.groupCollapsed(`[Domo Lanes Debug] zip=${debugZip}`);
      console.log('raw', rawZipRows);
      console.log('normalized', normalizedZipRows);
      console.groupEnd();
    }
    if (normalizedFromRaw.length === 0 && rawRows.length > 0) {
      console.warn(`[Domo Lanes ${label}] No rows could be normalized because ScenarioRunID could not be derived from the lane dataset.`);
      console.log(`[Domo Lanes ${label}] sample columns`, Object.keys(rawRows[0] || {}));
    }
    console.log(`[Domo Lanes ${label}] normalized=memory`, {
      rows: normalizedFromRaw.length,
    });
    return normalizedFromRaw;
  } catch (error) {
    console.warn(`[Domo Lanes ${label}] Failed to load lane dataset; using empty lane set.`, error);
    console.log(`[Domo Lanes ${label}] source=fallback (failed to load lane dataset)`, {
      datasetId,
    });
    return [];
  }
};

export const loadScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(RAW_LANE_DATASET_ENV_ID, 'Raw', scenarioRunIdLookup);

export const loadBcvScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(BCV_LANE_DATASET_ENV_ID, 'BCV', scenarioRunIdLookup);

export const loadTacticalConsolidationScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(TACTICAL_CONSOLIDATION_LANE_DATASET_ENV_ID, 'Tactical Consolidation', scenarioRunIdLookup);

export const loadCanadaScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(CANADA_BASELINE_LANE_DATASET_ENV_ID, 'Canada Baseline Lanes', scenarioRunIdLookup);

export const loadCanadaStratfordScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(CANADA_STRATFORD_LANE_DATASET_ENV_ID, 'Canada Stratford Lanes', scenarioRunIdLookup);

export const loadDcCapacityDataset = async (): Promise<DomoDcCapacityRow[]> => {
  if (!DC_CAPACITY_DATASET_ENV_ID) {
    console.log('[Domo DC Capacity] source=fallback (VITE_DC_CAPACITY_DATASET_ID not set)');
    return [];
  }

  try {
    const token = await DatasetApi.fetchAccessToken();
    console.log('[Domo DC Capacity] config=env', { datasetId: DC_CAPACITY_DATASET_ENV_ID });
    const rawCsv = await DatasetApi.getDatasetDataCsv(DC_CAPACITY_DATASET_ENV_ID, token, 5000, 0);
    const rows = csvToObjects(rawCsv) as DomoLaneRow[];
    const capacities = rows
      .map((row): DomoDcCapacityRow | null => {
        const dcName = readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['Ship From', 'ShipFrom', 'DC', 'DCName']);
        if (!dcName) return null;
        const sqft = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['sqft', 'SquareFootage', 'squareFootage']));
        const workingCapacitySqFt = asNumber(readRegistryField(
          row as ScenarioDatasetRegistryCsvRow,
          ['Working Capacity Sq Ft', 'WorkingCapacitySqFt', 'workingCapacitySqFt', 'Working Capacity', 'workingCapacity']
        ));
        const region = readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['region', 'Region']) || 'NA';
        const status = readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['status', 'Status']) || 'Active';
        return {
          DCName: dcName,
          Sqft: sqft,
          WorkingCapacitySqFt: workingCapacitySqFt > 0 ? workingCapacitySqFt : undefined,
          Region: region,
          Status: status,
          IsActive: status.trim().toLowerCase() === 'active',
        };
      })
      .filter((item): item is DomoDcCapacityRow => Boolean(item))
      .sort((a, b) => {
        const activeA = a.IsActive ? 0 : 1;
        const activeB = b.IsActive ? 0 : 1;
        if (activeA !== activeB) return activeA - activeB;
        if (a.Region !== b.Region) return a.Region.localeCompare(b.Region);
        return a.DCName.localeCompare(b.DCName);
      });

    console.log('[Domo DC Capacity] source=dataset', {
      datasetId: DC_CAPACITY_DATASET_ENV_ID,
      rows: capacities.length,
    });
    return capacities;
  } catch (error) {
    console.warn('[Domo DC Capacity] Failed to load DC capacity dataset; using empty capacity set.', error);
    console.log('[Domo DC Capacity] source=fallback (failed to load capacity dataset)', {
      datasetId: DC_CAPACITY_DATASET_ENV_ID,
    });
    return [];
  }
};

const buildRegistrySeedRows = (): Array<Record<string, unknown>> =>
  DEFAULT_SCENARIO_DATASET_REGISTRY.map((item, index) => ({
    datasetId: item.datasetId,
    dataflowId: item.dataflowId || '',
    scenarioKey: item.scenarioKey,
    scenarioLabel: item.scenarioLabel,
    regionDefault: item.regionDefault,
    enabled: item.enabled ? 'true' : 'false',
    sortOrder: index + 1,
  }));

const getStoredRegistryDatasetId = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem(REGISTRY_BOOTSTRAP_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
};

const storeRegistryDatasetId = (datasetId: string) => {
  if (typeof window === 'undefined' || !datasetId) return;
  try {
    window.localStorage.setItem(REGISTRY_BOOTSTRAP_STORAGE_KEY, datasetId);
  } catch {
    // Ignore storage failures; the console log is the primary handoff for the env id.
  }
};

const listDatasets = async (): Promise<any[]> => {
  const token = await DatasetApi.fetchAccessToken();
  const response = await DatasetApi.getDatasets(token);
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.datasets)) return response.datasets;
  return [];
};

const findRegistryDatasetIdFromCatalog = async (): Promise<string> => {
  const datasets = await listDatasets();
  const match = datasets.find((dataset) => {
    const name = asText(dataset?.name).toLowerCase();
    const description = asText(dataset?.description).toLowerCase();
    return (
      name === REGISTRY_BOOTSTRAP_DATASET_NAME.toLowerCase() ||
      name.includes('scenario registry') ||
      description.includes('scenario registry')
    );
  });
  return asText(match?.id || match?.datasetId || match?.dataSetId);
};

const createRegistryDataset = async (): Promise<string> => {
  const token = await DatasetApi.fetchAccessToken();
  console.log('[Domo Registry] bootstrap=create:start', {
    name: REGISTRY_BOOTSTRAP_DATASET_NAME,
    rows: DEFAULT_SCENARIO_DATASET_REGISTRY.length,
  });

  const created = await DatasetApi.createDataset({
    name: REGISTRY_BOOTSTRAP_DATASET_NAME,
    description: REGISTRY_BOOTSTRAP_DATASET_DESCRIPTION,
    rows: 0,
    schema: REGISTRY_SCHEMA,
    token,
  });
  const datasetId = asText(created?.id || created?.datasetId || created?.dataSetId);
  if (!datasetId) {
    throw new Error('Registry dataset was created but no dataset id was returned.');
  }

  const seedCsv = toCSV(buildRegistrySeedRows());
  console.log('[Domo Registry] bootstrap=seed:start', { datasetId, seedRows: DEFAULT_SCENARIO_DATASET_REGISTRY.length });
  await DatasetApi.uploadCsvData(datasetId, seedCsv, token);
  console.log('[Domo Registry] bootstrap', { datasetId, seeded: true });
  return datasetId;
};

const ensureRegistryDatasetId = async (): Promise<string> => {
  if (REGISTRY_DATASET_ENV_ID) {
    console.log('[Domo Registry] config=env', { datasetId: REGISTRY_DATASET_ENV_ID });
    return REGISTRY_DATASET_ENV_ID;
  }

  const cachedId = getStoredRegistryDatasetId();
  if (cachedId) {
    console.log('[Domo Registry] config=localStorage', { datasetId: cachedId });
    return cachedId;
  }

  try {
    console.log('[Domo Registry] bootstrap=lookup:start');
    const catalogId = await findRegistryDatasetIdFromCatalog();
    if (catalogId) {
      storeRegistryDatasetId(catalogId);
      console.log('[Domo Registry] config=catalog', { datasetId: catalogId });
      return catalogId;
    }
  } catch (error) {
    console.warn('[Domo Registry] Failed to inspect dataset catalog before bootstrap.', error);
  }

  try {
    const createdId = await createRegistryDataset();
    storeRegistryDatasetId(createdId);
    console.log('[Domo Registry] created dataset id for env copy', createdId);
    return createdId;
  } catch (error) {
    console.error('[Domo Registry] bootstrap=create:failed', error);
    throw error;
  }
};

export const loadScenarioDatasetRegistry = async (): Promise<ScenarioDatasetRegistryItem[]> => {
  try {
    const datasetId = await ensureRegistryDatasetId();
    const token = await DatasetApi.fetchAccessToken();
    const rawCsv = await DatasetApi.getDatasetDataCsv(datasetId, token, 5000, 0);
    const rows = csvToObjects(rawCsv) as ScenarioDatasetRegistryCsvRow[];
    const registry = rows
      .map(normalizeRegistryRow)
      .filter((item): item is ScenarioDatasetRegistryItem => Boolean(item))
      .sort((a, b) => {
        const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.scenarioKey.localeCompare(b.scenarioKey);
      });

    if (registry.length === 0) {
      console.warn('[Domo Registry] Registry dataset loaded but contained no valid rows; using fallback registry.');
      console.log('[Domo Registry] source=fallback (registry dataset returned 0 valid rows)');
      return [...DEFAULT_SCENARIO_DATASET_REGISTRY];
    }

    console.log('[Domo Registry] source=dataset', {
      datasetId,
      rows: registry.length,
    });
    return registry;
  } catch (error) {
    console.warn('[Domo Registry] Failed to load registry dataset; using fallback registry.', error);
    console.log('[Domo Registry] source=fallback (failed to load registry dataset)', {
      datasetId: REGISTRY_DATASET_ENV_ID || getStoredRegistryDatasetId() || 'unknown',
    });
    return [...DEFAULT_SCENARIO_DATASET_REGISTRY];
  }
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
  breachFlag: ['breach_flag', 'breachFlag', 'BreachFlag', 'SLABreachFlag'],
  maxUtilizationPct: ['maxUtilization%', 'maxUtilization %', 'maxUtilization'],
  palletUtilizationPct: ['Pallet Pos Util %', 'Pallet Pos Util % '],
  squareFootage: ['sqft', 'Square Footage', 'SquareFootage', 'Square Footage ', 'coreSpace'],
  workingCapacity: ['spaceRequired', 'Working Capacity Sq Ft', 'WorkingCapacitySqFt', 'Working Capacity Sq Ft ', 'sqft'],
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

export const normalizeRegion = (regionRaw: string, defaultRegion: ScenarioDatasetRegistryItem['regionDefault']): 'US' | 'Canada' => {
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
  const registry = await loadScenarioDatasetRegistry();
  const enabledDatasets = registry.filter((item) => item.enabled);
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
  const mappedRows = [...rows]
    .sort((a, b) => {
      const costA = asAbsNumber(getField(a, FIELD_ALIASES.totalCost));
      const costB = asAbsNumber(getField(b, FIELD_ALIASES.totalCost));
      const unitsA = asNumber(getField(a, FIELD_ALIASES.totalUnits));
      const unitsB = asNumber(getField(b, FIELD_ALIASES.totalUnits));
      const suppressedA = costA <= 0 && unitsA <= 0;
      const suppressedB = costB <= 0 && unitsB <= 0;
      if (suppressedA !== suppressedB) return suppressedA ? 1 : -1;
      if (costA !== costB) return costA - costB;
      const nameA = asText(getField(a, FIELD_ALIASES.dc));
      const nameB = asText(getField(b, FIELD_ALIASES.dc));
      return nameA.localeCompare(nameB);
    })
    .map((row, idx) => {
      const avgTransitDays = asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays));
      const slaBreachPct = asNumberOptional(getField(row, FIELD_ALIASES.slaBreachPct));
      const spaceProfile = resolveSpaceProfile(row, _datasetInfo);
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
          AvgTransitDays: avgTransitDays ?? null,
          SLABreachPct: slaBreachPct ?? null,
          UtilPct: Number((maxUtil || asPercent(getField(row, FIELD_ALIASES.palletUtilizationPct))).toFixed(2)),
          SpaceRequired: Number(spaceProfile.spaceRequired.toFixed(2)),
          SpaceCore: Number(spaceProfile.spaceCore.toFixed(2)),
          ActualSpace: Number(spaceProfile.actualSpace.toFixed(2)),
          SpaceBCV: Number(spaceProfile.spaceBcv.toFixed(2)),
          SLABreachCount: asNumber(getField(row, FIELD_ALIASES.slaBreachCount)),
          ExcludedBySLACount: Math.max(0, Math.round(spaceProfile.actualSpace - spaceProfile.spaceRequired)),
          RankOverall: idx + 1,
          IsSuppressed: (asAbsNumber(getField(row, FIELD_ALIASES.totalCost)) <= 0 && asNumber(getField(row, FIELD_ALIASES.totalUnits)) <= 0)
            ? 'Y'
            : 'N',
        } as ScenarioRunResultsDC;
      });

  const shouldTraceDc = String(import.meta.env.VITE_ENABLE_DATA_TRACE ?? 'true').toLowerCase() !== 'false';
  if (shouldTraceDc) {
    const firstRow = rows[0] || {};
    const rawDcPreview = rows.slice(0, 6).map((row, index) => ({
      '#': index + 1,
      DC: asText(getField(row, FIELD_ALIASES.dc)),
      totalCost: getField(row, FIELD_ALIASES.totalCost),
      totalUnits: getField(row, FIELD_ALIASES.totalUnits),
      spaceRequired: getField(row, FIELD_ALIASES.workingCapacity),
      sqft: getField(row, FIELD_ALIASES.squareFootage),
      coreSpace: getField(row, FIELD_ALIASES.coreSpace),
      bcvSpace: getField(row, FIELD_ALIASES.bcvSpace),
      avgDeliveryDays: getField(row, FIELD_ALIASES.avgDeliveryDays),
      avgTransitDays: getField(row, FIELD_ALIASES.avgTransitDays),
      slaBreach: getField(row, FIELD_ALIASES.slaBreachCount),
    }));
    const mappedPreview = mappedRows.slice(0, 6).map((row, index) => ({
      '#': index + 1,
      DCName: row.DCName,
      TotalCost: row.TotalCost,
      VolumeUnits: row.VolumeUnits,
      AvgDays: row.AvgDays,
      AvgTransitDays: row.AvgTransitDays ?? 'NA',
      SLABreachPct: row.SLABreachPct ?? 'NA',
      UtilPct: row.UtilPct,
      ActualSpace: row.ActualSpace,
      SpaceRequired: row.SpaceRequired,
      SpaceCore: row.SpaceCore,
      SpaceBCV: row.SpaceBCV,
      SLABreachCount: row.SLABreachCount,
      IsSuppressed: row.IsSuppressed,
    }));
    console.groupCollapsed(`[DC Scorecard Source] mapped from Domo rows: ${scenarioRunId}`);
    console.log('source', {
      scenarioRunId,
      datasetId: _datasetInfo?.datasetId || 'registry item has no datasetId field',
      dataflowId: _datasetInfo?.dataflowId || 'missing',
      scenarioKey: _datasetInfo?.scenarioKey || 'missing',
      scenarioLabel: _datasetInfo?.scenarioLabel || 'missing',
      regionDefault: _datasetInfo?.regionDefault || 'missing',
      rawRows: rows.length,
      mappedDcRows: mappedRows.length,
      firstRowColumns: Object.keys(firstRow),
    });
    console.table(rawDcPreview);
    console.table(mappedPreview);
    console.groupEnd();
  }

  return mappedRows;
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

  let slaBreachUnits = 0;
  let slaTotalUnits = 0;
  rows.forEach((row) => {
    const units = asNumber(getField(row, FIELD_ALIASES.totalUnits)) || asNumber(getField(row, FIELD_ALIASES.totalOrderCount)) || 1;
    const rawSlaPct = asNumberOptional(getField(row, FIELD_ALIASES.slaBreachPct));
    const breachCount = asNumberOptional(getField(row, FIELD_ALIASES.slaBreachCount));
    const isBreach = normalizeLaneBreachFlag(getField(row, FIELD_ALIASES.breachFlag)) === 'Y';
    if (rawSlaPct !== null && units > 0) {
      slaBreachUnits += (rawSlaPct / 100) * units;
    } else if (breachCount !== null) {
      slaBreachUnits += breachCount;
    } else if (isBreach) {
      slaBreachUnits += units;
    }
    slaTotalUnits += units;
  });
  const slaBreachPct = slaTotalUnits > 0 ? (slaBreachUnits / slaTotalUnits) * 100 : 0;
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

  const totalSquareFootage = Math.round(rows.reduce((sum, row) => {
    const spaceProfile = resolveSpaceProfile(row, datasetInfo);
    return sum + spaceProfile.actualSpace;
  }, 0));
  const totalWorkingCapacity = Math.round(rows.reduce(
    (sum, row) => sum + asNumber(getField(row, FIELD_ALIASES.workingCapacity)),
    0
  ));
  const excludedBySla = Math.max(0, totalSquareFootage - totalWorkingCapacity);

  const totalCoreSpace = rows.reduce((sum, row) => {
    const spaceProfile = resolveSpaceProfile(row, datasetInfo);
    return sum + spaceProfile.spaceCore;
  }, 0);
  const totalBcvSpace = rows.reduce((sum, row) => {
    const spaceProfile = resolveSpaceProfile(row, datasetInfo);
    return sum + spaceProfile.spaceBcv;
  }, 0);

  const weightedCostPerUnit = totalUnits > 0
    ? rows.reduce((sum, row) => {
        const units = asNumber(getField(row, FIELD_ALIASES.totalUnits));
        const cpu = asAbsNumber(getField(row, FIELD_ALIASES.costPerUnit));
        return sum + cpu * units;
      }, 0) / totalUnits
    : 0;

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
    ExcludedBySLACount: slaBreachUnits,
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
  const dcRows = rows.filter((row) => {
    const dcName = asText(getField(row, FIELD_ALIASES.dc));
    return dcName !== '';
  });
  const totalRows = dcRows.length || 1;
  const missingAvgDays = dcRows.filter((row) =>
    asNumberOptional(getField(row, FIELD_ALIASES.avgDeliveryDays)) === null &&
    asNumberOptional(getField(row, FIELD_ALIASES.avgTransitDays)) === null
  ).length;
  const missingSlaPct = dcRows.filter((row) =>
    asNumberOptional(getField(row, FIELD_ALIASES.slaBreachPct)) === null &&
    asNumberOptional(getField(row, FIELD_ALIASES.slaBreachCount)) === null &&
    getField(row, FIELD_ALIASES.breachFlag) === undefined
  ).length;
  const missingCapacity = dcRows.filter((row) => {
    const capacity = asNumberOptional(getField(row, FIELD_ALIASES.workingCapacity));
    return capacity === null || capacity === 0;
  }).length;
  const missingSquare = dcRows.filter((row) => {
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
