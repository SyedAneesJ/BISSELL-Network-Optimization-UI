import DatasetApi from './datasetApi';
import { csvToObjects, toCSV } from '@/utils';
import {
  ScenarioRunResultsLane,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  DataHealthSnapshot,
  DomoCostComponentRow,
  DomoSpaceOverrideRow,
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
const US_BASELINE_NEW_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_LANE_US_BASELINE_NEW_ID || '').trim();
const CANADA_BASELINE_NEW_LANE_DATASET_ENV_ID = String(import.meta.env.VITE_SCENARIO_LANE_CANADA_BASELINE_NEW_ID || import.meta.env.VITE_SCENARIO_LANE_US_BASELINE_NEW_ID || '').trim();
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
  zip3: ['3-zip', '3Zip', '3-Zip', 'Dest3Zip', 'dest3Zip', 'zip3', 'Destination_3Zip', 'Destination 3Zip', 'Dest 3Zip'],
  distributionCost: ['3-zip x Channel Distribution Cost', 'distributionCost', 'distribution_cost', '3zip_Distribution Spend', '3zip Distribution Spend', '3zip_Distribution_Spend'],
  totalUnits: [
    '3-zip x Channel line_id Count x Origin',
    'totalUnits',
    'TotalUnits',
    'totalcount',
    'TotalCount',
    '3zip_des_cases_received',
    '3zip_des_cases_received (col,pp)',
    '3zip_des_ordvrs_cnt',
    '3zip des cases received',
  ],
  tlSpend: ['3-zip x Channel TL Spend', '3-zip x Channel TL Spend ', 'tlSpend', 'LtlSpend', '3zip_tl_spend', '3zip TL Spend', '3zip_TL_Spend'],
  workingCapacity: [
    'Lane_Space',
    'Lane Space',
    'lane_space',
    'laneSpace',
    'laneSpaceSqFt',
    '3-zip x Channel Containers x Origin', 
    'workingCapacity', 
    'working_capacity'
  ],
  breachFlag: ['breach_flag', 'breachFlag', 'BreachFlag'],
  channel: ['Channel', 'channel'],
  costingWarehouse: ['Costing Warehouse', 'CostingWarehouse', 'costingWarehouse', 'Costing_Warehouse', 'Default Warehouse', 'DefaultWarehouse', 'Default_Warehouse', 'Default Warehouse ', 'Default', 'default', 'Warehouse', 'warehouse', 'Origin', 'origin', 'DC', 'dc'],
  costPerUnit: ['costPerUnit', 'CostPerUnit', 'Cost Per CWT', 'CostPerCWT', 'cost_per_cwt', 'Cost per CWT', 'costPerCWT', 'Cost/Unit', 'cost_per_unit'],
  defaultShipFrom: ['Default Ship From', 'DefaultShipFrom', 'defaultShipFrom', 'Default Warehouse', 'DefaultWarehouse', 'Default_Warehouse', 'Default Warehouse ', 'Default Warehouse', 'Default_Warehouse ', 'Default', 'default', 'Warehouse', 'warehouse', 'Origin', 'origin', 'DC', 'dc'],
  inboundSpend: ['Inbound Spend', 'InboundSpend', 'inboundSpend', '3zip_Inbound Spend', '3zip Inbound Spend', '3zip_Inbound_Spend'],
  ltlSpend: ['LTL Spend x 3-zip x Channel', 'LTL Spend x 3-zip x Channel ', 'LtlSpend', 'ltlSpend', '3zip_LTL_Spend', '3zip LTL Spend', '3zip_LTL Spend'],
  orderToDeliverDays: ['Order to Deliver Calendar Days_Days', 'Order to Deliver Calendar Days', 'orderToDeliverDays'],
  parcelSpend: ['Parcel Spend', 'ParcelSpend', 'parcelSpend', '3zip_Parcel Spend', '3zip Parcel Spend', '3zip_Parcel_Spend'],
  partyName: ['party_name', 'partyName', 'party name'],
  scenarioType: ['scenarioType', 'ScenarioType'],
  shipToDeliverDays: ['Ship to Deliver Calendar Days', 'ShipToDeliverCalendarDays', 'shipToDeliverDays'],
  deliveryDays: ['servicedays_us&can_combnd', 'servicedays_us&can_combined', 'servicedays_us_can_combined', 'servicedays_us_and_can_combined', 'Service Days', 'Service_Days', 'DeliveryDays', 'deliveryDays', 'servicedays', 'service_days'],
  avgDeliveryDays: ['avg_delivery_days', 'avgDeliveryDays', 'AverageDeliveryDays', 'averageDeliveryDays', 'avg_delivery_days '],
  avgTransitDays: ['avg_transit_days', 'avgTransitDays', 'AverageTransitDays', 'averageTransitDays', 'avg_transit_days '],
  squareFootage: ['total_dc_sqft', 'total dc sqft', 'Square Footage', 'SquareFootage', 'squareFootage'],
  state: ['state', 'State'],
  terms: ['freight_terms', 'freight_terms ', 'freightterms', 'terms', 'Terms', 'freightTerms', 'freight terms'],
  entityScope: ['entityScope', 'EntityScope', 'entity', 'Entity', 'dcEntity', 'DC_entity'],
  threshold: ['threshold', 'Threshold'],
  totalCost: ['totalCost', 'TotalCost', '3-zip x Channel Scenario Cost', '3-zip x Channel Scenario Cost ', '3zip_scenario cost', '3zip Scenario Cost', '3zip_scenario_cost'],
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
  rankedOption4Dc: ['RankedOption4DC', 'rankedOption4Dc', 'Option4DC', 'Option 4 DC'],
  rankedOption4Cost: ['RankedOption4Cost', 'rankedOption4Cost', 'Option4Cost', 'Option 4 Cost'],
  rankedOption4Days: ['RankedOption4Days', 'rankedOption4Days', 'Option4Days', 'Option 4 Days'],
  chosenRank: ['ChosenRank', 'chosenRank'],
  laneCost: ['LaneCost', 'laneCost', '3-zip x Channel Scenario Cost', '3-zip x Channel Scenario Cost '],
  costDeltaVsBest: ['CostDeltaVsBest', 'costDeltaVsBest'],
  deliveryDays: ['DeliveryDays', 'deliveryDays', 'servicedays_us&can_combnd', 'servicedays_us&can_combined', 'servicedays_us_can_combined'],
  slaBreachFlag: ['SLABreachFlag', 'slaBreachFlag'],
  excludedBySlaFlag: ['ExcludedBySLAFlag', 'excludedBySlaFlag'],
  footprintContribution: ['FootprintContribution', 'footprintContribution', 'Lane_Space', 'Lane Space', 'lane_space', 'laneSpace'],
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
  workingCapacity: ['WorkingCapacity', 'workingCapacity', 'Lane_Space', 'Lane Space', 'lane_space', 'laneSpace'],
  squareFootage: ['total_dc_sqft', 'total dc sqft', 'Square Footage', 'SquareFootage', 'squareFootage'],
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
  entityScope: ['EntityScope', 'entityScope', 'Entity', 'entity', 'dcEntity', 'DC_entity'],
  costPerUnit: ['CostPerUnit', 'costPerUnit', 'Cost Per CWT', 'CostPerCWT', 'cost_per_cwt', 'Cost per CWT', 'costPerCWT', 'Cost/Unit', 'cost_per_unit'],
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
    { name: 'EntityScope', type: 'STRING' },
    { name: 'Entity', type: 'STRING' },
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

const asText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const asNumberOptional = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').replace(/%/g, '').trim();
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
};

const asNumber = (value: unknown, fallback = 0): number => {
  const result = asNumberOptional(value);
  return result !== null ? result : fallback;
};

const detectRegionFromText = (text: string): 'US' | 'Canada' | undefined => {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  if (lower.includes('canada') || lower.includes('canadian') || lower.includes('ca baseline') || lower.includes('ca stratford') || lower.includes('_ca')) {
    return 'Canada';
  }
  if (lower.includes('us baseline') || lower.includes('us ') || lower.includes('usa') || lower.includes('united states') || lower.includes('_us')) {
    return 'US';
  }
  return undefined;
};

const parseBoolean = (value: unknown): boolean => {
  const text = asText(value).toLowerCase();
  return text === 'true' || text === '1' || text === 'y' || text === 'yes' || text === 'on';
};

const getNormalizedRowField = (row: Record<string, any>, key: string): string | undefined => {
  const direct = row[key];
  if (direct !== undefined && direct !== null) return String(direct).trim();

  let normMap = (row as any).__normMap;
  if (!normMap) {
    normMap = new Map<string, string>();
    for (const k in row) {
      if (k !== '__normMap' && k !== '__superNormMap') {
        normMap.set(k.trim().toLowerCase(), k);
      }
    }
    Object.defineProperty(row, '__normMap', { value: normMap, enumerable: false, writable: false });
  }

  const matchKey = normMap.get(key.trim().toLowerCase());
  if (matchKey !== undefined) {
    const val = row[matchKey];
    if (val !== undefined && val !== null) return String(val).trim();
  }
  return undefined;
};

const readRegistryField = (row: ScenarioDatasetRegistryCsvRow, keys: string[]): string => {
  for (const key of keys) {
    const val = getNormalizedRowField(row as any, key);
    if (val !== undefined && val !== '') {
      return val;
    }
  }
  return '';
};

const readRegistryFieldRaw = (row: ScenarioDatasetRegistryCsvRow, keys: string[]): string | null => {
  for (const key of keys) {
    const val = getNormalizedRowField(row as any, key);
    if (val !== undefined) {
      return val;
    }
  }
  return null;
};

const hasRegistryField = (row: ScenarioDatasetRegistryCsvRow, keys: string[]): boolean => {
  for (const key of keys) {
    const val = getNormalizedRowField(row as any, key);
    if (val !== undefined) return true;
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
  let scenarioRunId = resolveRawLaneScenarioRunId(row, scenarioRunIdLookup);
  if (sourceDatasetId && sourceDatasetId === US_BASELINE_NEW_LANE_DATASET_ENV_ID) {
    if (!scenarioRunId || scenarioRunId === 'UNKNOWN') {
      scenarioRunId = scenarioRunIdLookup['us baseline'] || scenarioRunIdLookup['baseline'] || 'SR001';
    }
  }

  const dest3Zip = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.zip3]);
  const channel = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.channel]) || 'B2C';
  const partyName =
    readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.partyName]) ||
    'All';
  const state = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.state]);
  const entityScope = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.entityScope]);
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
  const costPerCwt = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['Cost Per CWT', 'CostPerCWT', 'cost_per_cwt', 'Cost per CWT', 'costPerCWT']));
  let rawCostPerUnit = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.costPerUnit]));
  const totalUnits = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.totalUnits]));

  // If Cost Per CWT column is present in raw data, use it directly as costPerUnit.
  // Otherwise if costPerUnit was populated with total distribution spend, derive per-unit rate = distributionCost / totalUnits.
  let costPerUnit = costPerCwt > 0 ? costPerCwt : rawCostPerUnit;
  if (costPerCwt === 0 && distributionCost > 0 && totalUnits > 0 && (Math.abs(rawCostPerUnit - distributionCost) < 0.05 || rawCostPerUnit > 30)) {
    costPerUnit = Number((distributionCost / totalUnits).toFixed(4));
  }

  const rawDeliveryDays = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...RAW_LANE_FIELD_ALIASES.deliveryDays]));
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
  const deliveryDays = rawDeliveryDays > 0
    ? rawDeliveryDays
    : avgDeliveryDays > 0
      ? avgDeliveryDays
      : avgTransitDays > 0
        ? avgTransitDays
        : shipToDeliverDays > 0
          ? shipToDeliverDays
          : orderToDeliverDays;

  if (dest3Zip === '006' || dest3Zip === '007' || ((globalThis as any).__loggedServiceDaysCount || 0) < 5) {
    (globalThis as any).__loggedServiceDaysCount = ((globalThis as any).__loggedServiceDaysCount || 0) + 1;
    console.log('[ServiceDays Diagnostic]', {
      dest3Zip,
      costingWarehouse,
      rawDeliveryDays,
      avgDeliveryDays,
      finalDeliveryDays: deliveryDays,
      matchedRowKeys: Object.keys(row).filter((k) => {
        const lower = k.toLowerCase();
        return lower.includes('service') || lower.includes('day') || lower.includes('transit');
      }),
      rawRowSample: Object.fromEntries(
        Object.entries(row).filter(([k]) => {
          const lower = k.toLowerCase();
          return lower.includes('service') || lower.includes('day') || lower.includes('transit');
        })
      ),
    });
  }
  const laneUnits = totalUnits > 0 ? totalUnits : 0;
  const footprintContribution = [workingCapacity, threshold, squareFootage]
    .find((value) => Number.isFinite(value) && value > 0) ?? 0;
  const utilImpactPct = threshold > 0
    ? Number(((workingCapacity / threshold) * 100).toFixed(2))
    : 0;

  const cheapestToServeFrom = readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['cheapest to serve from', 'cheapest_to_serve_from', 'cheapestToServeFrom']);
  const cheapestCostToServe = asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, ['cheapest cost to serve', 'cheapest_cost_to_serve', 'cheapestCostToServe']));

  return {
    ScenarioRunID: scenarioRunId,
    Dest3Zip: dest3Zip,
    DestState: state,
    Channel: channel as ScenarioRunResultsLane['Channel'],
    Terms: normalizeLaneTerms(freightTerms),
    CustomerGroup: partyName,
    AssignedDC: defaultShipFrom || costingWarehouse || '',
    RankedOption1DC: costingWarehouse || defaultShipFrom || '',
    RankedOption1Cost: laneCost,
    RankedOption1Days: deliveryDays,
    RankedOption2DC: '',
    RankedOption2Cost: 0,
    RankedOption2Days: 0,
    RankedOption3DC: '',
    RankedOption3Cost: 0,
    RankedOption3Days: 0,
    RankedOption4DC: '',
    RankedOption4Cost: 0,
    RankedOption4Days: 0,
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
    EntityScope: entityScope || undefined,
    Entity: entityScope || undefined,
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
  const entityScope = readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.entityScope]) || normalized.EntityScope || normalized.Entity || '';
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
    RankedOption4DC: readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption4Dc]) || normalized.RankedOption4DC,
    RankedOption4Cost: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption4Cost]), normalized.RankedOption4Cost || 0),
    RankedOption4Days: asNumber(readRegistryField(row as ScenarioDatasetRegistryCsvRow, [...NORMALIZED_LANE_FIELD_ALIASES.rankedOption4Days]), normalized.RankedOption4Days || 0),
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
    EntityScope: entityScope || undefined,
    Entity: entityScope || undefined,
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

export const enrichRankedOptionsForLanes = (
  lanes: ScenarioRunResultsLane[],
  candidateSourcePool?: ScenarioRunResultsLane[]
): ScenarioRunResultsLane[] => {
  if (!lanes || lanes.length === 0) return [];
  
  const pool = (candidateSourcePool && candidateSourcePool.length > 0) ? candidateSourcePool : lanes;

  const poolByZipChannel = new Map<string, ScenarioRunResultsLane[]>();
  const poolByZip = new Map<string, ScenarioRunResultsLane[]>();

  pool.forEach((lane) => {
    const zip = (lane.Dest3Zip || '').trim();
    if (!zip) return;
    const zipChannelKey = `${zip}|${(lane.Channel || '').trim()}`;

    const listZC = poolByZipChannel.get(zipChannelKey) || [];
    listZC.push(lane);
    poolByZipChannel.set(zipChannelKey, listZC);

    const listZ = poolByZip.get(zip) || [];
    listZ.push(lane);
    poolByZip.set(zip, listZ);
  });

  const candidatesCache = new Map<string, { dc: string; cost: number; days: number }[]>();

  const getCandidatesForKey = (key: string, rows: ScenarioRunResultsLane[]): { dc: string; cost: number; days: number }[] => {
    if (candidatesCache.has(key)) return candidatesCache.get(key)!;

    const sortedRows = [...rows].sort((a, b) => {
      const costA = Number(a.TotalCost ?? a.LaneCost ?? 0);
      const costB = Number(b.TotalCost ?? b.LaneCost ?? 0);
      if (costA !== costB && costA > 0 && costB > 0) return costA - costB;
      const cpuA = Number(a.CostPerUnit ?? 0);
      const cpuB = Number(b.CostPerUnit ?? 0);
      return cpuA - cpuB;
    });

    const seenDcs = new Set<string>();
    const candidates: { dc: string; cost: number; days: number }[] = [];

    sortedRows.forEach((row) => {
      const dcName = String(row.CostingWarehouse || row.AssignedDC || row.DefaultShipFrom || '').trim();
      if (!dcName || dcName.toLowerCase() === 'na' || seenDcs.has(dcName.toLowerCase())) return;
      seenDcs.add(dcName.toLowerCase());
      candidates.push({
        dc: dcName,
        cost: Number(row.TotalCost ?? row.LaneCost ?? 0),
        days: Number(row.DeliveryDays ?? row.AvgDeliveryDays ?? 0),
      });
    });

    candidatesCache.set(key, candidates);
    return candidates;
  };

  lanes.forEach((row) => {
    const zip = (row.Dest3Zip || '').trim();
    const zipChannelKey = `${zip}|${(row.Channel || '').trim()}`;

    let candidates = poolByZipChannel.has(zipChannelKey)
      ? getCandidatesForKey(zipChannelKey, poolByZipChannel.get(zipChannelKey)!)
      : [];

    if (candidates.length < 2 && poolByZip.has(zip)) {
      const zipCandidates = getCandidatesForKey(`ZIP_${zip}`, poolByZip.get(zip)!);
      if (zipCandidates.length > candidates.length) {
        candidates = zipCandidates;
      }
    }

    const opt1 = candidates[0];
    const opt2 = candidates[1];
    const opt3 = candidates[2];
    const opt4 = candidates[3];

    row.RankedOption1DC = opt1 ? opt1.dc : row.RankedOption1DC || '';
    row.RankedOption1Cost = opt1 ? (opt1.cost > 0 ? opt1.cost : row.RankedOption1Cost || 0) : (row.RankedOption1Cost || 0);
    row.RankedOption1Days = opt1 ? opt1.days : row.RankedOption1Days || 0;

    row.RankedOption2DC = opt2 ? opt2.dc : '';
    row.RankedOption2Cost = opt2 ? opt2.cost : 0;
    row.RankedOption2Days = opt2 ? opt2.days : 0;

    row.RankedOption3DC = opt3 ? opt3.dc : '';
    row.RankedOption3Cost = opt3 ? opt3.cost : 0;
    row.RankedOption3Days = opt3 ? opt3.days : 0;

    row.RankedOption4DC = opt4 ? opt4.dc : '';
    row.RankedOption4Cost = opt4 ? opt4.cost : 0;
    row.RankedOption4Days = opt4 ? opt4.days : 0;
  });

  return lanes;
};

const loadScenarioLaneDatasetFrom = async (
  datasetId: string,
  label: string,
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> => {
  const t0 = performance.now();
  if (!datasetId) {
    console.log(`[Domo Lanes ${label}] source=fallback (dataset ID not set)`);
    return [];
  }

  try {
    console.log(`[Domo Lanes ${label}] Step 1: fetching token & requesting CSV for dataset ${datasetId}`);
    const token = await DatasetApi.fetchAccessToken();
    const rawCsv = await DatasetApi.getDatasetDataCsv(datasetId, token, 100000, 0);
    const fetchMs = Math.round(performance.now() - t0);
    console.log(`[Domo Lanes ${label}] Step 2: CSV received (${rawCsv.length} chars, took ${fetchMs}ms)`);

    const parseT0 = performance.now();
    const rawRows = csvToObjects(rawCsv) as DomoLaneRow[];
    const parseMs = Math.round(performance.now() - parseT0);
    console.log(`[Domo Lanes ${label}] Step 3: CSV parsed (${rawRows.length} rows, took ${parseMs}ms)`);

    const normT0 = performance.now();
    const rawNormalized = rawRows
      .map((row) => normalizeRawLaneRow(row, scenarioRunIdLookup, datasetId))
      .filter((item): item is ScenarioRunResultsLane => Boolean(item));
    const normalizedFromRaw = enrichRankedOptionsForLanes(rawNormalized);
    const normMs = Math.round(performance.now() - normT0);

    console.log(`[Domo Lanes ${label}] Step 4: fully loaded & normalized (${normalizedFromRaw.length} rows, took ${normMs}ms, total ${Math.round(performance.now() - t0)}ms)`);
    return normalizedFromRaw;
  } catch (error) {
    console.warn(`[Domo Lanes ${label}] ERROR after ${Math.round(performance.now() - t0)}ms:`, error);
    return [];
  }
};

export const loadScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(RAW_LANE_DATASET_ENV_ID, 'Raw', scenarioRunIdLookup);

export const loadUsBaselineNewLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> => {
  if (!US_BASELINE_NEW_LANE_DATASET_ENV_ID) {
    console.log('[Domo Lanes US Baseline New] VITE_SCENARIO_LANE_US_BASELINE_NEW_ID not set; returning empty list.');
    return [];
  }
  return loadScenarioLaneDatasetFrom(US_BASELINE_NEW_LANE_DATASET_ENV_ID, 'US Baseline New Lanes', scenarioRunIdLookup);
};

export const loadCanadaBaselineNewLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> => {
  if (!CANADA_BASELINE_NEW_LANE_DATASET_ENV_ID) {
    console.log('[Domo Lanes Canada Baseline New] VITE_SCENARIO_LANE_CANADA_BASELINE_NEW_ID / US fallback not set; returning empty list.');
    return [];
  }
  return loadScenarioLaneDatasetFrom(CANADA_BASELINE_NEW_LANE_DATASET_ENV_ID, 'Canada Baseline New Lanes', scenarioRunIdLookup);
};

const normalizeWarehouseNameInternal = (name: string): string => {
  if (!name) return '';
  const cleaned = name.trim().toLowerCase();
  if (cleaned.includes('dallas')) return 'dallas';
  if (cleaned.includes('virginia') || cleaned.includes('r virginia')) return 'r virginia';
  if (cleaned.includes('elwood')) return 'elwood';
  if (cleaned.includes('los angeles') || cleaned.includes('la')) return 'los angeles';
  if (cleaned.includes('milton')) return 'milton';
  if (cleaned.includes('delta')) return 'delta';
  if (cleaned.includes('brampton')) return 'brampton';
  if (cleaned.includes('richmond')) return 'richmond';
  if (cleaned.includes('vancouver')) return 'vancouver';
  return cleaned;
};

export const US_DEFAULT_WAREHOUSES = new Set(['dallas', 'r virginia', 'elwood', 'los angeles']);
export const CANADA_DEFAULT_WAREHOUSES = new Set(['milton', 'delta', 'brampton', 'richmond', 'vancouver']);

export const filterLanesByDefaultWarehouse = (
  lanes: ScenarioRunResultsLane[],
  region: 'US' | 'Canada'
): ScenarioRunResultsLane[] => {
  const allowed = region === 'Canada' ? CANADA_DEFAULT_WAREHOUSES : US_DEFAULT_WAREHOUSES;
  const filtered = lanes.filter((lane) => {
    const rawWh = String(
      lane.DefaultShipFrom || lane.CostingWarehouse || lane.AssignedDC || ''
    ).trim();
    if (!rawWh) return false;
    const normalizedWh = normalizeWarehouseNameInternal(rawWh);
    return allowed.has(normalizedWh);
  });
  console.log(`[Domo Warehouse Filter] region=${region} inputLanes=${lanes.length} filteredLanes=${filtered.length}`);
  if (filtered.length === 0 && lanes.length > 0) {
    console.warn(`[Domo Warehouse Filter WARNING] Filter produced 0 lanes for region=${region}! Sample raw warehouse fields from input:`,
      lanes.slice(0, 5).map(l => ({ defaultShipFrom: l.DefaultShipFrom, costingWarehouse: l.CostingWarehouse, assignedDC: l.AssignedDC }))
    );
  }
  return filtered;
};

export const loadBcvScenarioLaneDataset = async (
  scenarioRunIdLookup: Record<string, string> = {},
): Promise<ScenarioRunResultsLane[]> =>
  loadScenarioLaneDatasetFrom(BCV_LANE_DATASET_ENV_ID, 'BCV', scenarioRunIdLookup);



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
  costPerUnit: ['costPerUnit', 'CostPerUnit', 'Cost Per CWT', 'CostPerCWT', 'cost_per_cwt', 'Cost per CWT', 'costPerCWT', 'Cost/Unit', 'cost_per_unit'],
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

const superNormalizeKey = (s: string): string => {
  return s
    .toLowerCase()
    .replace(/[âÂ\xa0\u00a0\u200b]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const getField = (row: DomoDcRow, keys: readonly string[]): unknown => {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }

  let superNormMap = (row as any).__superNormMap;
  if (!superNormMap) {
    superNormMap = new Map<string, unknown>();
    for (const k in row) {
      if (k !== '__normMap' && k !== '__superNormMap') {
        superNormMap.set(superNormalizeKey(k), row[k]);
      }
    }
    Object.defineProperty(row, '__superNormMap', { value: superNormMap, enumerable: false, writable: false });
  }

  for (const key of keys) {
    const match = superNormMap.get(superNormalizeKey(key));
    if (match !== undefined) return match;
  }

  return undefined;
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
    MaxUtilPct: totalWorkingCapacity > 0 ? Number(((totalCoreSpace / totalWorkingCapacity) * 100).toFixed(2)) : 0,
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

const COST_COMPONENTS_FIELD_ALIASES = {
  costingWarehouse: ['Costing Warehouse', 'CostingWarehouse', 'costingWarehouse'],
  zip3: ['3-zip', '3Zip', '3-Zip', 'Dest3Zip', 'dest3Zip', 'zip3'],
  channel: ['Channel', 'channel'],
  inboundSpend: ['Inbound Spend', 'InboundSpend', 'inboundSpend'],
  distributionCost: ['3-zip x Channel Distribution Cost', '3-zip x Channel Distribution Cost ', 'distributionCost', 'distribution_cost', 'DistributionCost'],
  parcelSpend: ['Parcel Spend', 'ParcelSpend', 'parcelSpend'],
  ltlSpend: ['LTL Spend x 3-zip x Channel', 'LTL Spend x 3-zip x Channel ', 'LtlSpend', 'ltlSpend'],
  tlSpend: ['3-zip x Channel TL Spend', '3-zip x Channel TL Spend ', 'tlSpend', 'tlspend', 'TlSpend'],
  totalCost: ['totalCost', 'TotalCost', 'total_cost'],
};

export const loadCostComponentsDataset = async (datasetId: string): Promise<DomoCostComponentRow[]> => {
  if (!datasetId) return [];
  try {
    const token = await DatasetApi.fetchAccessToken();
    const rawCsv = await DatasetApi.getDatasetDataCsv(datasetId, token, 100000, 0);
    const rawRows = csvToObjects(rawCsv);
    return rawRows.map((row: any) => {
      return {
        CostingWarehouse: asText(getField(row, COST_COMPONENTS_FIELD_ALIASES.costingWarehouse)),
        Zip3: asText(getField(row, COST_COMPONENTS_FIELD_ALIASES.zip3)),
        Channel: asText(getField(row, COST_COMPONENTS_FIELD_ALIASES.channel)),
        InboundSpend: asNumber(getField(row, COST_COMPONENTS_FIELD_ALIASES.inboundSpend)),
        DistributionCost: asNumber(getField(row, COST_COMPONENTS_FIELD_ALIASES.distributionCost)),
        ParcelSpend: asNumber(getField(row, COST_COMPONENTS_FIELD_ALIASES.parcelSpend)),
        LtlSpend: asNumber(getField(row, COST_COMPONENTS_FIELD_ALIASES.ltlSpend)),
        TlSpend: asNumber(getField(row, COST_COMPONENTS_FIELD_ALIASES.tlSpend)),
        TotalCost: asNumber(getField(row, COST_COMPONENTS_FIELD_ALIASES.totalCost)),
      };
    });
  } catch (error) {
    console.warn('[Cost Components] Failed to load cost components dataset', error);
    return [];
  }
};

const SPACE_OVERRIDE_FIELD_ALIASES = {
  location: ['Ship From', 'ShipFrom', 'Location', 'location', 'ship_from', 'DCName', 'DC Name'],
  contractedSqFt: ['Contracted Square Footage', 'ContractedSquareFootage', 'contracted_square_footage', 'contractedSqFt'],
  workingCapacitySqFt: ['Working Capacity Sq. Ft. dyn', 'WorkingCapacitySqFtDyn', 'workingCapacitySqFt', 'WorkingCapacitySqFt', 'Working Capacity Sq Ft', 'working_capacity_sq_ft', 'Working Capacity Sq. Ft. dyn '],
  palletUtilization: ['Pallet Positition Utilization dyn', 'Pallet Position Utilization dyn', 'PalletPositionUtilizationDyn', 'palletUtilization', 'pallet_utilization'],
  // New baseline cost columns:
  totalCost: ['total_cost(incl ibf,dst,obf)', 'total_cost', 'totalCost', 'TotalCost', 'total_cost(incl_ibf,dst,obf)', 'total_cost (incl ibf,dst,obf)'],
  totalQty: ['totalQty', 'totalQty ', 'total_qty', 'VolumeUnits', 'volumeUnits'],
  totalInboundSpend: ['totalInboundSpend', 'totalInboundSpend ', 'total_inbound_spend', 'inboundSpend'],
  totalDistributionSpend: ['totalDistributionSpend', 'totalDistributionSpend ', 'total_distribution_spend', 'distributionCost'],
  annualManagementFee: ['Annual Management Fee', 'AnnualManagementFee', 'annual_management_fee', 'managementFee'],
  totalWarehouseCost: ['Total WarehouseÂ Cost dyn', 'Total WarehouseÂ Cost dyn', 'Total Warehouse Cost dyn', 'TotalWarehouseCostDyn', 'Total Warehouse Cost', 'totalWarehouseCost', 'rent'],
  distributionSpendIncAll: ['distributionSpend_Inc_(rent,mgmtfee,cnrctlbr)', 'distributionSpend_Inc_rent_mgmtfee_cnrctlbr', 'distributionSpendInc', 'distributionSpend_Inc_(rent,mgmtfee,cnrctlbr) '],
  parcelSpend: ['Parcel Spend', 'ParcelSpend', 'parcel_spend', 'parcelSpend'],
  tlCost: ['TL_Cost', 'TL Cost', 'tlCost', 'tlSpend'],
  ltlCost: ['LTL_Cost', 'LTL Cost', 'ltlCost', 'ltlSpend'],
  // Percentages and CPU:
  pctToTotalSales: ['% to total sales', '%_to_total_sales', 'pctToTotalSales'],
  ibfPctOfRevenue: ['IBF % of Revenue', 'IBF % Revenue', 'ibfPctOfRevenue'],
  dstPctRevenue: ['DST % Revenue', 'dstPctRevenue'],
  obParcelPctRevenue: ['OB Parcel % Revenue', 'obParcelPctRevenue'],
  obTlPctRevenue: ['OB TL % Revenue', 'obTlPctRevenue'],
  obLtlPctRevenue: ['OB LTL % Revenue', 'obLtlPctRevenue'],
  obfTotalPctOfRevenue: ['OBF Total % of Revenue', 'obfTotalPctOfRevenue'],
  costPerUnit: ['Cost Per Unit', 'costPerUnit'],
  obfCostPerUnit: ['OBF Cost Per Unit', 'obfCostPerUnit'],
  dstCostPerUnit: ['DST Cost Per Unit', 'dstCostPerUnit'],
  ibfCostPerUnit: ['IBF Cost Per Unit', 'ibfCostPerUnit'],
  totalExtendedPrice: ['totalExtendedPrice', 'TotalExtendedPrice'],
  avgDeliveryDays: ['avg_delivery_days', 'avgDeliveryDays', 'AvgDeliveryDays', 'Avg Delivery Days', 'avg_delivery_days '],
  avgTransitDays: ['avg_transit_days', 'avgTransitDays', 'AvgTransitDays', 'Avg Transit Days', 'avg_transit_days '],
};

export const loadSpaceOverridesDataset = async (datasetId: string): Promise<DomoSpaceOverrideRow[]> => {
  if (!datasetId) return [];
  try {
    const token = await DatasetApi.fetchAccessToken();
    const rawCsv = await DatasetApi.getDatasetDataCsv(datasetId, token, 10000, 0);
    const rawRows = csvToObjects(rawCsv);
    return rawRows.map((row: any) => {
      const contractedSqFt = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.contractedSqFt));
      const workingCapacitySqFt = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.workingCapacitySqFt));
      const palletUtilization = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.palletUtilization));

      const totalCost = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.totalCost));
      const totalQty = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.totalQty));
      const totalInboundSpend = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.totalInboundSpend));
      const totalDistributionSpend = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.totalDistributionSpend));
      const annualManagementFee = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.annualManagementFee));
      const totalWarehouseCost = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.totalWarehouseCost)); // Rent
      const distributionSpendIncAll = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.distributionSpendIncAll));
      const parcelSpend = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.parcelSpend));
      const tlCost = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.tlCost));
      const ltlCost = asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.ltlCost));

      // Derive Contract Labor:
      // ContractLabor = distributionSpend_Inc_(rent,mgmtfee,cnrctlbr) - Rent (totalWarehouseCost) - ManagementFee (annualManagementFee)
      const derivedContractLabor = Math.max(0, distributionSpendIncAll - totalWarehouseCost - annualManagementFee);

      return {
        Location: asText(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.location)),
        ContractedSquareFootage: contractedSqFt,
        WorkingCapacitySqFt: workingCapacitySqFt,
        PalletUtilization: palletUtilization,
        TotalCost: totalCost,
        InboundSpend: totalInboundSpend,
        DistributionCost: distributionSpendIncAll,
        ManagementFee: annualManagementFee,
        Rent: totalWarehouseCost,
        ContractLabor: derivedContractLabor,
        ParcelSpend: parcelSpend,
        TlSpend: tlCost,
        LtlSpend: ltlCost,
        VolumeUnits: totalQty,
        PctToTotalSales: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.pctToTotalSales)),
        IbfPctOfRevenue: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.ibfPctOfRevenue)),
        DstPctRevenue: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.dstPctRevenue)),
        ObParcelPctRevenue: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.obParcelPctRevenue)),
        ObTlPctRevenue: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.obTlPctRevenue)),
        ObLtlPctRevenue: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.obLtlPctRevenue)),
        ObfTotalPctOfRevenue: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.obfTotalPctOfRevenue)),
        CostPerUnit: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.costPerUnit)),
        ObfCostPerUnit: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.obfCostPerUnit)),
        DstCostPerUnit: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.dstCostPerUnit)),
        IbfCostPerUnit: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.ibfCostPerUnit)),
        TotalExtendedPrice: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.totalExtendedPrice)),
        AvgDeliveryDays: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.avgDeliveryDays)),
        AvgTransitDays: asNumber(getField(row, SPACE_OVERRIDE_FIELD_ALIASES.avgTransitDays)),
      };
    });
  } catch (error) {
    console.warn('[Space Overrides] Failed to load space overrides dataset', error);
    return [];
  }
};

