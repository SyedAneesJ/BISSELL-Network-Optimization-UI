
export type ScenarioFamilyKey = 'base-us' | 'bcv-family' | 'consolidation-family';
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

const normalizeScenarioType = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const normalizeDcKey = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

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
    defaults: {
      footprintMode: 'NA',
      utilCap: 100,
      levelLoad: false,
      allowRelocationPrepaid: true,
      allowRelocationCollect: true,
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
    scenarioType: 'Tactical Pro Forma',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: ['tactical pro forma'],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'constrained',
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
      levelLoad: false,
      allowRelocationPrepaid: false,
      allowRelocationCollect: false,
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
    scenarioType: 'Strategic Pro Forma',
    familyKey: 'base-us',
    familyLabel: 'Base US Family',
    aliases: ['strategic pro forma'],
    allowedDcs: BASE_US_DCS,
    allocationMode: 'overload',
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
      allowRelocationCollect: false,
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
    helpText: ['Strategic Pro Forma keeps util cap locked at 100% and uses unconstrained footprint.'],
  },
  {
    scenarioType: 'BCV Ingestion Only',
    familyKey: 'bcv-family',
    familyLabel: 'BCV Family',
    aliases: ['bcv ingestion', 'bcv ingestion only', 'bcv ingestion only collect relo', 'bcv - collect relo', 'bcv collect relo'],
    allowedDcs: BCV_DCS,
    allocationMode: 'unconstrained',
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
    scenarioType: 'Consolidation Tactical',
    familyKey: 'consolidation-family',
    familyLabel: 'Consolidation Family',
    aliases: ['tactical consolidation', 'consolidation tactical', 'consolidation tactical relo'],
    allowedDcs: CONSOLIDATION_DCS,
    allocationMode: 'tacticalConsolidation',
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
    scenarioType: 'Consolidation Strategic Unconstrained',
    familyKey: 'consolidation-family',
    familyLabel: 'Consolidation Family',
    aliases: ['consolidation strategic unconstrained', 'strategic consolidation', 'consolidation strategic relo', 'consolidation strategic unconstrained relo'],
    allowedDcs: CONSOLIDATION_DCS,
    allocationMode: 'overload',
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

export const getScenarioTypeSortRank = (scenarioType: unknown): number => {
  const normalized = normalizeScenarioType(scenarioType);
  if (normalized.includes('baseline')) return 1;
  if (normalized.includes('tactical pro forma')) return 2;
  if (normalized.includes('strategic pro forma')) return 3;
  if (normalized.includes('bcv ingestion') && normalized.includes('collect') && normalized.includes('relo')) return 9;
  if (normalized.includes('bcv ingestion')) return 4;
  if (normalized.includes('consolidation tactical') && normalized.includes('relo')) return 10;
  if (normalized.includes('consolidation tactical')) return 5;
  if (normalized.includes('consolidation strategic') && normalized.includes('relo')) return 11;
  if (normalized.includes('consolidation strategic')) return 6;
  if (normalized.includes('tactical') && normalized.includes('collect') && normalized.includes('relo')) return 7;
  if (normalized.includes('strategic') && normalized.includes('collect') && normalized.includes('relo')) return 8;
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
  const preserveSet = input.activeDCs instanceof Set ? 'set' : 'array';
  const preserveSuppressedSet = input.suppressedDCs instanceof Set ? 'set' : 'array';
  const allowedDcs = policy.allowedDcs;

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
    allowRelocationCollect: policy.supports.relocationCollect
      ? normalizeBoolean(input.allowRelocationCollect, policy.defaults.allowRelocationCollect)
      : false,
    bcvRuleSet: policy.supports.bcvMapping
      ? normalizeString(input.bcvRuleSet, policy.defaults.bcvRuleSet)
      : policy.defaults.bcvRuleSet,
    allowManualOverride: policy.supports.overrides
      ? normalizeBoolean(input.allowManualOverride, policy.defaults.allowManualOverride)
      : false,
  } as T;
};

export const getScenarioTypeHelpText = (scenarioType: unknown): string[] =>
  resolveScenarioTypePolicy(scenarioType).helpText;

export const getScenarioTypeFamilyDcs = (scenarioType: unknown): string[] =>
  normalizeDcList(resolveScenarioTypePolicy(scenarioType).allowedDcs);
