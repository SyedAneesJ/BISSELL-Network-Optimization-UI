export type ScenarioEngineMode = 'sample' | 'dataflow';

export interface ScenarioLogicDocument {
  logicVersion: string;
  scenarioType: string;
  region: 'US' | 'Canada';
  baselineScenarioKey: string;
  baselineDataflowId: string;
  dataFlowId?: string | number | null;
  dataFlowName?: string | null;
  source: ScenarioEngineMode;
  sourceLabel: string;
  nodes: any[];
  edges: any[];
  inputDatasets: string[];
  outputDefinitions: string[];
  rankRules: string[];
  dcRules: {
    allowedDcs: string[];
    suppressedDcs: string[];
    sourceFilter: string | null;
  };
  warnings: string[];
  raw: any;
}

export interface ScenarioExecutionPlan {
  mode: ScenarioEngineMode;
  logicVersion: string;
  scenarioType: string;
  region: 'US' | 'Canada';
  baselineScenarioKey: string;
  baselineDataflowId: string;
  allowedDcs: string[];
  suppressedDcs: string[];
  inputDatasets: string[];
  outputDefinitions: string[];
  rankRules: string[];
  sourceLabel: string;
  nodeCount: number;
  edgeCount: number;
  warnings: string[];
}
