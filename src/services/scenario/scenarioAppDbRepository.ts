import {
  APPDB_COLLECTIONS,
  deleteCollectionDocumentsByField,
  listCollectionDocuments,
  upsertCollectionDocumentByField,
} from '@/services/domo';
import type { ScenarioRunResultsLane } from '@/data';
import { ScenarioRepositoryRecord } from './scenarioModels';
import { listScenarioRecords } from './scenarioRepository';

const APPDB_SCENARIO_KIND = 'scenario-record';
const APPDB_SCENARIO_LANE_KIND = 'scenario-lane-snapshot';
const MAX_LANE_CHUNK_BYTES = 900_000;

type ScenarioLaneSnapshotChunk = {
  id: string;
  kind: typeof APPDB_SCENARIO_LANE_KIND;
  scenarioId: string;
  scenarioName: string;
  chunkIndex: number;
  chunkCount: number;
  laneCount: number;
  payload: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  searchText: string;
};

const getTimestamp = (value: unknown): number => {
  const raw = String(value || '');
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneScenarioRepositoryRecord = (record: ScenarioRepositoryRecord): ScenarioRepositoryRecord => ({
  definition: {
    ...record.definition,
    selectedDcs: [...record.definition.selectedDcs],
    suppressedDcs: [...record.definition.suppressedDcs],
    tags: [...record.definition.tags],
  },
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

const buildSlimScenarioRecord = (record: ScenarioRepositoryRecord): Partial<ScenarioRepositoryRecord> => ({
  definition: {
    ...record.definition,
    selectedDcs: [...record.definition.selectedDcs],
    suppressedDcs: [...record.definition.suppressedDcs],
    tags: [...record.definition.tags],
  },
  snapshot: record.snapshot
    ? {
        ...record.snapshot,
        header: { ...record.snapshot.header },
        config: { ...record.snapshot.config },
        summary: { ...record.snapshot.summary },
        resultsDC: record.snapshot.resultsDC.map((row) => ({ ...row })),
        resultsLanes: [],
      }
    : null,
  runHistory: [],
  overrides: [],
});

const buildSearchText = (record: ScenarioRepositoryRecord): string =>
  [
    record.definition.scenarioId,
    record.definition.scenarioName,
    record.definition.region,
    record.definition.scenarioType,
    record.definition.status,
    record.definition.tags.join(' '),
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const buildLaneSearchText = (scenarioId: string, scenarioName: string): string =>
  `${scenarioId} ${scenarioName}`.replace(/\s+/g, ' ').trim().toLowerCase();

const laneIdentityKey = (lane: ScenarioRunResultsLane): string =>
  [
    lane.ScenarioRunID || '',
    lane.Dest3Zip || '',
    lane.Channel || '',
    lane.Terms || '',
    lane.DestState || '',
    lane.PartyName || lane.CustomerGroup || '',
    lane.ScenarioType || '',
  ].join('|');

const laneQualityScore = (lane: ScenarioRunResultsLane): number => {
  const assignedDc = String(lane.AssignedDC || lane.CostingWarehouse || lane.DefaultShipFrom || '').trim();
  const ranked1Dc = String(lane.RankedOption1DC || '').trim();
  const ranked1Cost = Number(lane.RankedOption1Cost ?? 0);
  const costPerUnit = Number(lane.CostPerUnit ?? lane.LaneCost ?? lane.TotalCost ?? 0);
  let score = 0;

  if (ranked1Dc) score += 10;
  if (Number(lane.RankedOption2Cost ?? 0) > 0) score += 5;
  if (Number(lane.RankedOption3Cost ?? 0) > 0) score += 3;
  if (String(lane.ChosenRank ?? '').trim()) score += 4;
  if (assignedDc && ranked1Dc && assignedDc === ranked1Dc) score += 20;
  if (costPerUnit > 0 && ranked1Cost > 0 && Math.abs(costPerUnit - ranked1Cost) < 0.01) score += 30;
  if (Number(lane.TotalCost ?? 0) > 0) score += 1;

  return score;
};

const canonicalizeLaneRows = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] => {
  const grouped = new Map<string, ScenarioRunResultsLane[]>();
  rows.forEach((row) => {
    const key = laneIdentityKey(row);
    const list = grouped.get(key) || [];
    list.push({ ...row });
    grouped.set(key, list);
  });

  return Array.from(grouped.values()).map((group) =>
    group.sort((a, b) => {
      const scoreDelta = laneQualityScore(b) - laneQualityScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      const cpuA = Number(a.CostPerUnit ?? a.LaneCost ?? a.TotalCost ?? 0);
      const cpuB = Number(b.CostPerUnit ?? b.LaneCost ?? b.TotalCost ?? 0);
      if (cpuA !== cpuB) return cpuA - cpuB;
      const costA = Number(a.TotalCost ?? a.LaneCost ?? 0);
      const costB = Number(b.TotalCost ?? b.LaneCost ?? 0);
      if (costA !== costB) return costA - costB;
      return String(a.AssignedDC || a.CostingWarehouse || a.DefaultShipFrom || '').localeCompare(
        String(b.AssignedDC || b.CostingWarehouse || b.DefaultShipFrom || ''),
      );
    })[0],
  );
};

const buildLaneChunks = (
  scenarioId: string,
  scenarioName: string,
  lanes: ScenarioRunResultsLane[],
): ScenarioLaneSnapshotChunk[] => {
  const chunks: ScenarioLaneSnapshotChunk[] = [];
  let currentRows: unknown[] = [];
  let currentBytes = 0;
  const nowIso = new Date().toISOString();
  const serializedRows = lanes.map((row) => ({ ...row }));

  const flush = () => {
    if (currentRows.length === 0) return;
    const chunkIndex = chunks.length;
    chunks.push({
      id: `${scenarioId}:${chunkIndex}`,
      kind: APPDB_SCENARIO_LANE_KIND,
      scenarioId,
      scenarioName,
      chunkIndex,
      chunkCount: 0,
      laneCount: currentRows.length,
      payload: JSON.stringify(currentRows),
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: '',
      searchText: buildLaneSearchText(scenarioId, scenarioName),
    });
    currentRows = [];
    currentBytes = 0;
  };

  serializedRows.forEach((row) => {
    const rowJson = JSON.stringify(row);
    const rowBytes = rowJson.length;
    if (currentRows.length > 0 && currentBytes + rowBytes > MAX_LANE_CHUNK_BYTES) {
      flush();
    }
    currentRows.push(row);
    currentBytes += rowBytes;
  });

  flush();
  chunks.forEach((chunk, index) => {
    chunk.chunkCount = chunks.length;
    chunk.chunkIndex = index;
  });
  return chunks;
};

const parseLaneChunkPayload = (payload: unknown): ScenarioRunResultsLane[] => {
  if (!payload) return [];
  let raw = payload;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
};

const parseLaneDocument = (doc: any): { scenarioId: string; scenarioName: string; chunkIndex: number; lanes: ScenarioRunResultsLane[] } | null => {
  const content = doc?.content || doc || {};
  if (content?.kind !== APPDB_SCENARIO_LANE_KIND) return null;
  const scenarioId = String(content?.scenarioId || content?.id || '').trim();
  if (!scenarioId) return null;
  const scenarioName = String(content?.scenarioName || '').trim();
  const chunkIndex = Number(content?.chunkIndex ?? 0);
  const lanes = parseLaneChunkPayload(content?.payload);
  return {
    scenarioId,
    scenarioName,
    chunkIndex: Number.isFinite(chunkIndex) ? chunkIndex : 0,
    lanes,
  };
};

export const loadScenarioLaneSnapshotsFromAppDb = async (scenarioId: string): Promise<ScenarioRunResultsLane[]> => {
  const normalizedScenarioId = String(scenarioId || '').trim();
  if (!normalizedScenarioId) return [];

  try {
    const laneDocuments = await listCollectionDocuments(APPDB_COLLECTIONS.customScenarioLanes);
    return laneDocuments
      .map(parseLaneDocument)
      .filter((laneDoc): laneDoc is NonNullable<ReturnType<typeof parseLaneDocument>> =>
        Boolean(laneDoc) && laneDoc.scenarioId === normalizedScenarioId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .flatMap((chunk) => chunk.lanes.map((row) => ({
        ...row,
        ScenarioRunID: normalizedScenarioId,
      })));
  } catch (error) {
    console.warn('[Scenario AppDB] Failed to load scenario lane snapshots', { scenarioId: normalizedScenarioId, error });
    return [];
  }
};

const parseRecordPayload = (payload: unknown): ScenarioRepositoryRecord | null => {
  if (!payload) return null;
  let raw = payload;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  const candidate = raw as Partial<ScenarioRepositoryRecord> | null;
  if (!candidate?.definition?.scenarioId) return null;

  return cloneScenarioRepositoryRecord({
    definition: candidate.definition as ScenarioRepositoryRecord['definition'],
    snapshot: candidate.snapshot ?? null,
    runHistory: Array.isArray(candidate.runHistory) ? candidate.runHistory : [],
    overrides: Array.isArray(candidate.overrides) ? candidate.overrides : [],
  });
};

const parseRecordFromDocument = (doc: any): ScenarioRepositoryRecord | null => {
  const content = doc?.content || doc || {};
  const payload = parseRecordPayload(content?.payload);
  if (payload) return payload;

  if (content?.definition?.scenarioId) {
    return cloneScenarioRepositoryRecord({
      definition: content.definition,
      snapshot: content.snapshot ?? null,
      runHistory: Array.isArray(content.runHistory) ? content.runHistory : [],
      overrides: Array.isArray(content.overrides) ? content.overrides : [],
    });
  }

  return null;
};

const mergeLaneSnapshots = (
  baseSnapshot: ScenarioRepositoryRecord['snapshot'],
  laneDocs: Array<{ scenarioId: string; scenarioName: string; chunkIndex: number; lanes: ScenarioRunResultsLane[] }>,
): ScenarioRepositoryRecord['snapshot'] => {
  if (!baseSnapshot) return baseSnapshot;
  const mergedLanes = canonicalizeLaneRows(
    laneDocs
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .flatMap((chunk) => chunk.lanes.map((row) => ({ ...row }))),
  );
  if (mergedLanes.length === 0) return baseSnapshot;
  return {
    ...baseSnapshot,
    resultsLanes: mergedLanes,
  };
};

export const upsertScenarioLaneSnapshotsToAppDb = async (record: ScenarioRepositoryRecord): Promise<void> => {
  if (!record.snapshot) {
    await deleteCollectionDocumentsByField(APPDB_COLLECTIONS.customScenarioLanes, 'scenarioId', record.definition.scenarioId);
    return;
  }

  const chunks = buildLaneChunks(
    record.definition.scenarioId,
    record.definition.scenarioName,
    record.snapshot.resultsLanes,
  );

  await deleteCollectionDocumentsByField(APPDB_COLLECTIONS.customScenarioLanes, 'scenarioId', record.definition.scenarioId);

  await Promise.all(chunks.map((chunk) => upsertCollectionDocumentByField(
    APPDB_COLLECTIONS.customScenarioLanes,
    'id',
    chunk.id,
    chunk,
  )));
};

export const deleteScenarioLaneSnapshotsFromAppDb = async (scenarioId: string): Promise<number> => {
  return deleteCollectionDocumentsByField(APPDB_COLLECTIONS.customScenarioLanes, 'scenarioId', scenarioId);
};

export const loadScenarioRecordsFromAppDb = async (): Promise<ScenarioRepositoryRecord[]> => {
  try {
    const [scenarioDocuments, laneDocuments, localRecords] = await Promise.all([
      listCollectionDocuments(APPDB_COLLECTIONS.customScenarios),
      listCollectionDocuments(APPDB_COLLECTIONS.customScenarioLanes),
      Promise.resolve(listScenarioRecords()),
    ]);
    const localByScenarioId = new Map(localRecords.map((record) => [record.definition.scenarioId, record]));
    const laneDocsByScenarioId = new Map<string, Array<{ scenarioId: string; scenarioName: string; chunkIndex: number; lanes: ScenarioRunResultsLane[] }>>();
    const latestByScenarioId = new Map<string, { record: ScenarioRepositoryRecord; timestamp: number }>();

    laneDocuments.forEach((doc: any) => {
      const laneDoc = parseLaneDocument(doc);
      if (!laneDoc) return;
      const list = laneDocsByScenarioId.get(laneDoc.scenarioId) || [];
      list.push(laneDoc);
      laneDocsByScenarioId.set(laneDoc.scenarioId, list);
    });

    scenarioDocuments.forEach((doc: any) => {
      const record = parseRecordFromDocument(doc);
      if (!record) return;
      const localRecord = localByScenarioId.get(record.definition.scenarioId);
      const laneDocs = laneDocsByScenarioId.get(record.definition.scenarioId) || [];
      const mergedSnapshot = mergeLaneSnapshots(
        record.snapshot && (record.snapshot.resultsDC.length > 0 || record.snapshot.resultsLanes.length > 0)
          ? record.snapshot
          : localRecord?.snapshot || record.snapshot,
        laneDocs.length > 0
          ? laneDocs
          : localRecord?.snapshot?.resultsLanes.length
            ? [{
                scenarioId: localRecord.definition.scenarioId,
                scenarioName: localRecord.definition.scenarioName,
                chunkIndex: 0,
                lanes: localRecord.snapshot?.resultsLanes || [],
              }]
            : [],
      );
      const mergedRecord = cloneScenarioRepositoryRecord({
        definition: {
          ...localRecord?.definition,
          ...record.definition,
          selectedDcs: [...record.definition.selectedDcs],
          suppressedDcs: [...record.definition.suppressedDcs],
          tags: [...record.definition.tags],
        },
        snapshot: mergedSnapshot,
        runHistory: record.runHistory.length > 0 ? record.runHistory : localRecord?.runHistory || [],
        overrides: record.overrides.length > 0 ? record.overrides : localRecord?.overrides || [],
      });

      const scenarioId = record.definition.scenarioId;
      const timestamp = Math.max(
        getTimestamp(doc?.updatedAt || doc?.content?.updatedAt),
        getTimestamp(mergedRecord.definition.updatedAt),
        getTimestamp(mergedRecord.snapshot?.updatedAt),
      );
      const existing = latestByScenarioId.get(scenarioId);
      if (!existing || timestamp >= existing.timestamp) {
        latestByScenarioId.set(scenarioId, { record: mergedRecord, timestamp });
      }
    });

    const records = Array.from(latestByScenarioId.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(({ record }) => cloneScenarioRepositoryRecord(record));

    return records;
  } catch (error) {
    console.warn('[Scenario AppDB] Failed to load scenario records', error);
    return [];
  }
};

export const upsertScenarioRecordToAppDb = async (record: ScenarioRepositoryRecord): Promise<void> => {
  const nowIso = new Date().toISOString();
  const scenarioId = record.definition.scenarioId;
  const slimRecord = buildSlimScenarioRecord(record);
  const content = {
    id: scenarioId,
    kind: APPDB_SCENARIO_KIND,
    scenarioId,
    scenarioName: record.definition.scenarioName,
    status: record.definition.status,
    region: record.definition.region,
    scenarioType: record.definition.scenarioType,
    ownerUserId: record.definition.createdBy || null,
    ownerUserName: record.definition.createdBy || null,
    ownerUserEmail: null,
    isPublished: String(record.definition.status === 'Published'),
    isArchived: String(record.definition.status === 'Archived'),
    payload: JSON.stringify(slimRecord),
    createdAt: record.definition.createdAt || record.snapshot?.createdAt || nowIso,
    updatedAt: record.definition.updatedAt || record.snapshot?.updatedAt || nowIso,
    deletedAt: '',
    searchText: buildSearchText(record),
  };

  await upsertCollectionDocumentByField(APPDB_COLLECTIONS.customScenarios, 'scenarioId', scenarioId, content);
};

export const deleteScenarioRecordFromAppDb = async (scenarioId: string): Promise<number> => {
  const [scenarioDeleted, laneDeleted] = await Promise.all([
    deleteCollectionDocumentsByField(APPDB_COLLECTIONS.customScenarios, 'scenarioId', scenarioId),
    deleteCollectionDocumentsByField(APPDB_COLLECTIONS.customScenarioLanes, 'scenarioId', scenarioId),
  ]);
  return scenarioDeleted + laneDeleted;
};

export const syncScenarioRecordsToAppDb = async (records: ScenarioRepositoryRecord[]): Promise<void> => {
  if (!records.length) return;
  await Promise.all(records.map((record) => Promise.all([
    upsertScenarioRecordToAppDb(record),
    upsertScenarioLaneSnapshotsToAppDb(record),
  ])));
};
