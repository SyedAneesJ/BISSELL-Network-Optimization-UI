
export type ScenarioFamilyKey = 'base-us' | 'base-canada' | 'bcv-family' | 'consolidation-family';
export type ScenarioAllocationPreset =
  | 'baseline'
  | 'overload'
  | 'constrained'
  | 'unconstrained'
  | 'tacticalConsolidation'
  | 'auto';

export interface ScenarioTypePolicy {
  scenarioType: string;
  familyKey: ScenarioFamilyKey;
  familyLabel: string;
  aliases: string[];
  allowedDcs: string[];
  allocationMode: ScenarioAllocationPreset;
  collectPolicy: 'fixed' | 'relocatable';
  collectTreatmentLabel: string;
  defaults: {
    footprintMode: string;
    utilCap: number;
    levelLoad: boolean;
    allowRelocationPrepaid: boolean;
    allowRelocationCollect: boolean;
    bcvRuleSet: string;
    allowManualOverride: boolean;
  };
  locks: {
    activeDcs: boolean;
    suppressedDcs: boolean;
    footprintMode: boolean;
    utilCap: boolean;
    levelLoad: boolean;
    allowRelocationPrepaid: boolean;
    allowRelocationCollect: boolean;
    bcvRuleSet: boolean;
    allowManualOverride: boolean;
  };
  supports: {
    dcSuppression: boolean;
    footprintMode: boolean;
    utilCap: boolean;
    levelLoad: boolean;
    relocationPrepaid: boolean;
    relocationCollect: boolean;
    bcvMapping: boolean;
    overrides: boolean;
  };
  sortOrder: number;
  helpText: string[];
}

const BASE_US_DCS = ['Elwood', 'Dallas', 'Los Angeles', 'R Virginia'];
const BCV_DCS = [...BASE_US_DCS, 'Pharr TX'];
const CONSOLIDATION_DCS = [...BASE_US_DCS, 'Pharr TX', 'Stratford CT'];
const CANADA_CORE_DCS = ['Brampton', 'Richmond'];
const CANADA_BCV_DCS = [...CANADA_CORE_DCS, 'Stratford'];

const normalizeScenarioType = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const normalizeDcKey = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

export const canonicalizeDcName = (value: unknown): string => {
  const text = String(value || '').trim();
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  if (normalized === 'stratford ct') return 'Stratford';
  return text;
};

const normalizeDcList = (rows: string[]): string[] =>
  [...rows]
    .map((dc) => String(dc || '').trim())
    .filter(Boolean);

const scenarioTypeMatchesAlias = (scenarioType: string, aliases: string[]): boolean =>
  aliases.some((alias) => {
    const normalizedAlias = normalizeScenarioType(alias);
    return normalizedAlias.length > 0 && scenarioType.includes(normalizedAlias);
  });

const scenarioTypeRules: ScenarioTypePolicy[] = [
  {
    scenarioType: 'US Baseline',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: ['baseline', 'us baseline'],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'baseline',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'NA',
    defaults: {
      footprintMode: 'NA',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'NA',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: true,
      suppressedDcs: true,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: true,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: false,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: false,
      relocationCollect: false,
      bcvMapping: false,
      overrides: false,
    },
    sortOrder: 1,
    helpText: ['Baseline parity: all 4 base DCs stay active and util cap is fixed at 100%.'],
  },
  {
    scenarioType: 'Canada Baseline',
    familyKey: 'base-canada',
    familyLabel: 'Canada Baseline Family',
    aliases: ['canada baseline', 'ca baseline'],
    allowedDcs: CANADA_CORE_DCS,
    allocationMode: 'baseline',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'NA',
    defaults: {
      region: 'Canada',
      entityScope: 'Core',
      channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
      utilCap: 100,
      leadTimeCap: 0,
      excludeBeyondCap: false,
      costVsService: 50,
      fuelSurchargeMode: 'NA',
      fuelSurchargeOverride: null,
      accessorialFlags: [],
      allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'NA',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: true,
      suppressedDcs: false,
      utilCap: true,
      leadTimeCap: true,
      excludeBeyondCap: true,
      costVsService: true,
      fuelSurchargeMode: true,
      fuelSurchargeOverride: true,
      accessorialFlags: true,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: true,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: false,
      relocationPrepaid: false,
      relocationCollect: false,
      bcvMapping: false,
      overrides: false,
    },
    sortOrder: 1,
    helpText: ['Canada baseline parity keeps the Canada base DCs fixed and util cap locked at 100%.'],
  },
  {
    scenarioType: 'Tactical Pro Forma (Collect Relocatable)',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: [
      'tactical pro forma collect relocatable',
      'tactical collect relo',
      'scenario 7 tactical collect relo',
      'tactical fixed footprint collect relocatable',
      'canada tactical relo',
    ],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'constrained',
    collectPolicy: 'relocatable',
    collectTreatmentLabel: 'Collect Relocatable',
    defaults: {
      footprintMode: 'Fixed',
      utilCap: 80,
      levelLoad: true,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: 'NA',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: false,
      levelLoad: true,
      allowRelocationPrepaid: false,
      allowRelocationCollect: true,
      bcvRuleSet: true,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      relocationPrepaid: true,
      relocationCollect: true,
      bcvMapping: false,
      overrides: false,
    },
    sortOrder: 7,
    helpText: ['Collect relocatable tactical pro forma allows collect lanes to move across active DCs.'],
  },
  {
    scenarioType: 'Tactical Pro Forma',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: ['tactical pro forma', 'tactical fixed footprint', 'canada tactical'],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'constrained',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'Fixed',
    defaults: {
      footprintMode: 'Fixed',
      utilCap: 80,
      levelLoad: true,
    allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'NA',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: false,
      levelLoad: true,
      allowRelocationPrepaid: false,
      allowRelocationCollect: true,
      bcvRuleSet: true,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      relocationPrepaid: true,
      relocationCollect: true,
      bcvMapping: false,
      overrides: false,
    },
    sortOrder: 2,
    helpText: ['Tactical Pro Forma uses fixed footprint, allows DC suppression, and supports util cap editing.'],
  },
  {
    scenarioType: 'Strategic Pro Forma (Collect Relocatable)',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: [
      'strategic pro forma collect relocatable',
      'strategic collect relo',
      'scenario 8 strategic collect relo',
      'strategic unconstrained footprint collect relocatable',
      'canada strategic relo',
    ],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'unconstrained',
    collectPolicy: 'relocatable',
    collectTreatmentLabel: 'Collect Relocatable',
    defaults: {
      footprintMode: 'Unconstrained',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: 'NA',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      allowRelocationPrepaid: false,
      allowRelocationCollect: true,
      bcvRuleSet: true,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: true,
      relocationCollect: true,
      bcvMapping: false,
      overrides: false,
    },
    sortOrder: 8,
    helpText: ['Collect relocatable strategic pro forma chooses each lane\'s cheapest eligible DC across the same 4-DC family with unconstrained footprint.'],
  },
  {
    scenarioType: 'Strategic Pro Forma',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: ['strategic pro forma', 'strategic unconstrained footprint', 'canada strategic'],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'unconstrained',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'Fixed',
    defaults: {
      footprintMode: 'Unconstrained',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'NA',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      allowRelocationPrepaid: false,
      allowRelocationCollect: true,
      bcvRuleSet: true,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: true,
      relocationCollect: true,
      bcvMapping: false,
      overrides: false,
    },
    sortOrder: 3,
    helpText: ['Strategic Pro Forma chooses each lane\'s cheapest eligible DC, keeps collect fixed, and uses unconstrained footprint.'],
  },
  {
    scenarioType: 'BCV Ingestion (Collect Relocatable)',
    familyKey: 'bcv-family',
    familyLabel: 'BCV Family',
    aliases: [
      'bcv ingestion collect relocatable',
      'bcv collect relo',
      'scenario 9 bcv collect relo',
      'canada bcv relo',
    ],
    allowedDcs: BCV_DCS,
    allocationMode: 'unconstrained',
    collectPolicy: 'relocatable',
    collectTreatmentLabel: 'Collect Relocatable',
    defaults: {
      footprintMode: 'Unconstrained',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: 'Default',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: false,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: true,
      relocationCollect: true,
      bcvMapping: true,
      overrides: false,
    },
    sortOrder: 9,
    helpText: ['Collect relocatable BCV adds Pharr TX and allows collect lanes to move across the BCV family.'],
  },
  {
      scenarioType: 'BCV Ingestion Only',
      familyKey: 'bcv-family',
      familyLabel: 'BCV Family',
      aliases: ['bcv ingestion', 'bcv ingestion only', 'canada bcv'],
      allowedDcs: BCV_DCS,
    allocationMode: 'unconstrained',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'Fixed',
    defaults: {
      footprintMode: 'Unconstrained',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'Default',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
      bcvRuleSet: false,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: true,
      relocationCollect: false,
      bcvMapping: true,
      overrides: false,
      },
      sortOrder: 4,
      helpText: ['BCV Ingestion adds Pharr TX to the 5-DC BCV family and keeps util cap at 100%.'],
    },
    {
      scenarioType: 'Consolidation Tactical (Collect Relocatable)',
      familyKey: 'consolidation-family',
      familyLabel: 'Consolidation Family',
      aliases: [
        'consolidation tactical collect relocatable',
        'consolidation tactical collect relo',
        'scenario 10 consolidation tactical relo',
        'consolidation tactical fixed footprint collect relocatable',
        'canada consolidation tactical relo',
      ],
      allowedDcs: CONSOLIDATION_DCS,
      allocationMode: 'tacticalConsolidation',
      collectPolicy: 'relocatable',
      collectTreatmentLabel: 'Collect Relocatable',
      defaults: {
        footprintMode: 'Fixed',
        utilCap: 80,
        levelLoad: true,
        allowRelocationPrepaid: true,
        allowRelocationCollect: true,
        bcvRuleSet: 'Default',
        bcvMapping: true,
        overrides: false,
      },
      locks: {
        activeDcs: false,
        utilCap: false,
        levelLoad: true,
        allowRelocationPrepaid: false,
        allowRelocationCollect: true,
        bcvRuleSet: false,
        allowManualOverride: true,
      },
      supports: {
        dcSuppression: true,
        relocationPrepaid: true,
        relocationCollect: true,
        bcvMapping: true,
        overrides: true,
      },
      sortOrder: 10,
      helpText: ['Collect relocatable consolidation tactical keeps the 6-DC family with fixed footprint and allows collect lanes to move.'],
    },
    {
      scenarioType: 'Consolidation Tactical',
      familyKey: 'consolidation-family',
      familyLabel: 'Consolidation Family',
      aliases: ['tactical consolidation', 'consolidation tactical', 'consolidation tactical relo', 'canada consolidation tactical'],
    allowedDcs: CONSOLIDATION_DCS,
    allocationMode: 'tacticalConsolidation',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'Fixed',
    defaults: {
      footprintMode: 'Fixed',
      utilCap: 80,
      levelLoad: true,
      allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'Default',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: false,
      levelLoad: true,
      allowRelocationPrepaid: false,
      allowRelocationCollect: true,
      bcvRuleSet: false,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: true,
      relocationCollect: false,
      bcvMapping: true,
      overrides: false,
    },
      sortOrder: 5,
      helpText: ['Consolidation Tactical uses the 6-DC family, fixed footprint, and starts at 80% util cap (editable).'],
    },
    {
      scenarioType: 'Consolidation Strategic (Collect Relocatable)',
      familyKey: 'consolidation-family',
      familyLabel: 'Consolidation Family',
      aliases: [
        'consolidation strategic collect relocatable',
        'consolidation strategic collect relo',
        'scenario 11 consolidation strategic relo',
        'consolidation strategic unconstrained collect relocatable',
        'canada consolidation strategic relo',
      ],
      allowedDcs: CONSOLIDATION_DCS,
      allocationMode: 'overload',
      collectPolicy: 'relocatable',
      collectTreatmentLabel: 'Collect Relocatable',
      defaults: {
        footprintMode: 'Unconstrained',
        utilCap: 100,
        levelLoad: false,
        allowRelocationPrepaid: true,
        allowRelocationCollect: true,
        bcvRuleSet: 'Default',
        bcvMapping: true,
        overrides: false,
      },
      locks: {
        activeDcs: false,
        utilCap: true,
        levelLoad: true,
        allowRelocationPrepaid: false,
        allowRelocationCollect: true,
        bcvRuleSet: false,
        allowManualOverride: true,
      },
      supports: {
        dcSuppression: true,
        relocationPrepaid: true,
        relocationCollect: true,
        bcvMapping: true,
        overrides: true,
      },
      sortOrder: 11,
      helpText: ['Collect relocatable consolidation strategic uses the 6-DC family with unconstrained footprint and allows collect lanes to move.'],
    },
    {
      scenarioType: 'Consolidation Strategic Unconstrained',
      familyKey: 'consolidation-family',
      familyLabel: 'Consolidation Family',
      aliases: [
        'consolidation strategic unconstrained',
        'strategic consolidation',
        'consolidation strategic relo',
        'consolidation strategic unconstrained relo',
        'canada consolidation strategic',
      ],
    allowedDcs: CONSOLIDATION_DCS,
    allocationMode: 'overload',
    collectPolicy: 'fixed',
    collectTreatmentLabel: 'Fixed',
    defaults: {
      footprintMode: 'Unconstrained',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: false,
      bcvRuleSet: 'Default',
      allowManualOverride: false,
    },
    locks: {
      activeDcs: false,
      suppressedDcs: false,
      footprintMode: true,
      utilCap: true,
      levelLoad: true,
      allowRelocationPrepaid: false,
      allowRelocationCollect: true,
      bcvRuleSet: false,
      allowManualOverride: true,
    },
    supports: {
      dcSuppression: true,
      footprintMode: false,
      utilCap: false,
      levelLoad: false,
      relocationPrepaid: true,
      relocationCollect: false,
      bcvMapping: true,
      overrides: false,
    },
    sortOrder: 6,
    helpText: ['Consolidation Strategic uses the same 6-DC family but behaves like overload with no cap restriction.'],
  },
];

const defaultPolicy = scenarioTypeRules[0];

export const resolveScenarioFamilyKey = (scenarioType: unknown): ScenarioFamilyKey => {
  const normalized = normalizeScenarioType(scenarioType);
  if (scenarioTypeRules.find((rule) => rule.familyKey === 'base-canada' && scenarioTypeMatchesAlias(normalized, rule.aliases))) {
    return 'base-canada';
  }
  if (scenarioTypeRules.find((rule) => rule.familyKey === 'bcv-family' && scenarioTypeMatchesAlias(normalized, rule.aliases))) {
    return 'bcv-family';
  }
  if (scenarioTypeRules.find((rule) => rule.familyKey === 'consolidation-family' && scenarioTypeMatchesAlias(normalized, rule.aliases))) {
    return 'consolidation-family';
  }
  return 'base-us';
};

export const resolveScenarioTypePolicy = (scenarioType: unknown): ScenarioTypePolicy => {
  const normalized = normalizeScenarioType(scenarioType);
  const matched = scenarioTypeRules.find((rule) => {
    if (normalizeScenarioType(rule.scenarioType) === normalized) return true;
    return scenarioTypeMatchesAlias(normalized, rule.aliases);
  });
  if (matched) return matched;

  const familyKey = resolveScenarioFamilyKey(scenarioType);
  return scenarioTypeRules.find((rule) => rule.familyKey === familyKey) || defaultPolicy;
};

export const getScenarioTypeAllowedDcs = (scenarioType: unknown): string[] =>
  normalizeDcList(resolveScenarioTypePolicy(scenarioType).allowedDcs);

export const getScenarioTypeAllowedDcsForRegion = (scenarioType: unknown, region: 'US' | 'Canada'): string[] => {
  const policy = resolveScenarioTypePolicy(scenarioType);
  if (region === 'Canada') {
    if (policy.familyKey === 'bcv-family' || policy.familyKey === 'consolidation-family') {
      return normalizeDcList(CANADA_BCV_DCS);
    }
    return normalizeDcList(CANADA_CORE_DCS);
  }
  return normalizeDcList(policy.allowedDcs);
};

export const getScenarioTypeSortRank = (scenarioType: unknown): number => {
  const normalized = normalizeScenarioType(scenarioType);
  if (normalized.includes('baseline')) return 1;
  if (normalized.includes('tactical pro forma') && normalized.includes('collect') && normalized.includes('relo')) return 7;
  if (normalized.includes('strategic pro forma') && normalized.includes('collect') && normalized.includes('relo')) return 8;
  if (normalized.includes('bcv ingestion') && normalized.includes('collect') && normalized.includes('relo')) return 9;
  if (normalized.includes('consolidation tactical') && normalized.includes('relo')) return 10;
  if (normalized.includes('consolidation strategic') && normalized.includes('relo')) return 11;
  if (normalized.includes('tactical pro forma')) return 2;
  if (normalized.includes('strategic pro forma')) return 3;
  if (normalized.includes('bcv ingestion')) return 4;
  if (normalized.includes('consolidation tactical')) return 5;
  if (normalized.includes('consolidation strategic')) return 6;
  return resolveScenarioTypePolicy(scenarioType).sortOrder || 100;
};

export const scenarioTypeMatches = (candidate: string, target: string): boolean => {
  const candidateText = normalizeScenarioType(candidate);
  const targetText = normalizeScenarioType(target);
  if (!candidateText || !targetText) return false;
  if (candidateText === targetText) return true;
  const candidatePolicy = resolveScenarioTypePolicy(candidateText);
  const targetPolicy = resolveScenarioTypePolicy(targetText);
  return candidatePolicy.familyKey === targetPolicy.familyKey;
};

const normalizeDcCollection = (value: Set<string> | string[], allowedDcs: string[], preserveType: 'set' | 'array'): Set<string> | string[] => {
  const allowedKeys = new Set(allowedDcs.map((dc) => normalizeDcKey(dc)));
  const source = value instanceof Set ? Array.from(value) : [...value];
  const filtered = source
    .map((dc) => String(dc || '').trim())
    .filter((dc) => dc && allowedKeys.has(normalizeDcKey(dc)));
  const ordered = allowedDcs.filter((dc) => filtered.some((item) => normalizeDcKey(item) === normalizeDcKey(dc)));
  if (preserveType === 'set') {
    return new Set(ordered);
  }
  return ordered;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  return fallback;
};

const normalizeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeString = (value: unknown, fallback: string): string => {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
};

export const normalizeScenarioTypeSpecificInput = <T extends {
  region?: 'US' | 'Canada';
  scenarioType: string;
  activeDCs: Set<string> | string[];
  suppressedDCs: Set<string> | string[];
  footprintMode: string;
  utilCap: number;
  levelLoad: boolean;
  allowRelocationPrepaid: boolean;
  allowRelocationCollect: boolean;
  bcvRuleSet: string;
  allowManualOverride: boolean;
}>(input: T): T => {
  const policy = resolveScenarioTypePolicy(input.scenarioType);
  const regionAllowedDcs = input.region ? getScenarioTypeAllowedDcsForRegion(input.scenarioType, input.region) : policy.allowedDcs;
  const preserveSet = input.activeDCs instanceof Set ? 'set' : 'array';
  const preserveSuppressedSet = input.suppressedDCs instanceof Set ? 'set' : 'array';
  const allowedDcs = regionAllowedDcs;

  const active = policy.supports.dcSuppression
    ? normalizeDcCollection(input.activeDCs, allowedDcs, preserveSet)
    : (preserveSet === 'set' ? new Set(allowedDcs) : [...allowedDcs]);
  const activeCollection = active instanceof Set ? Array.from(active) : active;
  const activeNormalized = activeCollection.length > 0
    ? activeCollection
    : allowedDcs;
  const suppressed = policy.supports.dcSuppression
    ? normalizeDcCollection(input.suppressedDCs, allowedDcs, preserveSuppressedSet)
    : (preserveSuppressedSet === 'set' ? new Set<string>() : []);
  const suppressedCollection = suppressed instanceof Set ? Array.from(suppressed) : suppressed;
  const suppressedKeys = new Set(suppressedCollection.map((dc) => normalizeDcKey(dc)));
  const activeFiltered = activeNormalized.filter((dc) => !suppressedKeys.has(normalizeDcKey(dc)));
  const activeFallback = activeFiltered.length > 0 ? activeFiltered : allowedDcs;
  const suppressedFiltered = suppressed instanceof Set
    ? new Set(suppressedCollection)
    : [...suppressedCollection];

  return {
    ...input,
    activeDCs: active instanceof Set ? new Set(activeFallback) : [...activeFallback],
    suppressedDCs: suppressedFiltered,
    footprintMode: policy.locks.footprintMode
      ? policy.defaults.footprintMode
      : normalizeString(input.footprintMode, policy.defaults.footprintMode),
    utilCap: policy.locks.utilCap
      ? policy.defaults.utilCap
      : normalizeNumber(input.utilCap, policy.defaults.utilCap),
    levelLoad: policy.locks.levelLoad
      ? policy.defaults.levelLoad
      : normalizeBoolean(input.levelLoad, policy.defaults.levelLoad),
    allowRelocationPrepaid: policy.supports.relocationPrepaid
      ? normalizeBoolean(input.allowRelocationPrepaid, policy.defaults.allowRelocationPrepaid)
      : false,
    allowRelocationCollect: policy.collectPolicy === 'relocatable',
    bcvRuleSet: policy.supports.bcvMapping
      ? normalizeString(input.bcvRuleSet, policy.defaults.bcvRuleSet)
      : policy.defaults.bcvRuleSet,
    allowManualOverride: policy.supports.overrides
      ? normalizeBoolean(input.allowManualOverride, policy.defaults.allowManualOverride)
      : false,
  } as T;
};

export const getScenarioTypeHelpText = (scenarioType: unknown, region: 'US' | 'Canada' = 'US'): string[] => {
  const policy = resolveScenarioTypePolicy(scenarioType);
  if (region === 'US') return policy.helpText;
  
  return policy.helpText.map((text) =>
    text
      .replace('all 4 base DCs', 'the Canada base DCs')
      .replace('4-DC family', 'Canada base DCs')
      .replace('Pharr TX to the 5-DC BCV family', 'Stratford to the 3-DC Canada BCV family')
      .replace('adds Pharr TX', 'adds Stratford')
      .replace('6-DC family', '3-DC Canada family')
  );
};

export const getScenarioTypeFamilyDcs = (scenarioType: unknown): string[] =>
  normalizeDcList(resolveScenarioTypePolicy(scenarioType).allowedDcs);

export type Step1ScenarioDefaults = {
  region: 'US' | 'Canada';
  entityScope: string;
  channelScope: string[];
  termsScope: string;
};

const STEP1_DEFAULTS_BY_SCENARIO_TYPE: Record<string, Step1ScenarioDefaults> = {
  'US Baseline': {
    region: 'US',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'Canada Baseline': {
    region: 'Canada',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'Tactical Pro Forma': {
    region: 'US',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'Tactical Pro Forma (Collect Relocatable)': {
    region: 'US',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Collect+Prepaid',
  },
  'Strategic Pro Forma': {
    region: 'US',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'Strategic Pro Forma (Collect Relocatable)': {
    region: 'US',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Collect+Prepaid',
  },
  'BCV Ingestion Only': {
    region: 'US',
    entityScope: 'BCV',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'BCV Ingestion (Collect Relocatable)': {
    region: 'US',
    entityScope: 'BCV',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Collect+Prepaid',
  },
  'Consolidation Tactical': {
    region: 'US',
    entityScope: 'Core+BCV',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'Consolidation Tactical (Collect Relocatable)': {
    region: 'US',
    entityScope: 'Core+BCV',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Collect+Prepaid',
  },
  'Consolidation Strategic Unconstrained': {
    region: 'US',
    entityScope: 'Core+BCV',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  },
  'Consolidation Strategic (Collect Relocatable)': {
    region: 'US',
    entityScope: 'Core+BCV',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Collect+Prepaid',
  },
};

export const resolveStep1ScenarioDefaults = (scenarioType: unknown): Step1ScenarioDefaults => {
  const policy = resolveScenarioTypePolicy(scenarioType);
  return STEP1_DEFAULTS_BY_SCENARIO_TYPE[policy.scenarioType] || {
    region: 'US',
    entityScope: 'Core',
    channelScope: ['B2C Home Delivery + B2B Retailer + D2C/eCom'],
    termsScope: 'Prepaid',
  };
};
