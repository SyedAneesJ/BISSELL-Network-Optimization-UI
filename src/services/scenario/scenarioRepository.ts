import {
  ScenarioDefinition,
  ScenarioRepositoryRecord,
  ScenarioRunHistoryEntry,
  ScenarioRunSnapshot,
} from './scenarioModels';
import { ScenarioOverride } from '@/data';

const SCENARIO_STORAGE_KEY = 'bissell-scenarios-v1';

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readRecords = (): ScenarioRepositoryRecord[] => {
  if (!isBrowser) return [];
  try {
    const stored = localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!stored) {
      console.log('[LocalStorage Scenario Read] No stored scenarios found in localStorage key:', SCENARIO_STORAGE_KEY);
      return [];
    }
    const parsed = JSON.parse(stored);
    const records = Array.isArray(parsed) ? parsed : [];
    console.log('[LocalStorage Scenario Read] Successfully loaded scenarios from localStorage:', {
      key: SCENARIO_STORAGE_KEY,
      recordCount: records.length,
      scenarioIds: records.map((r) => r?.definition?.scenarioId),
      laneCountsByScenario: records.reduce<Record<string, number>>((acc, r) => {
        if (r?.definition?.scenarioId) {
          acc[r.definition.scenarioId] = r.snapshot?.resultsLanes?.length || 0;
        }
        return acc;
      }, {}),
    });
    return records;
  } catch (error) {
    console.warn('[LocalStorage Scenario Read] Failed to parse scenario records from localStorage', error);
    return [];
  }
};

const writeRecords = (records: ScenarioRepositoryRecord[]) => {
  if (!isBrowser) return;
  try {
    const serialized = JSON.stringify(records.slice(0, 500));
    const sizeKb = (serialized.length / 1024).toFixed(1);
    localStorage.setItem(SCENARIO_STORAGE_KEY, serialized);
    console.log(`[LocalStorage Scenario Store] Saved ${records.length} scenario(s) to localStorage (${sizeKb} KB):`, {
      key: SCENARIO_STORAGE_KEY,
      scenarios: records.map((r) => ({
        id: r.definition.scenarioId,
        name: r.definition.scenarioName,
        laneCount: r.snapshot?.resultsLanes?.length || 0,
        dcCount: r.snapshot?.resultsDC?.length || 0,
      })),
    });
  } catch (error) {
    console.error('[LocalStorage Scenario Store] ERROR: Failed to write scenarios to localStorage (quota or serialization issue):', error);
  }
};

const cloneRecord = (record: ScenarioRepositoryRecord): ScenarioRepositoryRecord => ({
  definition: { ...record.definition, selectedDcs: [...record.definition.selectedDcs], suppressedDcs: [...record.definition.suppressedDcs], tags: [...record.definition.tags] },
  snapshot: record.snapshot
    ? {
        ...record.snapshot,
        header: { ...record.snapshot.header },
        config: { ...record.snapshot.config },
        resultsDC: record.snapshot.resultsDC.map((row) => ({ ...row })),
        resultsLanes: record.snapshot.resultsLanes.map((row) => ({ ...row })),
        summary: { ...record.snapshot.summary },
      }
    : null,
  runHistory: (record.runHistory || []).map((entry) => ({ ...entry })),
  overrides: (record.overrides || []).map((override) => ({ ...override })),
});

export const listScenarioRecords = (): ScenarioRepositoryRecord[] => readRecords().map(cloneRecord);

export const clearScenarioStorage = (): void => {
  if (!isBrowser) return;
  localStorage.removeItem(SCENARIO_STORAGE_KEY);
};

export const listScenarios = (): ScenarioDefinition[] =>
  listScenarioRecords().map((record) => ({ ...record.definition, selectedDcs: [...record.definition.selectedDcs], suppressedDcs: [...record.definition.suppressedDcs], tags: [...record.definition.tags] }));

export const getScenarioRecord = (scenarioId: string): ScenarioRepositoryRecord | null => {
  const record = readRecords().find((item) => item.definition.scenarioId === scenarioId);
  return record ? cloneRecord(record) : null;
};

export const getScenario = (scenarioId: string): ScenarioDefinition | null => {
  const record = getScenarioRecord(scenarioId);
  return record ? { ...record.definition, selectedDcs: [...record.definition.selectedDcs], suppressedDcs: [...record.definition.suppressedDcs], tags: [...record.definition.tags] } : null;
};

export const createScenario = (
  definition: ScenarioDefinition,
  snapshot: ScenarioRunSnapshot | null = null,
): ScenarioRepositoryRecord => saveScenarioRecord({ definition, snapshot, runHistory: [], overrides: [] });

export const saveScenarioRecord = (record: ScenarioRepositoryRecord): ScenarioRepositoryRecord => {
  const records = readRecords();
  const next = cloneRecord(record);
  const index = records.findIndex((item) => item.definition.scenarioId === next.definition.scenarioId);
  if (index >= 0) {
    records[index] = next;
  } else {
    records.unshift(next);
  }
  writeRecords(records);
  return cloneRecord(next);
};

export const updateScenarioRunHistory = (
  scenarioId: string,
  history: ScenarioRunHistoryEntry[],
): ScenarioRepositoryRecord | null => {
  const records = readRecords();
  const index = records.findIndex((item) => item.definition.scenarioId === scenarioId);
  if (index < 0) return null;
  records[index] = {
    ...records[index],
    runHistory: history.map((entry) => ({ ...entry })),
  };
  writeRecords(records);
  return cloneRecord(records[index]);
};

export const updateScenarioDefinition = (
  scenarioId: string,
  patch: Partial<ScenarioDefinition>,
): ScenarioRepositoryRecord | null => {
  const records = readRecords();
  const index = records.findIndex((item) => item.definition.scenarioId === scenarioId);
  if (index < 0) return null;
  const next = {
    ...records[index],
    definition: {
      ...records[index].definition,
      ...patch,
      selectedDcs: patch.selectedDcs ? [...patch.selectedDcs] : records[index].definition.selectedDcs,
      suppressedDcs: patch.suppressedDcs ? [...patch.suppressedDcs] : records[index].definition.suppressedDcs,
      tags: patch.tags ? [...patch.tags] : records[index].definition.tags,
    },
  };
  records[index] = cloneRecord(next);
  writeRecords(records);
  return cloneRecord(next);
};

export const updateScenarioSnapshot = (
  scenarioId: string,
  snapshot: ScenarioRunSnapshot | null,
): ScenarioRepositoryRecord | null => {
  const records = readRecords();
  const index = records.findIndex((item) => item.definition.scenarioId === scenarioId);
  if (index < 0) return null;
  records[index] = {
    ...records[index],
    snapshot: snapshot
      ? {
          ...snapshot,
          header: { ...snapshot.header },
          config: { ...snapshot.config },
          resultsDC: snapshot.resultsDC.map((row) => ({ ...row })),
          resultsLanes: snapshot.resultsLanes.map((row) => ({ ...row })),
          summary: { ...snapshot.summary },
        }
      : null,
  };
  writeRecords(records);
  return cloneRecord(records[index]);
};

export const saveScenarioDefinitionAndSnapshot = (
  definition: ScenarioDefinition,
  snapshot: ScenarioRunSnapshot | null,
): ScenarioRepositoryRecord => {
  const record: ScenarioRepositoryRecord = { definition, snapshot, runHistory: [], overrides: [] };
  return saveScenarioRecord(record);
};

export const updateScenarioOverrides = (
  scenarioId: string,
  overrides: ScenarioOverride[],
): ScenarioRepositoryRecord | null => {
  const records = readRecords();
  const index = records.findIndex((item) => item.definition.scenarioId === scenarioId);
  if (index < 0) return null;
  records[index] = {
    ...records[index],
    overrides: overrides.map((override) => ({ ...override })),
  };
  writeRecords(records);
  return cloneRecord(records[index]);
};

export const updateScenario = (
  scenarioId: string,
  patch: Partial<ScenarioDefinition>,
): ScenarioRepositoryRecord | null => updateScenarioDefinition(scenarioId, patch);

export const archiveScenario = (scenarioId: string, nowIso: string): ScenarioRepositoryRecord | null =>
  updateScenarioDefinition(scenarioId, { status: 'Archived', updatedAt: nowIso });

export const unarchiveScenario = (
  scenarioId: string,
  restoredStatus: ScenarioDefinition['status'],
  nowIso: string,
): ScenarioRepositoryRecord | null => updateScenarioDefinition(scenarioId, { status: restoredStatus, updatedAt: nowIso });

export const duplicateScenario = (
  sourceScenarioId: string,
  newScenarioId: string,
  nowIso: string,
): ScenarioRepositoryRecord | null => {
  const source = getScenarioRecord(sourceScenarioId);
  if (!source) return null;
  const cloned = cloneScenarioRecordWithNewId(source, newScenarioId, nowIso);
  return saveScenarioRecord(cloned);
};

export const deleteScenarioRecord = (scenarioId: string): boolean => {
  const records = readRecords();
  const next = records.filter((item) => item.definition.scenarioId !== scenarioId);
  if (next.length === records.length) return false;
  writeRecords(next);
  return true;
};

export const cloneScenarioRecordWithNewId = (
  source: ScenarioRepositoryRecord,
  newScenarioId: string,
  nowIso: string,
): ScenarioRepositoryRecord => {
  const snapshot = source.snapshot
    ? {
        ...source.snapshot,
        scenarioId: newScenarioId,
        header: {
          ...source.snapshot.header,
          ScenarioRunID: newScenarioId,
          CreatedAt: nowIso,
          LastUpdatedAt: nowIso,
          Status: 'Draft' as const,
          ApprovedBy: null,
          ApprovedAt: null,
          LastRunAt: null,
          LastRunBy: null,
          LastRunExecutionId: null,
        },
        config: {
          ...source.snapshot.config,
          ScenarioRunID: newScenarioId,
        },
        resultsDC: source.snapshot.resultsDC.map((row) => ({ ...row, ScenarioRunID: newScenarioId })),
        resultsLanes: source.snapshot.resultsLanes.map((row) => ({ ...row, ScenarioRunID: newScenarioId })),
        summary: { ...source.snapshot.summary },
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    : null;

  return {
    definition: {
      ...source.definition,
      scenarioId: newScenarioId,
      scenarioName: `${source.definition.scenarioName} (Copy)`,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'Draft',
      lastRunAt: null,
      lastRunBy: null,
      lastRunExecutionId: null,
    },
    snapshot,
    runHistory: [],
    overrides: source.overrides.map((override) => ({
      ...override,
      ScenarioRunID: newScenarioId,
      OverrideVersion: override.OverrideVersion,
      UpdatedAt: nowIso,
    })),
  };
};
