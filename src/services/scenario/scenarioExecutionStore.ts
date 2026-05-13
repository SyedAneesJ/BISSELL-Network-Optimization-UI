import type { ScenarioBuildResult, ScenarioRepositoryRecord } from './scenarioModels';

type ScenarioExecutionEntry = {
  scenarioId: string;
  createdAt: string;
  artifact: ScenarioBuildResult;
  record?: ScenarioRepositoryRecord | null;
};

const cache = new Map<string, ScenarioExecutionEntry>();

export const rememberScenarioExecution = (
  scenarioId: string,
  artifact: ScenarioBuildResult,
  record?: ScenarioRepositoryRecord | null,
): ScenarioExecutionEntry => {
  const entry: ScenarioExecutionEntry = {
    scenarioId,
    createdAt: new Date().toISOString(),
    artifact,
    record: record ? { ...record } : record ?? null,
  };
  cache.set(scenarioId, entry);
  return entry;
};

export const getScenarioExecution = (scenarioId: string): ScenarioExecutionEntry | null =>
  cache.get(scenarioId) || null;

export const clearScenarioExecution = (scenarioId: string): void => {
  cache.delete(scenarioId);
};

export const listScenarioExecutions = (): ScenarioExecutionEntry[] =>
  Array.from(cache.values());
