import {
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  ScenarioOverride,
} from '@/data';

export interface ScenarioWizardInput {
  region: 'US' | 'Canada';
  baselineScenarioId: string;
  baselineDataflowId: string;
  scenarioType: string;
  entityScope: string;
  channelScope: string[];
  termsScope: string;
  runName: string;
  tags: string[];
  notes: string;
  activeDCs: string[];
  suppressedDCs: string[];
  footprintMode: string;
  utilCap: number;
  levelLoad: boolean;
  leadTimeCap: number;
  excludeBeyondCap: boolean;
  costVsService: number;
  fuelSurchargeMode: string;
  fuelSurchargeOverride: number | null;
  accessorials: {
    residential: boolean;
    liftgate: boolean;
    insideDelivery: boolean;
  };
  allowRelocationPrepaid: boolean;
  allowRelocationCollect: boolean;
  bcvRuleSet: string;
  allowManualOverride: boolean;
}

export interface ScenarioSubmit {
  action: 'run' | 'draft';
  input: ScenarioWizardInput;
}

export interface ScenarioBuildContext {
  scenarioHeaders: ScenarioRunHeader[];
  scenarioResultsDC: ScenarioRunResultsDC[];
  scenarioResultsLanes: ScenarioRunResultsLane[];
  currentUserDisplayName: string;
  dataSnapshotVersion: string;
  hasCostVsServiceWeights: boolean;
  hasUtilCaps: boolean;
  hasLeadTimeCaps: boolean;
}

export interface ScenarioBuildSummary {
  totalCost: number;
  totalUnits: number;
  costPerUnit: number;
  avgDays: number;
  maxUtil: number;
  totalSpaceRequired: number;
  excludedBySla: number;
  slaBreachCount: number;
  missingAvgDays: number;
}

export interface ScenarioBuildResult {
  baselineScenarioId: string | null;
  baselineDataflowId: string;
  header: ScenarioRunHeader;
  config: ScenarioRunConfig;
  resultsDC: ScenarioRunResultsDC[];
  resultsLanes: ScenarioRunResultsLane[];
  summary: ScenarioBuildSummary;
}

export interface ScenarioDefinition {
  scenarioId: string;
  scenarioName: string;
  region: 'US' | 'Canada';
  scenarioType: string;
  baselineScenarioId: string | null;
  dataflowId: string;
  selectedDcs: string[];
  suppressedDcs: string[];
  utilCap: number;
  leadTimeCap: number;
  costVsService: number;
  termsScope: string;
  footprintMode: string;
  levelLoad: boolean;
  bcvRuleSet: string;
  fuelSurchargeMode: string;
  fuelSurchargeOverride: number | null;
  notes: string;
  tags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Running' | 'Completed' | 'Reviewed' | 'Published' | 'Archived';
  lastRunBy?: string | null;
  lastRunAt?: string | null;
  lastRunExecutionId?: string | null;
}

export interface ScenarioRunSnapshot {
  scenarioId: string;
  header: ScenarioRunHeader;
  config: ScenarioRunConfig;
  resultsDC: ScenarioRunResultsDC[];
  resultsLanes: ScenarioRunResultsLane[];
  summary: ScenarioBuildSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioRunHistoryEntry {
  runId: string;
  scenarioId: string;
  scenarioName: string;
  dataflowId: string;
  executionId: string | null;
  status: 'Running' | 'Completed' | 'Failed';
  triggeredBy: string;
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number | null;
  message?: string | null;
}

export interface ScenarioTemplateOption {
  scenarioId: string;
  region: 'US' | 'Canada';
  scenarioName: string;
  dataflowId: string;
  entityScope: string;
  scenarioType: string;
  channelScopes: string[];
  termsScopes: string[];
  tags: string[];
  footprintMode: string;
  utilCap: number;
  levelLoad: boolean;
  leadTimeCap: number;
  excludeBeyondCap: boolean;
  costVsService: number;
  fuelSurchargeMode: string;
  fuelSurchargeOverride: number | null;
  accessorialFlags: string[];
  allowRelocationPrepaid: boolean;
  allowRelocationCollect: boolean;
  bcvRuleSet: string;
  allowManualOverride: boolean;
  availableDcs: string[];
  availableDcCapacity: Record<string, number>;
}

export interface ScenarioRepositoryRecord {
  definition: ScenarioDefinition;
  snapshot: ScenarioRunSnapshot | null;
  runHistory: ScenarioRunHistoryEntry[];
  overrides: ScenarioOverride[];
}
