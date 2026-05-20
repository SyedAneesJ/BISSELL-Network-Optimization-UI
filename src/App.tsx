import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Home, ScenarioDetails, ComparisonDetails } from '@/pages';
import {
  NewScenarioSubmit,
  NewScenarioWizard,
  NewComparisonModal,
  NewComparisonSubmit,
  DataHealthModal,
  NotificationCenter,
} from '@/components';
import {
  ComparisonDetailDC,
  ComparisonDetailLane,
  ComparisonHeader,
  ScenarioOverride,
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
} from '@/data';
import {
  buildScenarioIdentityFromRows,
  buildScenarioHeaderFromRows,
  buildDataHealthSnapshotFromRows,
  buildDatasetOptionSets,
  DatasetOptionSets,
  loadBcvScenarioLaneDataset,
  fetchAllScenarioDatasets,
  loadDcCapacityDataset,
  loadScenarioLaneDataset,
  loadTacticalConsolidationScenarioLaneDataset,
  getEntityOrder,
  mapDcResultsFromRows,
  resolveRegistryItemFromMeta,
  triggerDataflow,
  checkDataflowStatus,
  sendCodeEngineEmail,
  DomoApi,
} from '@/services';
import type { DomoDcCapacityRow } from '@/services';
import {
  buildScenarioArtifacts as buildScenarioArtifactsLegacy,
  buildScenarioArtifactsWithLogic,
  buildScenarioRepositoryRecord,
  buildScenarioRepositoryRecordFromState,
  reconcileScenarioRepositoryRecordWithSuppressedDcs,
  createScenario as createScenarioRecord,
  listScenarioRecords,
  deleteScenarioRecord,
  deleteScenarioRecordFromAppDb,
  loadScenarioRecordsFromAppDb,
  syncScenarioRecordsToAppDb,
  upsertScenarioRecordToAppDb,
  upsertScenarioLaneSnapshotsToAppDb,
  ScenarioTemplateOption,
  type ScenarioBuildContext,
  type ScenarioRepositoryRecord,
} from '@/services/scenario';
import {
  getScenarioTypeAllowedDcs,
  resolveScenarioFamilyKey,
  normalizeScenarioTypeSpecificInput,
  resolveScenarioTypePolicy,
} from '@/services/scenario/scenarioTypeRules';
import {
  APPDB_COLLECTIONS,
  createCollectionDocument,
  deleteCollectionDocumentsByField,
  listCollectionDocuments,
  upsertCollectionDocumentByField,
} from '@/services/domo';
import { Toast } from '@/components/ui';
import { AppNotification, NotificationStatus } from '@/types/notifications';
import { ScenarioRunHistoryEntry } from '@/services/scenario';

type Page = 'home' | 'scenario' | 'comparison';

interface AppState {
  currentPage: Page;
  selectedScenarioId: string | null;
  selectedComparisonId: string | null;
}

interface ScenarioState {
  headers: ScenarioRunHeader[];
  configs: ScenarioRunConfig[];
  resultsDC: ScenarioRunResultsDC[];
  resultsLanes: ScenarioRunResultsLane[];
  overrides: ScenarioOverride[];
}

interface ComparisonState {
  headers: ComparisonHeader[];
  detailDC: ComparisonDetailDC[];
  detailLanes: ComparisonDetailLane[];
}

type ScenarioHistoryState = Record<string, ScenarioRunHistoryEntry[]>;

const EMPTY_SCENARIO_STATE: ScenarioState = {
  headers: [],
  configs: [],
  resultsDC: [],
  resultsLanes: [],
  overrides: [],
};

const EMPTY_COMPARISON_STATE: ComparisonState = {
  headers: [],
  detailDC: [],
  detailLanes: [],
};

const EMPTY_SCENARIO_HISTORY: ScenarioHistoryState = {};
const DEBUG_DOMO_MAPPING = import.meta.env.VITE_ENABLE_DATA_TRACE !== 'false';
const SCENARIO_RUN_MODE = String(import.meta.env.VITE_SCENARIO_RUN_MODE || 'live').trim().toLowerCase();
const IS_READONLY_SCENARIO_RUN_MODE = SCENARIO_RUN_MODE === 'readonly' || SCENARIO_RUN_MODE === 'paused';
const READONLY_SCENARIO_RUN_DELAY_MS = 3500;
const isActiveDcCapacity = (row: DomoDcCapacityRow) => row.IsActive && Boolean(String(row.DCName || '').trim());
const normalizeScenarioLookupKey = (value: string): string =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const cloneScenarioHeader = (header: ScenarioRunHeader): ScenarioRunHeader => ({
  ...header,
});

const cloneScenarioConfig = (config: ScenarioRunConfig): ScenarioRunConfig => ({
  ...config,
});

const cloneScenarioResultsDC = (rows: ScenarioRunResultsDC[]): ScenarioRunResultsDC[] =>
  rows.map((row) => ({ ...row }));

const cloneScenarioResultsLanes = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] =>
  rows.map((row) => ({ ...row }));

const scenarioLaneIdentityKey = (lane: ScenarioRunResultsLane): string =>
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
  const ranked2Dc = String(lane.RankedOption2DC || '').trim();
  const ranked3Dc = String(lane.RankedOption3DC || '').trim();
  const ranked1Cost = Number(lane.RankedOption1Cost ?? 0);
  const ranked2Cost = Number(lane.RankedOption2Cost ?? 0);
  const ranked3Cost = Number(lane.RankedOption3Cost ?? 0);
  const costPerUnit = Number(lane.CostPerUnit ?? lane.LaneCost ?? lane.TotalCost ?? 0);
  let score = 0;

  if (ranked1Dc) score += 10;
  if (ranked2Dc) score += 8;
  if (ranked3Dc) score += 6;
  if (ranked1Cost > 0) score += 10;
  if (ranked2Cost > 0) score += 8;
  if (ranked3Cost > 0) score += 6;
  if (String(lane.ChosenRank ?? '').trim()) score += 4;
  if (String(lane.CostRank ?? '').trim()) score += 2;
  if (assignedDc && ranked1Dc && assignedDc === ranked1Dc) score += 20;
  if (costPerUnit > 0 && ranked1Cost > 0 && Math.abs(costPerUnit - ranked1Cost) < 0.01) score += 30;
  if (Number(lane.TotalCost ?? 0) > 0) score += 1;

  return score;
};

const canonicalizeScenarioResultsLanes = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] => {
  const grouped = new Map<string, ScenarioRunResultsLane[]>();
  rows.forEach((row) => {
    const key = scenarioLaneIdentityKey(row);
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
      const daysA = Number(a.DeliveryDays ?? 0);
      const daysB = Number(b.DeliveryDays ?? 0);
      if (daysA !== daysB) return daysA - daysB;
      return String(a.AssignedDC || a.CostingWarehouse || a.DefaultShipFrom || '').localeCompare(
        String(b.AssignedDC || b.CostingWarehouse || b.DefaultShipFrom || ''),
      );
    })[0],
  );
};

const dedupeScenarioResultsLanes = (rows: ScenarioRunResultsLane[]): ScenarioRunResultsLane[] => {
  const seen = new Set<string>();
  const deduped: ScenarioRunResultsLane[] = [];
  rows.forEach((row) => {
    const key = scenarioLaneIdentityKey(row);
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push({ ...row });
  });
  return deduped;
};

const cloneDcCapacityRows = (rows: DomoDcCapacityRow[]): DomoDcCapacityRow[] =>
  rows.map((row) => ({ ...row }));

const mergeScenarioStateWithRecords = (
  base: ScenarioState,
  records: ScenarioRepositoryRecord[],
): ScenarioState => {
  if (records.length === 0) return base;

  const headers = new Map<string, ScenarioRunHeader>();
  const configs = new Map<string, ScenarioRunConfig>();
  const resultsDC = new Map<string, ScenarioRunResultsDC[]>();
  const resultsLanes = new Map<string, ScenarioRunResultsLane[]>();
  const freshLanesByScenarioId = new Map<string, ScenarioRunResultsLane[]>();

  base.headers.forEach((header) => {
    headers.set(header.ScenarioRunID, cloneScenarioHeader(header));
  });

  base.configs.forEach((config) => {
    configs.set(config.ScenarioRunID, cloneScenarioConfig(config));
  });

  base.resultsDC.forEach((row) => {
    if (!resultsDC.has(row.ScenarioRunID)) {
      resultsDC.set(
        row.ScenarioRunID,
        cloneScenarioResultsDC(base.resultsDC.filter((item) => item.ScenarioRunID === row.ScenarioRunID)),
      );
    }
  });

  base.resultsLanes.forEach((row) => {
    if (!resultsLanes.has(row.ScenarioRunID)) {
      resultsLanes.set(
        row.ScenarioRunID,
        canonicalizeScenarioResultsLanes(base.resultsLanes.filter((item) => item.ScenarioRunID === row.ScenarioRunID)),
      );
    }
  });
  base.resultsLanes.forEach((row) => {
    if (!freshLanesByScenarioId.has(row.ScenarioRunID)) {
      freshLanesByScenarioId.set(
        row.ScenarioRunID,
        cloneScenarioResultsLanes(base.resultsLanes.filter((item) => item.ScenarioRunID === row.ScenarioRunID)),
      );
    }
  });

  records.forEach((record) => {
    if (!record.snapshot) return;
    const scenarioId = record.definition.scenarioId;
    const existingHeader = headers.get(scenarioId);

    const hydratedHeader = existingHeader
      ? {
          ...existingHeader,
          Status: record.snapshot.header.Status || existingHeader.Status,
          CreatedBy: record.snapshot.header.CreatedBy || existingHeader.CreatedBy,
          CreatedAt: record.snapshot.header.CreatedAt || existingHeader.CreatedAt,
          LastUpdatedAt: record.snapshot.header.LastUpdatedAt || existingHeader.LastUpdatedAt,
          LastRunBy: record.snapshot.header.LastRunBy ?? existingHeader.LastRunBy,
          LastRunAt: record.snapshot.header.LastRunAt ?? existingHeader.LastRunAt,
          LastRunExecutionId: record.snapshot.header.LastRunExecutionId ?? existingHeader.LastRunExecutionId,
          ApprovedBy: record.snapshot.header.ApprovedBy ?? existingHeader.ApprovedBy,
          ApprovedAt: record.snapshot.header.ApprovedAt ?? existingHeader.ApprovedAt,
          LatestComment: record.snapshot.header.LatestComment ?? existingHeader.LatestComment,
          Tags: record.snapshot.header.Tags ?? existingHeader.Tags,
        }
      : {
          ...cloneScenarioHeader(record.snapshot.header),
          DataflowID: record.snapshot.header.DataflowID || record.definition.dataflowId,
        };
    headers.set(scenarioId, hydratedHeader);
    configs.set(scenarioId, cloneScenarioConfig(record.snapshot.config));
    resultsDC.set(scenarioId, cloneScenarioResultsDC(record.snapshot.resultsDC));
    resultsLanes.set(
      scenarioId,
      freshLanesByScenarioId.get(scenarioId)?.length
        ? canonicalizeScenarioResultsLanes(freshLanesByScenarioId.get(scenarioId) || [])
        : canonicalizeScenarioResultsLanes(record.snapshot.resultsLanes.map(l => ({ ...l, ScenarioRunID: scenarioId }))),
    );
  });

  const overrides = [...base.overrides];
  records.forEach((record) => {
    const scenarioOverrides = record.overrides.map((override) => ({ ...override }));
    if (scenarioOverrides.length > 0) {
      overrides.push(...scenarioOverrides);
    }
  });

  return {
    headers: Array.from(headers.values()),
    configs: Array.from(configs.values()),
    resultsDC: Array.from(resultsDC.values()).flat(),
    resultsLanes: Array.from(resultsLanes.values()).flat(),
    overrides,
  };
};

const buildScenarioHistoryState = (records: ScenarioRepositoryRecord[]): ScenarioHistoryState =>
  records.reduce<ScenarioHistoryState>((acc, record) => {
    acc[record.definition.scenarioId] = record.runHistory.map((entry) => ({ ...entry }));
    return acc;
  }, {});

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

const DATAFLOW_POLL_INTERVAL_MS = 5000;
const DATAFLOW_MAX_POLL_ATTEMPTS = 360;
const DATAFLOW_MAX_CONSECUTIVE_POLL_ERRORS = 3;

type ToastKind = 'success' | 'error' | 'info';
interface AppToast {
  id: number;
  kind: ToastKind;
  message: string;
}

const parseAppDbPayload = <T,>(value: unknown): T | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
};

const docTimestamp = (doc: any): number => {
  const raw = String(doc?.updatedAt || doc?.createdAt || '');
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneComparisonState = (state: ComparisonState): ComparisonState => ({
  headers: state.headers.map((header) => ({ ...header })),
  detailDC: state.detailDC.map((row) => ({ ...row })),
  detailLanes: state.detailLanes.map((row) => ({ ...row })),
});

const cloneNotifications = (items: AppNotification[]): AppNotification[] =>
  items.map((item) => ({
    ...item,
    entity: item.entity ? { ...item.entity } : undefined,
    metadata: item.metadata ? { ...item.metadata } : undefined,
  }));

const resolveNotificationStatus = (notification: Partial<AppNotification> & { dismissedAt?: string | null }): NotificationStatus => {
  if (notification.status === 'Unread' || notification.status === 'Read' || notification.status === 'Dismissed') {
    return notification.status;
  }
  if (notification.dismissedAt) return 'Dismissed';
  if (notification.readAt) return 'Read';
  return 'Unread';
};

const normalizeNotificationPayload = (payload: any): AppNotification[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter(Boolean).map((item: any) => ({
      ...item,
      status: resolveNotificationStatus(item),
      entity: item?.entity ? { ...item.entity } : undefined,
      metadata: item?.metadata ? { ...item.metadata } : undefined,
    }));
  }
  return [{
    ...payload,
    status: resolveNotificationStatus(payload),
    entity: payload?.entity ? { ...payload.entity } : undefined,
    metadata: payload?.metadata ? { ...payload.metadata } : undefined,
  }];
};

const serializeComparisonRecord = (record: {
  header: ComparisonHeader;
  detailDC: ComparisonDetailDC[];
  detailLanes: ComparisonDetailLane[];
}) => JSON.stringify(record);

const serializeNotification = (notification: AppNotification) => JSON.stringify(notification);

const loadAppDbNotifications = async (
  userId: string | null,
  userEmail: string | null,
): Promise<AppNotification[] | null> => {
  const docs = await listCollectionDocuments(APPDB_COLLECTIONS.notifications);
  const visibleDocs = docs
    .map((doc: any) => doc?.content || doc)
    .filter(Boolean)
    .filter((doc: any) => {
      const ownerId = String(doc?.recipientUserId || '').trim();
      const ownerEmail = String(doc?.recipientUserEmail || '').trim();
      return (userId && ownerId && ownerId === userId) || (userEmail && ownerEmail && ownerEmail === userEmail);
    })
    .sort((a: any, b: any) => docTimestamp(b) - docTimestamp(a));

  const latestByNotificationId = new Map<string, AppNotification | null>();

  visibleDocs.forEach((doc: any) => {
    const rawPayload = parseAppDbPayload<any>(doc.payload);
    const payloadItems = normalizeNotificationPayload(rawPayload);

    payloadItems.forEach((item: AppNotification & { deletedAt?: string }) => {
      const notificationId = String(item.id || doc.notificationId || doc.id || '').trim();
      if (!notificationId || latestByNotificationId.has(notificationId)) return;
      const mergedNotification = {
        ...doc,
        ...item,
        id: notificationId,
      } as AppNotification & { deletedAt?: string };
      mergedNotification.status = resolveNotificationStatus({
        ...doc,
        ...item,
        id: notificationId,
      });
      const isDismissed =
        mergedNotification.status === 'Dismissed' ||
        item.deletedAt ||
        item.dismissedAt ||
        String((doc as any)?.deletedAt || '').trim() ||
        String((doc as any)?.dismissedAt || '').trim();
      if (isDismissed) {
        latestByNotificationId.set(notificationId, null);
        return;
      }
      latestByNotificationId.set(notificationId, {
        ...mergedNotification,
      });
    });
  });

  const notifications = Array.from(latestByNotificationId.values()).filter(Boolean) as AppNotification[];
  if (notifications.length === 0) return null;

  return notifications.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
};

const loadAppDbComparisonState = async (
  userId: string | null,
  userEmail: string | null,
): Promise<ComparisonState | null> => {
  const docs = await listCollectionDocuments(APPDB_COLLECTIONS.comparisons);
  const mappedDocs = docs
    .map((doc: any) => doc?.content || doc)
    .filter(Boolean);

  const filteredDocs: Array<{ comparisonId: string; reason: string }> = [];
  const visibleDocs = mappedDocs.filter((doc: any) => {
    const comparisonId = String(doc?.comparisonId || doc?.id || '').trim();
    const ownerId = String(doc?.ownerUserId || '').trim();
    const ownerEmail = String(doc?.ownerUserEmail || '').trim();
    const isPublishedFlag = String(doc?.isPublished || '').trim().toLowerCase();
    const isPublished = String(doc?.status || '').trim() === 'Published' || isPublishedFlag === 'true';
    const isOwner = (userId && ownerId && ownerId === userId) || (userEmail && ownerEmail && ownerEmail === userEmail);

    if (isPublished || isOwner) return true;
    filteredDocs.push({
      comparisonId,
      reason: `hidden (status=${String(doc?.status || 'NA')}, owner=${ownerId || ownerEmail || 'NA'})`,
    });
    return false;
  });

  if (visibleDocs.length === 0) return null;

  const latestByComparisonId = new Map<string, any>();
  visibleDocs
    .sort((a: any, b: any) => docTimestamp(b) - docTimestamp(a))
    .forEach((doc: any) => {
      const comparisonId = String(doc?.comparisonId || doc?.id || '').trim();
      if (!comparisonId || latestByComparisonId.has(comparisonId)) return;
      const rawPayload = parseAppDbPayload<any>(doc.payload);
      if (rawPayload?.deletedAt || String(doc?.deletedAt || '').trim() !== '') return;
      latestByComparisonId.set(comparisonId, doc);
    });

  if (DEBUG_DOMO_MAPPING) {
    console.groupCollapsed('[AppDB] comparison hydration');
    console.log('collection', APPDB_COLLECTIONS.comparisons);
    console.log('user', { userId, userEmail });
    console.table(
      docs.map((doc: any) => ({
        appDbId: doc?.id || '',
        comparisonId: String(doc?.content?.comparisonId || doc?.content?.id || '').trim(),
        status: String(doc?.content?.status || '').trim(),
        isPublished: String(doc?.content?.isPublished || '').trim(),
        ownerUserId: String(doc?.content?.ownerUserId || '').trim(),
        ownerUserEmail: String(doc?.content?.ownerUserEmail || '').trim(),
        updatedOn: String(doc?.updatedOn || '').trim(),
      }))
    );
    console.table(
      Array.from(latestByComparisonId.values()).map((doc: any) => ({
        comparisonId: String(doc?.comparisonId || doc?.id || '').trim(),
        status: String(doc?.status || '').trim(),
        ownerUserId: String(doc?.ownerUserId || '').trim(),
        ownerUserEmail: String(doc?.ownerUserEmail || '').trim(),
      }))
    );
    if (filteredDocs.length > 0) {
      console.table(filteredDocs);
    }
    console.groupEnd();
  }

  const headers: ComparisonHeader[] = [];
  const detailDC: ComparisonDetailDC[] = [];
  const detailLanes: ComparisonDetailLane[] = [];

  latestByComparisonId.forEach((doc) => {
    const payload = parseAppDbPayload<{ header?: ComparisonHeader; detailDC?: ComparisonDetailDC[]; detailLanes?: ComparisonDetailLane[] }>(doc.payload);
    if (!payload?.header) return;
    headers.push({ ...payload.header });
    if (Array.isArray(payload.detailDC)) {
      detailDC.push(...payload.detailDC.map((row) => ({ ...row })));
    }
    if (Array.isArray(payload.detailLanes)) {
      detailLanes.push(...payload.detailLanes.map((row) => ({ ...row })));
    }
  });

  return {
    headers,
    detailDC,
    detailLanes,
  };
};

const persistAppDbNotifications = async (
  userId: string | null,
  userEmail: string | null,
  previousNotifications: AppNotification[],
  notifications: AppNotification[],
) => {
  if (!userId && !userEmail) return;
  const nowIso = new Date().toISOString();
  const previousById = new Map(previousNotifications.map((item) => [item.id, item]));
  const nextById = new Map(notifications.map((item) => [item.id, item]));

  const writes = notifications.map((notification) => {
    const previous = previousById.get(notification.id);
    if (previous && serializeNotification(previous) === serializeNotification(notification)) return Promise.resolve();
    return upsertCollectionDocumentByField(
      APPDB_COLLECTIONS.notifications,
      'notificationId',
      notification.id,
      {
        id: notification.id,
        notificationId: notification.id,
        kind: 'notification-record',
        recipientUserId: userId || null,
        recipientUserEmail: userEmail || null,
        status: notification.status || resolveNotificationStatus(notification),
        payload: JSON.stringify(notification),
        createdAt: previous?.createdAt || nowIso,
        updatedAt: nowIso,
      },
    );
  });

  previousById.forEach((previous, notificationId) => {
    if (nextById.has(notificationId)) return;
    writes.push(
      upsertCollectionDocumentByField(
        APPDB_COLLECTIONS.notifications,
        'notificationId',
        notificationId,
        {
          id: notificationId,
          notificationId,
          kind: 'notification-record',
          recipientUserId: userId || null,
          recipientUserEmail: userEmail || null,
          status: 'Dismissed',
          payload: JSON.stringify({
            ...previous,
            status: 'Dismissed',
            dismissedAt: nowIso,
          }),
          createdAt: previous?.createdAt || nowIso,
          updatedAt: nowIso,
        },
      ),
    );
  });

  await Promise.all(writes);
};

const persistAppDbComparisonState = async (
  userId: string | null,
  userName: string,
  userEmail: string | null,
  previousComparisonState: ComparisonState,
  comparisonState: ComparisonState,
) => {
  if (!userId && !userEmail) return;
  const nowIso = new Date().toISOString();
  const previousById = new Map(previousComparisonState.headers.map((header) => [header.ComparisonID, header]));
  const nextById = new Map(comparisonState.headers.map((header) => [header.ComparisonID, header]));
  const writes: Promise<any>[] = [];

  nextById.forEach((header, comparisonId) => {
    const payload = {
      header,
      detailDC: comparisonState.detailDC.filter((row) => row.ComparisonID === comparisonId).map((row) => ({ ...row })),
      detailLanes: comparisonState.detailLanes.filter((row) => row.ComparisonID === comparisonId).map((row) => ({ ...row })),
    };
    const previousHeader = previousById.get(comparisonId);
    const previousPayload = previousHeader
      ? {
          header: previousHeader,
          detailDC: previousComparisonState.detailDC.filter((row) => row.ComparisonID === comparisonId).map((row) => ({ ...row })),
          detailLanes: previousComparisonState.detailLanes.filter((row) => row.ComparisonID === comparisonId).map((row) => ({ ...row })),
        }
      : null;

    if (previousPayload && serializeComparisonRecord(previousPayload) === serializeComparisonRecord(payload)) return;

    writes.push(
      upsertCollectionDocumentByField(
        APPDB_COLLECTIONS.comparisons,
        'comparisonId',
        comparisonId,
        {
          id: comparisonId,
          kind: 'comparison-record',
          comparisonId,
          ownerUserId: userId || null,
          ownerUserName: userName,
          ownerUserEmail: userEmail || null,
          status: header.Status,
          isPublished: String(header.Status === 'Published'),
          payload: JSON.stringify(payload),
          createdAt: nowIso,
          updatedAt: nowIso,
        },
      ),
    );
  });

  if (writes.length === 0) return;
  await Promise.all(writes);
};

function App() {
  const [workspace, setWorkspace] = useState<'All' | 'US' | 'Canada'>('US');
  const [scenarioState, setScenarioState] = useState<ScenarioState>(EMPTY_SCENARIO_STATE);
  const [scenarioHistoryState, setScenarioHistoryState] = useState<ScenarioHistoryState>(EMPTY_SCENARIO_HISTORY);
  const [comparisonState, setComparisonState] = useState<ComparisonState>(EMPTY_COMPARISON_STATE);
  const [domoDcLoaded, setDomoDcLoaded] = useState(false);
  const [dataHealthSnapshot, setDataHealthSnapshot] = useState(() => buildDataHealthSnapshotFromRows([]));
  const [rawScenarioLaneRows, setRawScenarioLaneRows] = useState<ScenarioRunResultsLane[]>([]);
  const [preselectedRuns, setPreselectedRuns] = useState<{ a?: string; b?: string }>({});
  const [archivedScenarioPrevStatus, setArchivedScenarioPrevStatus] = useState<Record<string, ScenarioRunHeader['Status']>>({});
  const [archivedComparisonPrevStatus, setArchivedComparisonPrevStatus] = useState<Record<string, ComparisonHeader['Status']>>({});
  const [appState, setAppState] = useState<AppState>({
    currentPage: 'home',
    selectedScenarioId: null,
    selectedComparisonId: null,
  });

  const [showNewScenario, setShowNewScenario] = useState(false);
  const [showNewComparison, setShowNewComparison] = useState(false);
  const [showDataHealth, setShowDataHealth] = useState(false);
  const [uiBusyMessage, setUiBusyMessage] = useState<string | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState('You');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [testEmailActive, setTestEmailActive] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [comparisonsRefreshActive, setComparisonsRefreshActive] = useState(false);
  const [notificationsRefreshActive, setNotificationsRefreshActive] = useState(false);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Record<number, number>>({});
  const activeScenarioRunsRef = useRef<Set<string>>(new Set());
  const pollingTimersRef = useRef<Record<string, number>>({});
  const readonlyRunTimersRef = useRef<Record<string, number>>({});
  const persistenceHydratedRef = useRef(false);
  const scenarioRepositoryRecordsRef = useRef<ScenarioRepositoryRecord[]>([]);
  const scenarioPersistenceSourceRef = useRef<'AppDB' | 'localStorage' | 'unknown'>('unknown');
  const lastPersistedComparisonStateRef = useRef<ComparisonState>(EMPTY_COMPARISON_STATE);
  const lastPersistedNotificationsRef = useRef<AppNotification[]>([]);

  const setScenarioRepositoryCache = useCallback(
    (records: ScenarioRepositoryRecord[], source: 'AppDB' | 'localStorage' | 'unknown') => {
      scenarioRepositoryRecordsRef.current = records.map((record) => cloneScenarioRepositoryRecord(record));
      scenarioPersistenceSourceRef.current = source;
    },
    [],
  );

  const getScenarioRecordFromCache = useCallback((scenarioId: string): ScenarioRepositoryRecord | null => {
    const record = scenarioRepositoryRecordsRef.current.find((item) => item.definition.scenarioId === scenarioId);
    return record ? cloneScenarioRepositoryRecord(record) : null;
  }, []);

  const persistScenarioRecordToPrimaryStore = useCallback(async (record: ScenarioRepositoryRecord): Promise<void> => {
    const next = cloneScenarioRepositoryRecord(record);
    const index = scenarioRepositoryRecordsRef.current.findIndex(
      (item) => item.definition.scenarioId === next.definition.scenarioId,
    );
    if (index >= 0) {
      scenarioRepositoryRecordsRef.current[index] = next;
    } else {
      scenarioRepositoryRecordsRef.current.unshift(next);
    }

    if (scenarioPersistenceSourceRef.current === 'AppDB') {
      await upsertScenarioRecordToAppDb(next);
      await upsertScenarioLaneSnapshotsToAppDb(next);
      return;
    }

    createScenarioRecord(next.definition, next.snapshot);
  }, []);

  const deleteScenarioRecordFromPrimaryStore = useCallback(async (scenarioId: string): Promise<boolean> => {
    scenarioRepositoryRecordsRef.current = scenarioRepositoryRecordsRef.current.filter(
      (item) => item.definition.scenarioId !== scenarioId,
    );

    if (scenarioPersistenceSourceRef.current === 'AppDB') {
      const deletedCount = await deleteScenarioRecordFromAppDb(scenarioId);
      return deletedCount > 0;
    }

    return deleteScenarioRecord(scenarioId);
  }, []);

  const [datasetOptions, setDatasetOptions] = useState<DatasetOptionSets>(() => ({
    scenarioTypes: [],
    channelScopes: [],
    termsScopes: [],
    tags: [],
    footprintModes: [],
    utilCaps: [],
    levelLoadModes: [],
    leadTimeCaps: [],
    excludeBeyondCap: [],
    costVsServiceWeights: [],
    fuelSurchargeModes: [],
    accessorialFlags: [],
    allowRelocationPrepaid: [],
    allowRelocationCollect: [],
    bcvRuleSets: [],
    allowManualOverride: [],
  }));
  const [dcCapacityRows, setDcCapacityRows] = useState<DomoDcCapacityRow[]>([]);
  useEffect(() => {
    console.log('[App Mode] scenarioRunMode=', SCENARIO_RUN_MODE);
    console.log('[App Mode] readonlyScenarioRuns=', IS_READONLY_SCENARIO_RUN_MODE);
  }, []);

  const datasetContext = useMemo(() => {
    const regions = Array.from(new Set(scenarioState.headers.map((h) => h.Region))) as Array<'US' | 'Canada'>;
    const entities = new Set<string>();
    scenarioState.headers.forEach((h) => {
      h.EntityScope?.split('/').forEach((e) => {
        const trimmed = e.trim();
        if (trimmed) entities.add(trimmed);
      });
    });
    const activeCapacityRows = dcCapacityRows.filter(isActiveDcCapacity);
    const dcsByRegion: Record<string, string[]> = {
      All: activeCapacityRows.map((row) => row.DCName),
    };
    const dcCapacityByName = activeCapacityRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.DCName] = row.Sqft;
      return acc;
    }, {});

    if (dcsByRegion.All.length === 0) {
      scenarioState.resultsDC.forEach((dc) => {
        if (!dcsByRegion.All.includes(dc.DCName) && dc.IsSuppressed === 'N') {
          dcsByRegion.All.push(dc.DCName);
        }
        if (dcCapacityByName[dc.DCName] === undefined) {
          dcCapacityByName[dc.DCName] = dc.SpaceRequired;
        }
      });
    }

    const scenarioTypes = datasetOptions.scenarioTypes.length > 0
      ? datasetOptions.scenarioTypes
      : Array.from(new Set(scenarioState.headers.map((h) => h.ScenarioType).filter(Boolean)));

    const missingDataReasons: string[] = [];
    if (scenarioState.configs.length === 0) missingDataReasons.push('Scenario configuration');
    if (scenarioState.resultsLanes.length === 0) missingDataReasons.push('Lane results');
    if (scenarioState.overrides.length === 0) missingDataReasons.push('Overrides');

    return {
      regions: regions.length > 0 ? regions : (['US'] as Array<'US' | 'Canada'>),
      entities: Array.from(entities),
      dcsByRegion,
      dcCapacityByName,
      scenarioTypes,
      missingDataReasons,
    };
  }, [scenarioState, datasetOptions, dcCapacityRows]);

  const lanesByScenarioId = useMemo<Record<string, ScenarioRunResultsLane[]>>(() => {
    return rawScenarioLaneRows.reduce<Record<string, ScenarioRunResultsLane[]>>((acc, lane) => {
      if (!acc[lane.ScenarioRunID]) {
        acc[lane.ScenarioRunID] = [];
      }
      acc[lane.ScenarioRunID].push(lane);
      return acc;
    }, {});
  }, [rawScenarioLaneRows]);

  const scenarioTemplatesByRegion = useMemo<Record<'US' | 'Canada', ScenarioTemplateOption[]>>(() => {
    const isOriginalScenarioHeader = (header: ScenarioRunHeader) =>
      !String(header.CreatedBy || '').trim() || String(header.CreatedBy || '').trim() === 'NA';
    const normalizeText = (value: unknown): string => String(value || '').trim().toLowerCase();
    const baseUsDcs = ['Elwood', 'Dallas', 'Los Angeles', 'R Virginia'];
    const bcvDcs = [...baseUsDcs, 'Pharr TX'];
    const tacticalConsolidationDcs = [...baseUsDcs, 'Pharr TX', 'Stratford CT'];
    const collectRelocatableScenarioType = 'Tactical Pro Forma (Collect Relocatable)';
    const collectRelocatableScenarioName = 'Tactical Pro Forma - Fixed Footprint (Collect Relocatable)';
    const strategicCollectRelocatableScenarioType = 'Strategic Pro Forma (Collect Relocatable)';
    const strategicCollectRelocatableScenarioName = 'Strategic Pro Forma - Unconstrained Footprint (Collect Relocatable)';

    const getScenarioDcScope = (scenarioType: string): string[] => {
      const normalized = normalizeText(scenarioType);
      if (normalized.includes('collect relocatable')) {
        return baseUsDcs;
      }
      if (normalized.includes('tactical consolidation') || normalized.includes('consolidation tactical')) {
        return tacticalConsolidationDcs;
      }
      if (normalized.includes('consolidation strategic unconstrained')) {
        return tacticalConsolidationDcs;
      }
      if (normalized.includes('bcv ingestion')) {
        return bcvDcs;
      }
      return baseUsDcs;
    };

    const buildTemplate = (header: ScenarioRunHeader): ScenarioTemplateOption | null => {
      if (!isOriginalScenarioHeader(header)) return null;
      const dcRows = scenarioState.resultsDC.filter((row) => row.ScenarioRunID === header.ScenarioRunID);
      const config = scenarioState.configs.find((item) => item.ScenarioRunID === header.ScenarioRunID);
      if (dcRows.length === 0 && !config) return null;
      if (!header.DataflowID) return null;
      const accessorialFlags = config?.AccessorialFlags
        ? config.AccessorialFlags.split(',').map((flag) => flag.trim()).filter(Boolean)
        : header.Tags.split(',').map((tag) => tag.trim()).filter(Boolean);

      const allowedDcScope = new Set(getScenarioDcScope(header.ScenarioType).map(normalizeText));
      const activeCapacityRows = dcCapacityRows.filter((row) =>
        isActiveDcCapacity(row) && allowedDcScope.has(normalizeText(row.DCName))
      );
      const availableDcCapacity = activeCapacityRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.DCName] = row.Sqft;
        return acc;
      }, {});
      let availableDcs = Object.keys(availableDcCapacity);
      if (availableDcs.length === 0) {
        Array.from(new Set(dcRows.map((row) => row.DCName).filter(Boolean))).forEach((dcName) => {
          availableDcCapacity[dcName] = dcRows.find((row) => row.DCName === dcName)?.SpaceRequired || 0;
        });
        availableDcs = Object.keys(availableDcCapacity);
      }

      return {
        scenarioId: header.ScenarioRunID,
        region: header.Region,
        scenarioName: header.RunName,
        dataflowId: header.DataflowID,
        entityScope: header.EntityScope || 'NA',
        scenarioType: header.ScenarioType,
        channelScopes: header.ChannelScope ? header.ChannelScope.split(',').map((item) => item.trim()).filter(Boolean) : [],
        termsScopes: header.TermsScope ? header.TermsScope.split(',').map((item) => item.trim()).filter(Boolean) : [],
        tags: header.Tags ? header.Tags.split(',').map((item) => item.trim()).filter(Boolean) : [],
        footprintMode: header.FootprintMode || config?.FootprintMode || 'NA',
        utilCap: config?.UtilCapPct ?? (typeof header.UtilizationCap === 'number' ? header.UtilizationCap : Number(String(header.UtilizationCap ?? '').replace(/[^0-9.-]/g, '')) || 0),
        levelLoad: (header.LevelLoad || config?.LevelLoadMode) === 'On',
        leadTimeCap: config?.LeadTimeCapDays ?? 0,
        excludeBeyondCap: false,
        costVsService: config?.CostVsServiceWeight ?? 0,
        fuelSurchargeMode: config?.FuelSurchargeMode || 'NA',
        fuelSurchargeOverride: config?.FuelSurchargeOverridePct ?? null,
        accessorialFlags,
        allowRelocationPrepaid: config?.AllowRelocationPrepaid === 'Y',
        allowRelocationCollect: config?.AllowRelocationCollect === 'Y',
        bcvRuleSet: config?.BCVRuleSet || 'NA',
        allowManualOverride: false,
        availableDcs,
        availableDcCapacity,
      };
    };

    const grouped: Record<'US' | 'Canada', ScenarioTemplateOption[]> = {
      US: [],
      Canada: [],
    };

    scenarioState.headers.forEach((header) => {
      const template = buildTemplate(header);
      if (template) grouped[header.Region].push(template);
    });

    const sortTemplates = (items: ScenarioTemplateOption[]) =>
      [...items].sort((a, b) => {
        const dataflowDiff = Number(a.dataflowId || Number.MAX_SAFE_INTEGER) - Number(b.dataflowId || Number.MAX_SAFE_INTEGER);
        if (dataflowDiff !== 0) return dataflowDiff;
        return a.scenarioName.localeCompare(b.scenarioName);
      });

    const tacticalFixedTemplate = grouped.US.find((template) =>
      resolveScenarioTypePolicy(template.scenarioType).scenarioType === 'Tactical Pro Forma'
    ) || null;
    if (tacticalFixedTemplate) {
      grouped.US.push({
        ...tacticalFixedTemplate,
        baselineScenarioId: tacticalFixedTemplate.scenarioId,
        scenarioId: `${tacticalFixedTemplate.scenarioId}__collect_relo`,
        scenarioName: collectRelocatableScenarioName,
        scenarioType: collectRelocatableScenarioType,
        allowRelocationCollect: true,
        allowRelocationPrepaid: true,
      });
    }

    const strategicFixedTemplate = grouped.US.find((template) =>
      resolveScenarioTypePolicy(template.scenarioType).scenarioType === 'Strategic Pro Forma'
    ) || null;
    if (strategicFixedTemplate) {
      grouped.US.push({
        ...strategicFixedTemplate,
        baselineScenarioId: strategicFixedTemplate.scenarioId,
        scenarioId: `${strategicFixedTemplate.scenarioId}__collect_relo`,
        scenarioName: strategicCollectRelocatableScenarioName,
        scenarioType: strategicCollectRelocatableScenarioType,
        allowRelocationCollect: true,
        allowRelocationPrepaid: true,
      });
    }

    return {
      US: sortTemplates(grouped.US),
      Canada: sortTemplates(grouped.Canada),
    };
  }, [scenarioState.headers, scenarioState.configs, scenarioState.resultsDC, dcCapacityRows]);

  const navigateToHome = () => {
    setAppState({
      currentPage: 'home',
      selectedScenarioId: null,
      selectedComparisonId: null,
    });
  };

  const navigateToScenario = (scenarioId: string) => {
    setAppState({
      currentPage: 'scenario',
      selectedScenarioId: scenarioId,
      selectedComparisonId: null,
    });
  };

  const navigateToComparison = (comparisonId: string) => {
    setAppState({
      currentPage: 'comparison',
      selectedScenarioId: null,
      selectedComparisonId: comparisonId,
    });
  };

  const handleNewScenario = () => {
    setShowNewScenario(true);
  };

  const handleNewComparison = (preselectedA?: string, preselectedB?: string) => {
    setPreselectedRuns({ a: preselectedA, b: preselectedB });
    setShowNewComparison(true);
  };

  const handleDataHealth = () => {
    setShowDataHealth(true);
  };

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = toastTimersRef.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete toastTimersRef.current[id];
    }
  }, []);

  const pushToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    toastTimersRef.current[id] = window.setTimeout(() => {
      dismissToast(id);
    }, 10000);
  }, [dismissToast]);

  const pushNotification = useCallback((
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'readAt' | 'status'>
  ) => {
    const id = `notif-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    setNotifications((prev) => [
      {
        id,
        createdAt,
        readAt: null,
        status: 'Unread',
        ...notification,
      },
      ...prev,
    ]);
    return id;
  }, []);

  const updateNotification = useCallback((id: string, patch: Partial<AppNotification>) => {
    setNotifications((prev) => prev.map((item) => (
      item.id === id
        ? {
            ...item,
            ...patch,
            status: patch.status || resolveNotificationStatus({ ...item, ...patch }),
          }
        : item
    )));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    updateNotification(id, { readAt: new Date().toISOString(), status: 'Read' });
  }, [updateNotification]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearPollingForScenario = useCallback((scenarioId: string) => {
    const timer = pollingTimersRef.current[scenarioId];
    if (timer) {
      window.clearTimeout(timer);
      delete pollingTimersRef.current[scenarioId];
    }
    activeScenarioRunsRef.current.delete(scenarioId);
  }, []);

  const unreadNotificationCount = notifications.filter((notification) => notification.status === 'Unread').length;

  const loadDomoDc = useCallback(async () => {
    try {
      const datasetResults = await fetchAllScenarioDatasets();
      const dcCapacityDatasetRows = await loadDcCapacityDataset();
      const allRows = datasetResults.flatMap((result) => result.rows);

      console.log('Domo datasets loaded:', datasetResults.map((d) => ({
        datasetId: d.datasetId,
        scenarioKey: d.registryItem.scenarioKey,
        rows: d.rows.length,
      })));
      console.log('[Domo DC Capacity] loaded', {
        rows: dcCapacityDatasetRows.length,
        activeRows: dcCapacityDatasetRows.filter((row) => row.IsActive).length,
      });
      setDcCapacityRows(cloneDcCapacityRows(dcCapacityDatasetRows));

      const globalEntityOrder = allRows.length > 0 ? getEntityOrder(allRows) : [];
      const scenarioPayloads = allRows.length > 0 ? datasetResults.flatMap((datasetResult) => {
        const grouped = datasetResult.rows.reduce<Record<string, typeof datasetResult.rows>>((acc, row) => {
          const scenarioType = String(row['scenarioType'] ?? '').trim() || datasetResult.registryItem.scenarioLabel || 'Baseline';
          const region = String(row['dcRegion'] ?? row['DC_region'] ?? row['region'] ?? '').trim() || datasetResult.registryItem.regionDefault || 'US';
          const entity = String(row['entityScope'] ?? row['dcEntity'] ?? row['DC_entity'] ?? '').trim() || 'NA';
          const key = `${scenarioType}|${region}|${entity}`;
          acc[key] = acc[key] || [];
          acc[key].push(row);
          return acc;
        }, {});

        return Object.values(grouped).map((rows) => {
          const effectiveRegistryInfo = resolveRegistryItemFromMeta(
            datasetResult.registryItem,
            datasetResult.datasetMeta
          );
          const identity = buildScenarioIdentityFromRows(rows, effectiveRegistryInfo);
          const header = buildScenarioHeaderFromRows(
            rows,
            identity.scenarioId,
            globalEntityOrder,
            effectiveRegistryInfo
          );
          const dcResults = mapDcResultsFromRows(
            rows,
            identity.scenarioId,
            globalEntityOrder,
            effectiveRegistryInfo
          );

          if (DEBUG_DOMO_MAPPING) {
            const rawPreview = rows.slice(0, 5).map((row, index) => ({
              '#': index + 1,
              DC: String(row.DC ?? row.dc ?? row['DC Name'] ?? row['DCName'] ?? '').trim(),
              dcRegion: String(row.dcRegion ?? row.DC_region ?? row.region ?? '').trim(),
              dcEntity: String(row.dcEntity ?? row.DC_entity ?? row.entityScope ?? '').trim(),
              totalCost: row.totalCost ?? '',
              costPerUnit: row.costPerUnit ?? '',
              coreSpace: row.coreSpace ?? '',
              bcvSpace: row.bcvSpace ?? '',
              totalcount: row.totalcount ?? '',
              spaceRequired: row.spaceRequired ?? '',
              sqft: row.sqft ?? '',
              averageDeliveryDays: row.averageDeliveryDays ?? '',
              averageTransitDays: row.averageTransitDays ?? '',
              slaBreach: row.slaBreach ?? '',
              maxUtilizationPct: row['maxUtilization%'] ?? row['maxUtilization %'] ?? row.maxUtilization ?? '',
              scenarioType: row.scenarioType ?? '',
            }));

            const mappedPreview = dcResults.slice(0, 5).map((dc, index) => ({
              '#': index + 1,
              DCName: dc.DCName,
              TotalCost: dc.TotalCost,
              VolumeUnits: dc.VolumeUnits,
              AvgDays: dc.AvgDays,
              UtilPct: dc.UtilPct,
              SpaceRequired: dc.SpaceRequired,
              SpaceCore: dc.SpaceCore,
              SpaceBCV: dc.SpaceBCV,
              SLABreachCount: dc.SLABreachCount,
              ExcludedBySLACount: dc.ExcludedBySLACount,
              RankOverall: dc.RankOverall,
              IsSuppressed: dc.IsSuppressed,
            }));

            // console.groupCollapsed(
            //   `[Domo Mapping] ${effectiveRegistryInfo.scenarioLabel} / ${identity.region} / ${identity.scenarioType} / ${identity.entityScope} / ${identity.scenarioId}`
            // );
            // console.log('Dataset', {
            //   datasetId: datasetResult.datasetId,
            //   dataflowId: effectiveRegistryInfo.dataflowId,
            //   scenarioKey: effectiveRegistryInfo.scenarioKey,
            //   scenarioLabel: effectiveRegistryInfo.scenarioLabel,
            // });
            // console.table(rawPreview);
            // console.table(mappedPreview);
            // console.log('Derived header', {
            //   ScenarioRunID: header.ScenarioRunID,
            //   RunName: header.RunName,
            //   Region: header.Region,
            //   ScenarioType: header.ScenarioType,
            //   EntityScope: header.EntityScope,
            //   DataflowID: header.DataflowID,
            //   TotalCost: header.TotalCost,
            //   CostPerUnit: header.CostPerUnit,
            //   AvgDeliveryDays: header.AvgDeliveryDays,
            //   AvgTransitDays: header.AvgTransitDays,
            //   MaxUtilPct: header.MaxUtilPct,
            //   TotalSpaceRequired: header.TotalSpaceRequired,
            //   SpaceCore: header.SpaceCore,
            //   SpaceBCV: header.SpaceBCV,
            //   CollectTreatment: header.CollectTreatment,
            //   UtilizationCap: header.UtilizationCap,
            // });
            // console.groupEnd();
          }

          return { header, dcResults };
        });
      }) : [];

      const laneScenarioRunIdLookup = scenarioPayloads.reduce<Record<string, string>>((acc, payload) => {
        const header = payload.header;
        const scenarioTypeKey = normalizeScenarioLookupKey(header.ScenarioType);
        const runNameKey = normalizeScenarioLookupKey(header.RunName);
        const compositeKey = normalizeScenarioLookupKey([header.ScenarioType, header.RunName, header.Region, header.EntityScope].filter(Boolean).join('|'));
        if (scenarioTypeKey) acc[scenarioTypeKey] = header.ScenarioRunID;
        if (runNameKey) acc[runNameKey] = header.ScenarioRunID;
        if (compositeKey) acc[compositeKey] = header.ScenarioRunID;
        return acc;
      }, {});

      const [laneDatasetRows, bcvLaneDatasetRows, tacticalConsolidationLaneDatasetRows] = await Promise.all([
        loadScenarioLaneDataset(laneScenarioRunIdLookup),
        loadBcvScenarioLaneDataset(laneScenarioRunIdLookup),
        loadTacticalConsolidationScenarioLaneDataset(laneScenarioRunIdLookup),
      ]);
      const combinedLaneDatasetRows = [
        ...laneDatasetRows,
        ...bcvLaneDatasetRows,
        ...tacticalConsolidationLaneDatasetRows,
      ];
      console.log('[Domo Lanes] loaded for scenarios', {
        baselineLaneRows: laneDatasetRows.length,
        bcvLaneRows: bcvLaneDatasetRows.length,
        tacticalConsolidationLaneRows: tacticalConsolidationLaneDatasetRows.length,
        combinedLaneRows: combinedLaneDatasetRows.length,
      });

      const dataflowSortValue = (value?: string) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
      };
      const sortedScenarioPayloads = [...scenarioPayloads].sort((a, b) => {
        const byDataflow = dataflowSortValue(a.header.DataflowID) - dataflowSortValue(b.header.DataflowID);
        if (byDataflow !== 0) return byDataflow;
        return a.header.RunName.localeCompare(b.header.RunName);
      });
      const uniqueScenarioPayloads = (() => {
        const seen = new Set<string>();
        return sortedScenarioPayloads.filter((payload) => {
          const scenarioId = String(payload.header.ScenarioRunID || '').trim();
          if (!scenarioId) return false;
          if (seen.has(scenarioId)) return false;
          seen.add(scenarioId);
          return true;
        });
      })();
      if (uniqueScenarioPayloads.length !== sortedScenarioPayloads.length) {
        console.warn('[Scenario State] deduped duplicate scenario payloads', {
          before: sortedScenarioPayloads.length,
          after: uniqueScenarioPayloads.length,
        });
      }

      setDatasetOptions(buildDatasetOptionSets(allRows));
      setDataHealthSnapshot(buildDataHealthSnapshotFromRows(allRows));
      const safeLoadedLanes = Array.isArray(combinedLaneDatasetRows) ? combinedLaneDatasetRows : [];
      setRawScenarioLaneRows(safeLoadedLanes);
      const baseScenarioState: ScenarioState = {
        headers: uniqueScenarioPayloads.map((p) => p.header),
        configs: [],
        resultsDC: uniqueScenarioPayloads.flatMap((p) => p.dcResults),
        resultsLanes: uniqueScenarioPayloads.flatMap((p) =>
          safeLoadedLanes.filter((lane) => lane.ScenarioRunID === p.header.ScenarioRunID)
        ),
        overrides: [],
      };
      const freshLanesByScenarioId = safeLoadedLanes.reduce<Map<string, ScenarioRunResultsLane[]>>((acc, lane) => {
        const scenarioId = String(lane.ScenarioRunID || '').trim();
        if (!scenarioId) return acc;
        const list = acc.get(scenarioId) || [];
        list.push({ ...lane });
        acc.set(scenarioId, list);
        return acc;
      }, new Map<string, ScenarioRunResultsLane[]>());
      const persistedBeforeSeed = listScenarioRecords();
      console.log('[Scenario State] source=localStorage', {
        records: persistedBeforeSeed.length,
      });
      let persistedRecords = await loadScenarioRecordsFromAppDb();
      let scenarioPersistenceSource: 'AppDB' | 'localStorage' = persistedRecords.length > 0 ? 'AppDB' : 'localStorage';
      let legacySeedRecords: ScenarioRepositoryRecord[] = [];

      try {
        if (persistedRecords.length === 0 && persistedBeforeSeed.length > 0) {
          await syncScenarioRecordsToAppDb(persistedBeforeSeed);
          persistedRecords = await loadScenarioRecordsFromAppDb();
          scenarioPersistenceSource = persistedRecords.length > 0 ? 'AppDB' : 'localStorage';
        }
        if (persistedRecords.length === 0) {
          const persistedIds = new Set(persistedBeforeSeed.map((record) => record.definition.scenarioId));
          legacySeedRecords = baseScenarioState.headers
            .filter((header) => !persistedIds.has(header.ScenarioRunID))
            .map((header) =>
              buildScenarioRepositoryRecordFromState(
                header,
                baseScenarioState.resultsDC.filter((row) => row.ScenarioRunID === header.ScenarioRunID),
                baseScenarioState.resultsLanes.filter((row) => row.ScenarioRunID === header.ScenarioRunID),
              )
            );
          if (legacySeedRecords.length > 0) {
            await syncScenarioRecordsToAppDb(legacySeedRecords);
            persistedRecords = await loadScenarioRecordsFromAppDb();
            scenarioPersistenceSource = persistedRecords.length > 0 ? 'AppDB' : 'localStorage';
          }
        }
      } catch (syncError) {
        console.warn('[Scenario State] AppDB scenario sync failed; continuing with localStorage cache.', syncError);
      }

      if (persistedRecords.length > 0) {
        scenarioPersistenceSourceRef.current = 'AppDB';
        setScenarioRepositoryCache(persistedRecords, 'AppDB');
      } else {
        const fallbackRecords = persistedBeforeSeed.length > 0 ? persistedBeforeSeed : legacySeedRecords;
        scenarioPersistenceSourceRef.current = 'localStorage';
        setScenarioRepositoryCache(fallbackRecords, 'localStorage');
        if (persistedBeforeSeed.length === 0 && fallbackRecords.length > 0) {
          fallbackRecords.forEach((record) => {
            createScenarioRecord(record.definition, record.snapshot);
          });
        }
        persistedRecords = fallbackRecords;
      }

      const seededFromDomo = legacySeedRecords.length > 0;
      console.log('[Scenario State] source=merged (Domo datasets + AppDB/localStorage repository)', {
        domoRows: allRows.length,
        domoHeaders: baseScenarioState.headers.length,
        persistedRecords: persistedRecords.length,
        seededFromDomo,
        scenarioPersistenceSource: scenarioPersistenceSourceRef.current,
      });
      const repairedRecords: ScenarioRepositoryRecord[] = [];
      const repairedRecordIds = new Set<string>();
      persistedRecords.forEach((record) => {
        const freshLanes = freshLanesByScenarioId.get(record.definition.scenarioId) || [];
        if (freshLanes.length > 0 && record.snapshot) {
          const nextSnapshot = {
            ...record.snapshot,
            resultsLanes: canonicalizeScenarioResultsLanes(freshLanes),
            updatedAt: new Date().toISOString(),
          };
          const nextRecord: ScenarioRepositoryRecord = {
            ...record,
            snapshot: nextSnapshot,
          };
          repairedRecords.push(nextRecord);
          repairedRecordIds.add(record.definition.scenarioId);
        } else {
          repairedRecords.push(record);
        }
      });
      const scenarioRepairUpdates = repairedRecords.filter((record) => repairedRecordIds.has(record.definition.scenarioId));
      if (scenarioRepairUpdates.length > 0) {
        await Promise.all(scenarioRepairUpdates.map((record) => persistScenarioRecordToPrimaryStore(record)));
      }
      persistedRecords = repairedRecords;
      setScenarioRepositoryCache(repairedRecords, scenarioPersistenceSourceRef.current);

      const mergedState = mergeScenarioStateWithRecords(baseScenarioState, repairedRecords);
      const debugZip = '427';
      const uiZipRows = mergedState.resultsLanes.filter((lane) => String(lane.Dest3Zip || '').trim() === debugZip);
      if (uiZipRows.length > 0) {
        console.groupCollapsed(`[Scenario UI Debug] zip=${debugZip}`);
        console.log('ui', uiZipRows);
        console.groupEnd();
      }
      const persistedScenarioIds = new Set(persistedRecords.map((r) => r.definition.scenarioId));
      console.groupCollapsed(`[Scenario Sources] ${mergedState.headers.length} scenarios after merge`);
      console.table(
        mergedState.headers.map((h) => ({
          ScenarioRunID: h.ScenarioRunID,
          RunName: h.RunName,
          Region: h.Region,
          ScenarioType: h.ScenarioType,
          Status: h.Status,
          CreatedBy: h.CreatedBy || 'NA',
          DataflowID: h.DataflowID || 'NA',
          Source: persistedScenarioIds.has(h.ScenarioRunID)
            ? (scenarioPersistenceSourceRef.current === 'AppDB' ? 'AppDB record' : 'localStorage record')
            : 'Domo dataset only',
        }))
      );
      console.groupEnd();
      setScenarioState(mergedState);

      setScenarioHistoryState(buildScenarioHistoryState(persistedRecords));

      setDomoDcLoaded(true);
    } catch (err) {
      console.warn('Failed to load Domo dataset', err);
      setDomoDcLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (domoDcLoaded) return;
    loadDomoDc().catch(() => undefined);
    return undefined;
  }, [domoDcLoaded, loadDomoDc]);

  useEffect(() => {
    let isMounted = true;
    DomoApi.getCurrentUser()
      .then((user) => {
        if (!isMounted) return;
        const userId = String(user?.userId || user?.id || user?.user?.id || '').trim();
        if (userId) {
          setCurrentUserId(userId);
        }
        const displayName = String(user?.displayName || user?.userName || user?.name || '').trim();
        if (displayName) {
          setCurrentUserDisplayName(displayName);
        }
        const email = String(user?.userEmail || user?.emailAddress || user?.email || '').trim();
        setCurrentUserEmail(email || null);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserDisplayName || currentUserDisplayName === 'You') return;
    setScenarioState((prev) => {
      const needsBackfill = prev.headers.some((header) => !header.CreatedBy || header.CreatedBy === 'NA');
      if (!needsBackfill) return prev;
      return {
        ...prev,
        headers: prev.headers.map((header) =>
          !header.CreatedBy || header.CreatedBy === 'NA'
            ? { ...header, CreatedBy: currentUserDisplayName }
            : header
        ),
      };
    });
  }, [currentUserDisplayName]);

  useEffect(() => {
    let isMounted = true;

    const hydrateAppDbState = async () => {
      try {
        const [persistedComparisons, persistedNotifications] = await Promise.all([
          loadAppDbComparisonState(currentUserId, currentUserEmail),
          loadAppDbNotifications(currentUserId, currentUserEmail),
        ]);

        if (!isMounted) return;

        if (persistedComparisons) {
          setComparisonState(persistedComparisons);
        }

        if (persistedNotifications) {
          setNotifications(Array.isArray(persistedNotifications) ? persistedNotifications : []);
        }

        const comparisonSource = persistedComparisons ? 'AppDB' : 'fallback';
        const notificationSource = persistedNotifications ? 'AppDB' : 'fallback';

        console.log('[AppDB] comparisons source:', comparisonSource);
        console.log('[AppDB] notifications source:', notificationSource);

        lastPersistedComparisonStateRef.current = cloneComparisonState(
          persistedComparisons || comparisonState,
        );
        lastPersistedNotificationsRef.current = cloneNotifications(
          persistedNotifications || notifications,
        );
      } catch (error) {
        console.warn('Failed to hydrate AppDB collections', error);
      } finally {
        if (isMounted) {
          persistenceHydratedRef.current = true;
        }
      }
    };

    hydrateAppDbState();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, currentUserEmail]);

  const triggerScenarioCompletionEmail = useCallback(async (params: {
    scenarioName: string;
    scenarioId: string;
    dataflowId: string;
    executionId: string | number;
    completedAtIso: string;
  }) => {
    if (!currentUserEmail) {
      return;
    }

    const completedAt = new Date(params.completedAtIso).toLocaleString();
    const appUrl = 'https://bissell.domo.com/app-studio/1013705028/pages/475939166';
    const subject = `Scenario completed: ${params.scenarioName}`;
    const body = [
      '<div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">',
      `<p style="margin: 0 0 12px 0;">Hi ${currentUserDisplayName || 'there'},</p>`,
      '<p style="margin: 0 0 16px 0;">Your scenario ETL run finished successfully. Here is the summary:</p>',
      '<table style="border-collapse: collapse; width: 100%; max-width: 640px; margin: 0 0 18px 0;">',
      '<tbody>',
      `<tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Scenario</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${params.scenarioName}</td></tr>`,
      `<tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Scenario ID</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${params.scenarioId}</td></tr>`,
      `<tr><td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Completed At</td><td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${completedAt}</td></tr>`,
      '</tbody>',
      '</table>',
      `<p style="margin: 0 0 18px 0;">`,
      `<a href="${appUrl}" target="_blank" rel="noreferrer" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Open in App</a>`,
      '</p>',
      '<p style="margin: 0;">Regards,<br/>Network Optimization UI</p>',
      '</div>',
    ].join('');

    await sendCodeEngineEmail({
      recipientEmails: currentUserEmail,
      subject,
      body,
      includeReplyAll: false,
    });
  }, [currentUserDisplayName, currentUserEmail]);

  const handleSendTestEmail = useCallback(async () => {
    if (!currentUserEmail) {
      pushToast('No current user email is available for the test email.', 'error');
      return;
    }

    setTestEmailActive(true);
    try {
      await sendCodeEngineEmail({
        recipientEmails: currentUserEmail,
        subject: 'Test Email from Network Optimization UI',
        body: [
          `<p>Hi ${currentUserDisplayName || 'there'},</p>`,
          '<p>This is a direct test email from the Home page.</p>',
          '<p>If you received this, the Code Engine notification package is working.</p>',
        ].join(''),
        includeReplyAll: false,
      });
      pushToast(`Test email sent to ${currentUserEmail}.`, 'success');
      pushNotification({
        kind: 'success',
        title: 'Test email sent',
        message: `A direct test email was sent to ${currentUserEmail}.`,
        entity: { type: 'email', id: 'test-email' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pushToast(`Test email failed: ${message}`, 'error');
      pushNotification({
        kind: 'error',
        title: 'Test email failed',
        message,
        entity: { type: 'email', id: 'test-email' },
      });
    } finally {
      setTestEmailActive(false);
    }
  }, [currentUserDisplayName, currentUserEmail, pushNotification, pushToast]);

  useEffect(() => {
    if (!persistenceHydratedRef.current) return;
    if (!currentUserId && !currentUserEmail) return;
    const previousComparisonState = lastPersistedComparisonStateRef.current;
    const nextComparisonState = cloneComparisonState(comparisonState);
    lastPersistedComparisonStateRef.current = nextComparisonState;
    void persistAppDbComparisonState(
      currentUserId,
      currentUserDisplayName,
      currentUserEmail,
      previousComparisonState,
      nextComparisonState,
    ).catch((error) => {
      console.warn('Failed to save comparisons to AppDB', error);
    });
  }, [comparisonState, currentUserId, currentUserEmail, currentUserDisplayName]);

  useEffect(() => {
    if (!persistenceHydratedRef.current) return;
    if (!currentUserId && !currentUserEmail) return;
    const previousNotifications = lastPersistedNotificationsRef.current;
    const nextNotifications = cloneNotifications(notifications.slice(0, 200));
    lastPersistedNotificationsRef.current = nextNotifications;
    void persistAppDbNotifications(currentUserId, currentUserEmail, previousNotifications, nextNotifications).catch((error) => {
      console.warn('Failed to save notifications to AppDB', error);
    });
  }, [notifications, currentUserId, currentUserEmail]);

  useEffect(() => {
    return () => {
      Object.values(pollingTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      pollingTimersRef.current = {};
      Object.values(readonlyRunTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      readonlyRunTimersRef.current = {};
      activeScenarioRunsRef.current.clear();
      Object.values(toastTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      toastTimersRef.current = {};
    };
  }, []);

  const handleScenarioComplete = async (payload: NewScenarioSubmit) => {
    setUiBusyMessage('Creating scenario...');
    try {
      if (!payload.input.baselineDataflowId) {
        pushToast('Select a baseline scenario with a valid dataflow before creating a new scenario.', 'error');
        pushNotification({
          kind: 'error',
          title: 'Scenario creation blocked',
          message: 'The selected baseline scenario does not have a valid dataflow mapping.',
          entity: { type: 'scenario', id: payload.input.baselineScenarioId || 'unknown' },
        });
        return;
      }

      const normalizeText = (value: unknown): string => String(value || '').trim().toLowerCase();
      const familyPolicy = resolveScenarioTypePolicy(payload.input.scenarioType);
      const selectedTemplate = scenarioTemplatesByRegion[payload.input.region]?.find(
        (template) => template.scenarioId === payload.input.baselineScenarioId,
      ) || null;
      const familyKey = familyPolicy.familyKey;
      const familyDcs = getScenarioTypeAllowedDcs(payload.input.scenarioType);
      const familyDcSet = new Set(familyDcs.map(normalizeText));
      const normalizedActiveDcs = familyDcs;
      const normalizedSuppressedDcs = Array.from(
        new Set(payload.input.suppressedDCs.filter((dc) => familyDcSet.has(normalizeText(dc)))),
      );
      const exactBaselineTemplate = familyPolicy.allocationMode === 'baseline'
        ? (scenarioTemplatesByRegion[payload.input.region] || []).find((template) =>
          resolveScenarioTypePolicy(template.scenarioType).scenarioType === 'US Baseline'
          && String(template.dataflowId || '').trim() === '3267')
        : null;
      const normalizedBaselineScenarioId = familyPolicy.allocationMode === 'baseline'
        ? exactBaselineTemplate?.scenarioId || payload.input.baselineScenarioId
        : payload.input.baselineScenarioId;
      const normalizedBaselineDataflowId = familyPolicy.allocationMode === 'baseline'
        ? String(exactBaselineTemplate?.dataflowId || '3267')
        : payload.input.baselineDataflowId;
      const scopedDcCapacityRows = dcCapacityRows.filter((row) => familyDcSet.has(normalizeText(row.DCName)));
      const scopedLaneRowsByScenarioId = Object.entries(lanesByScenarioId).reduce<Record<string, ScenarioRunResultsLane[]>>((acc, [scenarioId, rows]) => {
        const filteredRows = rows.filter((row) => resolveScenarioFamilyKey(row.ScenarioType) === familyKey);
        if (filteredRows.length > 0) {
          acc[scenarioId] = filteredRows;
        }
        return acc;
      }, {});

      if (DEBUG_DOMO_MAPPING) {
        console.groupCollapsed('[Scenario Build] family routing');
        console.table([
          {
            ScenarioType: payload.input.scenarioType,
            FamilyKey: familyKey,
            AllowedDcCount: familyDcs.length,
            AllowedDcs: familyDcs.join(', '),
            LaneBucketCount: Object.keys(scopedLaneRowsByScenarioId).length,
            LaneRowCount: Object.values(scopedLaneRowsByScenarioId).reduce((sum, rows) => sum + rows.length, 0),
            CapacityRowCount: scopedDcCapacityRows.length,
          },
        ]);
        console.table(
          Object.entries(scopedLaneRowsByScenarioId).map(([scenarioId, rows]) => ({
            ScenarioRunID: scenarioId,
            LaneCount: rows.length,
          }))
        );
        console.groupEnd();
      }

      const buildContext: ScenarioBuildContext = {
        scenarioHeaders: scenarioState.headers,
        scenarioResultsDC: scenarioState.resultsDC,
        scenarioResultsLanes: scenarioState.resultsLanes,
        laneRowsByScenarioId: scopedLaneRowsByScenarioId,
        dcCapacityRows: scopedDcCapacityRows,
        scenarioTypePolicy: familyPolicy,
        currentUserDisplayName,
        dataSnapshotVersion: dataHealthSnapshot?.SnapshotTime || 'NA',
        hasCostVsServiceWeights: selectedTemplate
          ? selectedTemplate.costVsService > 0
          : datasetOptions.costVsServiceWeights.length > 0,
        hasUtilCaps: selectedTemplate
          ? selectedTemplate.utilCap > 0
          : datasetOptions.utilCaps.length > 0,
        hasLeadTimeCaps: selectedTemplate
          ? selectedTemplate.leadTimeCap > 0
          : datasetOptions.leadTimeCaps.length > 0,
      };

      const normalizedCreatePayload: NewScenarioSubmit = {
        ...payload,
        input: normalizeScenarioTypeSpecificInput({
          ...payload.input,
          activeDCs: normalizedActiveDcs,
          suppressedDCs: normalizedSuppressedDcs,
          baselineScenarioId: normalizedBaselineScenarioId,
          baselineDataflowId: normalizedBaselineDataflowId,
        }),
      };

      if (DEBUG_DOMO_MAPPING) {
        console.groupCollapsed('[Scenario Build] raw lane counts');
        console.table(
          Object.entries(lanesByScenarioId).map(([scenarioId, rows]) => ({
            ScenarioRunID: scenarioId,
            RawLaneCount: rows.length,
          }))
        );
        console.groupEnd();
      }

      let artifact = buildScenarioArtifactsLegacy(normalizedCreatePayload, buildContext);
      try {
        artifact = await buildScenarioArtifactsWithLogic(normalizedCreatePayload, buildContext);
      } catch (error) {
        console.warn('[Scenario Engine] Falling back to legacy builder for new scenario creation.', error);
        artifact = buildScenarioArtifactsLegacy(normalizedCreatePayload, buildContext);
      }
      const repositoryRecord = buildScenarioRepositoryRecord(
        normalizedCreatePayload,
        buildContext,
        artifact,
      );
      try {
        await persistScenarioRecordToPrimaryStore(repositoryRecord);
      } catch (error) {
        console.warn('[Scenario AppDB] Failed to persist new scenario', error);
      }
      const { header, config, resultsDC, resultsLanes } = artifact;

      setScenarioState((prev) => ({
        headers: [header, ...prev.headers],
        configs: [config, ...prev.configs],
        resultsDC: [...resultsDC, ...prev.resultsDC],
        resultsLanes: [...resultsLanes, ...prev.resultsLanes],
        overrides: [...prev.overrides],
      }));

      navigateToHome();
    } finally {
      setUiBusyMessage(null);
    }
  };

  const persistHeaderToRepository = useCallback((
    scenarioId: string,
    headerPatch: Partial<ScenarioRunHeader>,
  ) => {
    const record = getScenarioRecordFromCache(scenarioId);
    if (!record) return;
    const nextUpdatedAt = headerPatch.LastUpdatedAt || record.definition.updatedAt || new Date().toISOString();
    const nextRecord: ScenarioRepositoryRecord = {
      ...record,
      definition: {
        ...record.definition,
        scenarioName: headerPatch.RunName ?? record.definition.scenarioName,
        region: headerPatch.Region ?? record.definition.region,
        scenarioType: headerPatch.ScenarioType ?? record.definition.scenarioType,
        dataflowId: headerPatch.DataflowID ?? record.definition.dataflowId,
        status: headerPatch.Status ?? record.definition.status,
        lastRunBy: headerPatch.LastRunBy ?? record.definition.lastRunBy ?? null,
        lastRunAt: headerPatch.LastRunAt ?? record.definition.lastRunAt ?? null,
        lastRunExecutionId: headerPatch.LastRunExecutionId ?? record.definition.lastRunExecutionId ?? null,
        updatedAt: nextUpdatedAt,
      },
      snapshot: record.snapshot
        ? {
            ...record.snapshot,
            header: { ...record.snapshot.header, ...headerPatch },
            updatedAt: nextUpdatedAt,
          }
        : null,
    };
    void persistScenarioRecordToPrimaryStore(nextRecord).catch((error) => {
      console.warn('[Scenario AppDB] Failed to persist scenario header patch', error);
    });
  }, []);

  const persistScenarioRecordSnapshot = useCallback((
    scenarioId: string,
    patch: Partial<Pick<ScenarioRepositoryRecord, 'snapshot' | 'overrides'>>,
  ) => {
    const record = getScenarioRecordFromCache(scenarioId);
    if (!record) return;
    const nextSnapshot = patch.snapshot ?? record.snapshot;
    const nextOverrides = patch.overrides ?? record.overrides;
    void persistScenarioRecordToPrimaryStore({
      ...record,
      definition: {
        ...record.definition,
        updatedAt: new Date().toISOString(),
      },
      snapshot: nextSnapshot,
      overrides: nextOverrides,
    }).catch((error) => {
      console.warn('[Scenario AppDB] Failed to persist scenario snapshot', error);
    });
  }, []);

  const upsertRunHistoryEntry = useCallback((
    scenarioId: string,
    entry: ScenarioRunHistoryEntry,
  ) => {
    const record = getScenarioRecordFromCache(scenarioId);
    if (!record) return;
    const nextHistory = [
      ...record.runHistory.filter((item) => item.runId !== entry.runId),
      { ...entry },
    ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    void persistScenarioRecordToPrimaryStore({
      ...record,
      runHistory: nextHistory,
    }).catch((error) => {
      console.warn('[Scenario AppDB] Failed to persist scenario history', error);
    });
    setScenarioHistoryState((prev) => ({
      ...prev,
      [scenarioId]: nextHistory.map((item) => ({ ...item })),
    }));
  }, []);

  const refreshData = () => {
    setDomoDcLoaded(false);
    loadDomoDc().catch(() => undefined);
  };

  const refreshComparisonsFromAppDb = useCallback(async () => {
    setComparisonsRefreshActive(true);
    try {
      const persistedComparisons = await loadAppDbComparisonState(currentUserId, currentUserEmail);
      if (!persistenceHydratedRef.current) return;
      if (persistedComparisons) {
        setComparisonState(persistedComparisons);
        lastPersistedComparisonStateRef.current = cloneComparisonState(persistedComparisons);
        console.log('[AppDB] comparisons refreshed from AppDB');
      } else {
        setComparisonState(EMPTY_COMPARISON_STATE);
        lastPersistedComparisonStateRef.current = cloneComparisonState(EMPTY_COMPARISON_STATE);
        console.log('[AppDB] comparisons refreshed: empty');
      }
    } catch (error) {
      console.warn('Failed to refresh comparisons from AppDB', error);
    } finally {
      setComparisonsRefreshActive(false);
    }
  }, [currentUserId, currentUserEmail]);

  const refreshNotificationsFromAppDb = useCallback(async () => {
    setNotificationsRefreshActive(true);
    try {
      const persistedNotifications = await loadAppDbNotifications(currentUserId, currentUserEmail);
      if (!persistenceHydratedRef.current) return;
      if (persistedNotifications) {
        setNotifications(Array.isArray(persistedNotifications) ? persistedNotifications : []);
        lastPersistedNotificationsRef.current = cloneNotifications(persistedNotifications);
        console.log('[AppDB] notifications refreshed from AppDB');
      } else {
        setNotifications([]);
        lastPersistedNotificationsRef.current = [];
        console.log('[AppDB] notifications refreshed: empty');
      }
    } catch (error) {
      console.warn('Failed to refresh notifications from AppDB', error);
    } finally {
      setNotificationsRefreshActive(false);
    }
  }, [currentUserId, currentUserEmail]);

  const duplicateScenario = (scenarioId: string) => {
    const sourceHeader = scenarioState.headers.find(s => s.ScenarioRunID === scenarioId);
    if (!sourceHeader) return;
    const now = new Date().toISOString();
    const numeric = (scenarioState.headers.length + 1).toString().padStart(3, '0');
    const newId = `SR${numeric}`;

    const sourceRecord = getScenarioRecordFromCache(scenarioId);
    if (sourceRecord) {
      const clonedRecord = cloneScenarioRepositoryRecord(sourceRecord);
      clonedRecord.definition = {
        ...clonedRecord.definition,
        scenarioId: newId,
        scenarioName: `${clonedRecord.definition.scenarioName} (Copy)`,
        createdAt: now,
        updatedAt: now,
        status: 'Draft',
        lastRunBy: null,
        lastRunAt: null,
        lastRunExecutionId: null,
      };
      clonedRecord.snapshot = clonedRecord.snapshot
        ? {
            ...clonedRecord.snapshot,
            scenarioId: newId,
            header: {
              ...clonedRecord.snapshot.header,
              ScenarioRunID: newId,
              RunName: `${sourceHeader.RunName} (Copy)`,
              CreatedAt: now,
              LastUpdatedAt: now,
              Status: 'Draft',
              ApprovedBy: null,
              ApprovedAt: null,
            },
            config: {
              ...clonedRecord.snapshot.config,
              ScenarioRunID: newId,
            },
            resultsDC: clonedRecord.snapshot.resultsDC.map((row) => ({ ...row, ScenarioRunID: newId })),
            resultsLanes: clonedRecord.snapshot.resultsLanes.map((row) => ({ ...row, ScenarioRunID: newId })),
            createdAt: now,
            updatedAt: now,
          }
        : null;

      const newHeader = clonedRecord.snapshot?.header || {
        ...sourceHeader,
        ScenarioRunID: newId,
        RunName: `${sourceHeader.RunName} (Copy)`,
        CreatedAt: now,
        LastUpdatedAt: now,
        Status: 'Draft',
        ApprovedBy: null,
        ApprovedAt: null,
      };
      const newConfigs = clonedRecord.snapshot ? [clonedRecord.snapshot.config] : [];
      const newResultsDC = clonedRecord.snapshot ? clonedRecord.snapshot.resultsDC : [];
      const newResultsLanes = clonedRecord.snapshot ? clonedRecord.snapshot.resultsLanes : [];

      setScenarioState((prev) => ({
        headers: [newHeader, ...prev.headers],
        configs: [...newConfigs, ...prev.configs],
        resultsDC: [...newResultsDC, ...prev.resultsDC],
        resultsLanes: [...newResultsLanes, ...prev.resultsLanes],
        overrides: [...clonedRecord.overrides, ...prev.overrides],
      }));
      void persistScenarioRecordToPrimaryStore(clonedRecord).catch((error) => {
        console.warn('[Scenario AppDB] Failed to persist duplicated scenario', error);
      });
      return;
    }

    const newHeader: ScenarioRunHeader = {
      ...sourceHeader,
      ScenarioRunID: newId,
      RunName: `${sourceHeader.RunName} (Copy)`,
      CreatedAt: now,
      LastUpdatedAt: now,
      Status: 'Draft',
      ApprovedBy: null,
      ApprovedAt: null,
    };

    const newConfigs = scenarioState.configs
      .filter(c => c.ScenarioRunID === scenarioId)
      .map(c => ({ ...c, ScenarioRunID: newId }));
    const newResultsDC = scenarioState.resultsDC
      .filter(r => r.ScenarioRunID === scenarioId)
      .map(r => ({ ...r, ScenarioRunID: newId }));
    const newResultsLanes = scenarioState.resultsLanes
      .filter(r => r.ScenarioRunID === scenarioId)
      .map(r => ({ ...r, ScenarioRunID: newId }));
    const newOverrides = scenarioState.overrides
      .filter(o => o.ScenarioRunID === scenarioId)
      .map(o => ({ ...o, ScenarioRunID: newId }));

    setScenarioState((prev) => ({
      headers: [newHeader, ...prev.headers],
      configs: [...newConfigs, ...prev.configs],
      resultsDC: [...newResultsDC, ...prev.resultsDC],
      resultsLanes: [...newResultsLanes, ...prev.resultsLanes],
      overrides: [...newOverrides, ...prev.overrides],
    }));
    const clonedRecord = buildScenarioRepositoryRecordFromState(newHeader, newResultsDC, newResultsLanes);
    void persistScenarioRecordToPrimaryStore(clonedRecord).catch((error) => {
      console.warn('[Scenario AppDB] Failed to persist duplicated scenario fallback', error);
    });
  };

  const archiveScenario = (scenarioId: string) => {
    const now = new Date().toISOString();
    const record = getScenarioRecordFromCache(scenarioId);
    if (record) {
      const nextRecord: ScenarioRepositoryRecord = {
        ...record,
        definition: {
          ...record.definition,
          status: 'Archived',
          updatedAt: now,
        },
        snapshot: record.snapshot
          ? {
              ...record.snapshot,
              header: {
                ...record.snapshot.header,
                Status: 'Archived',
                LastUpdatedAt: now,
              },
              updatedAt: now,
            }
          : null,
      };
      void persistScenarioRecordToPrimaryStore(nextRecord).catch((error) => {
        console.warn('[Scenario AppDB] Failed to persist archived scenario', error);
      });
    }
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId ? { ...s, Status: 'Archived', LastUpdatedAt: now } : s
      ),
    }));
    setArchivedScenarioPrevStatus((prev) => {
      const current = scenarioState.headers.find((s) => s.ScenarioRunID === scenarioId);
      if (!current || current.Status === 'Archived') return prev;
      return { ...prev, [scenarioId]: current.Status };
    });
  };

  const unarchiveScenario = (scenarioId: string) => {
    const fallbackStatus: ScenarioRunHeader['Status'] = archivedScenarioPrevStatus[scenarioId] || 'Running';
    const now = new Date().toISOString();
    const record = getScenarioRecordFromCache(scenarioId);
    if (record) {
      const nextRecord: ScenarioRepositoryRecord = {
        ...record,
        definition: {
          ...record.definition,
          status: fallbackStatus,
          updatedAt: now,
        },
        snapshot: record.snapshot
          ? {
              ...record.snapshot,
              header: {
                ...record.snapshot.header,
                Status: fallbackStatus,
                LastUpdatedAt: now,
              },
              updatedAt: now,
            }
          : null,
      };
      void persistScenarioRecordToPrimaryStore(nextRecord).catch((error) => {
        console.warn('[Scenario AppDB] Failed to persist unarchived scenario', error);
      });
    }
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId ? { ...s, Status: fallbackStatus, LastUpdatedAt: now } : s
      ),
    }));
  };

  const deleteScenario = async (scenarioId: string) => {
    const target = scenarioState.headers.find((s) => s.ScenarioRunID === scenarioId);
    if (!target) return;
    if (!target.CreatedBy || String(target.CreatedBy).trim() === 'NA') {
      pushToast('Original scenarios cannot be deleted.', 'error');
      return;
    }
    if (target.Status === 'Running') {
      pushToast('Please wait for the scenario run to finish before deleting it.', 'error');
      return;
    }

    setUiBusyMessage('Deleting scenario...');
    try {
      const deleted = await deleteScenarioRecordFromPrimaryStore(scenarioId);
      if (!deleted) {
        pushToast('Scenario could not be deleted.', 'error');
        return;
      }

      setScenarioState((prev) => ({
        headers: prev.headers.filter((s) => s.ScenarioRunID !== scenarioId),
        configs: prev.configs.filter((c) => c.ScenarioRunID !== scenarioId),
        resultsDC: prev.resultsDC.filter((r) => r.ScenarioRunID !== scenarioId),
        resultsLanes: prev.resultsLanes.filter((r) => r.ScenarioRunID !== scenarioId),
        overrides: prev.overrides.filter((o) => o.ScenarioRunID !== scenarioId),
      }));
      setScenarioHistoryState((prev) => {
        const next = { ...prev };
        delete next[scenarioId];
        return next;
      });
      setArchivedScenarioPrevStatus((prev) => {
        const next = { ...prev };
        delete next[scenarioId];
        return next;
      });
      if (appState.selectedScenarioId === scenarioId) {
        navigateToHome();
      }
      pushToast(`Deleted ${target.RunName}.`, 'success');
    } finally {
      setUiBusyMessage(null);
    }
  };

  const deleteComparison = async (comparisonId: string) => {
    const target = comparisonState.headers.find((c) => c.ComparisonID === comparisonId);
    if (!target) return;

    setUiBusyMessage('Deleting comparison...');
    try {
      const deletedCount = await deleteCollectionDocumentsByField(
        APPDB_COLLECTIONS.comparisons,
        'comparisonId',
        comparisonId,
      );

      if (deletedCount === 0) {
        pushToast('Comparison could not be deleted.', 'error');
        return;
      }

      setComparisonState((prev) => ({
        headers: prev.headers.filter((c) => c.ComparisonID !== comparisonId),
        detailDC: prev.detailDC.filter((row) => row.ComparisonID !== comparisonId),
        detailLanes: prev.detailLanes.filter((row) => row.ComparisonID !== comparisonId),
      }));
      setArchivedComparisonPrevStatus((prev) => {
        const next = { ...prev };
        delete next[comparisonId];
        return next;
      });

      if (appState.selectedComparisonId === comparisonId) {
        navigateToHome();
      }

      pushToast(`Deleted ${target.ComparisonName}.`, 'success');
    } catch (error) {
      console.warn('Failed to delete comparison from AppDB', error);
      pushToast('Comparison could not be deleted.', 'error');
    } finally {
      setUiBusyMessage(null);
    }
  };

  const publishScenario = (scenarioId: string) => {
    const now = new Date().toISOString();
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? { ...s, Status: 'Published', ApprovedBy: currentUserDisplayName, ApprovedAt: now, LastUpdatedAt: now }
          : s
      ),
    }));
    persistHeaderToRepository(scenarioId, {
      Status: 'Published',
      ApprovedBy: currentUserDisplayName,
      ApprovedAt: now,
      LastUpdatedAt: now,
    });
  };

  const approveScenario = (scenarioId: string) => {
    const now = new Date().toISOString();
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? { ...s, ApprovedBy: currentUserDisplayName, ApprovedAt: now, LastUpdatedAt: now }
          : s
      ),
    }));
    persistHeaderToRepository(scenarioId, {
      ApprovedBy: currentUserDisplayName,
      ApprovedAt: now,
      LastUpdatedAt: now,
    });
  };

  const addScenarioComment = (scenarioId: string, comment: string) => {
    const now = new Date().toISOString();
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? { ...s, LatestComment: comment, LastUpdatedAt: now }
          : s
      ),
    }));
    persistHeaderToRepository(scenarioId, {
      LatestComment: comment,
      LastUpdatedAt: now,
    });
  };

  const applyOverride = (
    scenarioId: string,
    overrideInput: Omit<ScenarioOverride, 'ScenarioRunID' | 'OverrideVersion' | 'UpdatedAt' | 'UpdatedBy'>
  ) => {
    const now = new Date().toISOString();
    let updatedHeaders: ScenarioRunHeader[] = [];
    let updatedLanes: ScenarioRunResultsLane[] = [];
    let nextOverrides: ScenarioOverride[] = [];
    let nextSnapshot: ScenarioRepositoryRecord['snapshot'] = null;

    setScenarioState((prev) => {
      const scenarioOverridesForId = prev.overrides.filter(o => o.ScenarioRunID === scenarioId);
      const newVersion = `v${scenarioOverridesForId.length + 1}`;

      const newOverride: ScenarioOverride = {
        ScenarioRunID: scenarioId,
        OverrideVersion: newVersion,
        UpdatedAt: now,
        UpdatedBy: currentUserDisplayName || 'You',
        ...overrideInput,
      };

      let deltaCost = 0;
      updatedLanes = prev.resultsLanes.map((lane) => {
        if (
          lane.ScenarioRunID === scenarioId &&
          lane.Dest3Zip === overrideInput.Dest3Zip &&
          lane.Channel === overrideInput.Channel
        ) {
          const adjustedCost = Number((lane.LaneCost * 1.03).toFixed(2));
          const adjustedDays = Number((lane.DeliveryDays + 0.3).toFixed(1));
          deltaCost += adjustedCost - lane.LaneCost;
          return {
            ...lane,
            AssignedDC: overrideInput.NewDC,
            OverrideAppliedFlag: 'Y',
            OverrideVersion: newVersion,
            LaneCost: adjustedCost,
            DeliveryDays: adjustedDays,
          };
        }
        return lane;
      });

      const scenarioLanes = updatedLanes.filter((lane) => lane.ScenarioRunID === scenarioId);
      const avgDays = scenarioLanes.length > 0
        ? Number((scenarioLanes.reduce((sum, l) => sum + l.DeliveryDays, 0) / scenarioLanes.length).toFixed(1))
        : 0;
      const slaBreachCount = scenarioLanes.filter((l) => l.SLABreachFlag === 'Y').length;
      const slaBreachPct = scenarioLanes.length > 0
        ? Number(((slaBreachCount / scenarioLanes.length) * 100).toFixed(1))
        : 0;
      const excludedCount = scenarioLanes.filter((l) => l.ExcludedBySLAFlag === 'Y').length;

      updatedHeaders = prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? {
              ...s,
              OverrideCount: s.OverrideCount + 1,
              LastUpdatedAt: now,
              TotalCost: Number((s.TotalCost + deltaCost).toFixed(0)),
              CostPerUnit: s.LaneCount > 0 ? Number(((s.TotalCost + deltaCost) / s.LaneCount).toFixed(2)) : s.CostPerUnit,
              AvgDeliveryDays: avgDays || s.AvgDeliveryDays,
              SLABreachPct: slaBreachPct,
              ExcludedBySLACount: excludedCount,
            }
          : s
      );

      nextOverrides = [newOverride, ...prev.overrides];
      const updatedScenario = updatedHeaders.find((s) => s.ScenarioRunID === scenarioId);
      if (updatedScenario) {
        const currentRecord = getScenarioRecordFromCache(scenarioId);
        if (currentRecord) {
          nextSnapshot = {
            ...currentRecord.snapshot,
            header: { ...updatedScenario },
            resultsLanes: updatedLanes.filter((lane) => lane.ScenarioRunID === scenarioId).map((lane) => ({ ...lane })),
            updatedAt: now,
          } as NonNullable<ScenarioRepositoryRecord['snapshot']>;
        }
      }

      return {
        ...prev,
        headers: updatedHeaders,
        overrides: nextOverrides,
        resultsLanes: updatedLanes,
      };
    });

    persistScenarioRecordSnapshot(scenarioId, {
      snapshot: nextSnapshot ?? getScenarioRecordFromCache(scenarioId)?.snapshot ?? null,
      overrides: nextOverrides,
    });
  };

  const duplicateComparison = (comparisonId: string) => {
    const sourceHeader = comparisonState.headers.find(c => c.ComparisonID === comparisonId);
    if (!sourceHeader) return;
    const now = new Date().toISOString();
    const numeric = (comparisonState.headers.length + 1).toString().padStart(3, '0');
    const ownerPrefix = String(currentUserId || currentUserDisplayName || 'anon')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase() || 'ANON';
    const newId = `CMP-${ownerPrefix}-${numeric}`;

    const newHeader: ComparisonHeader = {
      ...sourceHeader,
      ComparisonID: newId,
      ComparisonName: `${sourceHeader.ComparisonName} (Copy)`,
      CreatedAt: now,
      Status: 'Working',
      DecisionVerdict: null,
      DecisionReason: null,
    };

    const newDetailDC = comparisonState.detailDC
      .filter(d => d.ComparisonID === comparisonId)
      .map(d => ({ ...d, ComparisonID: newId }));
    const newDetailLanes = comparisonState.detailLanes
      .filter(l => l.ComparisonID === comparisonId)
      .map(l => ({ ...l, ComparisonID: newId }));

    setComparisonState((prev) => ({
      headers: [newHeader, ...prev.headers],
      detailDC: [...newDetailDC, ...prev.detailDC],
      detailLanes: [...newDetailLanes, ...prev.detailLanes],
    }));
  };

  const archiveComparison = (comparisonId: string) => {
    setComparisonState((prev) => ({
      ...prev,
      headers: prev.headers.map((c) =>
        c.ComparisonID === comparisonId ? { ...c, Status: 'Archived' } : c
      ),
    }));
    setArchivedComparisonPrevStatus((prev) => {
      const current = comparisonState.headers.find((c) => c.ComparisonID === comparisonId);
      if (!current || current.Status === 'Archived') return prev;
      return { ...prev, [comparisonId]: current.Status };
    });
  };

  const unarchiveComparison = (comparisonId: string) => {
    const fallbackStatus: ComparisonHeader['Status'] = archivedComparisonPrevStatus[comparisonId] || 'Working';
    setComparisonState((prev) => ({
      ...prev,
      headers: prev.headers.map((c) =>
        c.ComparisonID === comparisonId ? { ...c, Status: fallbackStatus } : c
      ),
    }));
  };

  const publishComparison = (comparisonId: string) => {
    setComparisonState((prev) => ({
      ...prev,
      headers: prev.headers.map((c) =>
        c.ComparisonID === comparisonId ? { ...c, Status: 'Published' } : c
      ),
    }));
  };

  const addComparisonDecision = (comparisonId: string, verdict: string, reason: string) => {
    setComparisonState((prev) => ({
      ...prev,
      headers: prev.headers.map((c) =>
        c.ComparisonID === comparisonId ? { ...c, DecisionVerdict: verdict, DecisionReason: reason } : c
      ),
    }));
  };

  const buildComparisonHeader = (payload: NewComparisonSubmit): ComparisonHeader => {
    const now = new Date().toISOString();
    const ownerPrefix = String(currentUserId || currentUserDisplayName || 'anon')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 8)
      .toUpperCase() || 'ANON';
    const comparisonId = `CMP-${ownerPrefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const scenarioA = scenarioState.headers.find(s => s.ScenarioRunID === payload.runA);
    const scenarioB = scenarioState.headers.find(s => s.ScenarioRunID === payload.runB);

    const costDelta = (scenarioB?.TotalCost || 0) - (scenarioA?.TotalCost || 0);
    const costDeltaPct = scenarioA?.TotalCost ? (costDelta / scenarioA.TotalCost) * 100 : 0;
    const avgDaysDelta = (scenarioB?.AvgDeliveryDays || 0) - (scenarioA?.AvgDeliveryDays || 0);
    const slaDelta = (scenarioB?.SLABreachPct || 0) - (scenarioA?.SLABreachPct || 0);
    const maxUtilDelta = (scenarioB?.MaxUtilPct || 0) - (scenarioA?.MaxUtilPct || 0);
    const spaceDelta = (scenarioB?.TotalSpaceRequired || 0) - (scenarioA?.TotalSpaceRequired || 0);
    const spaceCoreDelta = (scenarioB?.SpaceCore || 0) - (scenarioA?.SpaceCore || 0);
    const spaceBCVDelta = (scenarioB?.SpaceBCV || 0) - (scenarioA?.SpaceBCV || 0);
    const changedLaneDelta = (scenarioB?.ChangedLaneCountVsBaseline || 0) - (scenarioA?.ChangedLaneCountVsBaseline || 0);

    return {
      ComparisonID: comparisonId,
      ComparisonName: payload.comparisonName,
      ScenarioRunID_A: payload.runA,
      ScenarioRunID_B: payload.runB,
      CreatedBy: currentUserDisplayName,
      CreatedAt: now,
      Status: 'Working',
      Notes: payload.notes || 'Created from comparison wizard',
      DecisionVerdict: null,
      DecisionReason: null,
      CostDelta: Math.round(costDelta),
      CostDeltaPct: Number(costDeltaPct.toFixed(2)),
      AvgDaysDelta: Number(avgDaysDelta.toFixed(2)),
      SLABreachDelta: Number(slaDelta.toFixed(2)),
      MaxUtilDelta: Math.round(maxUtilDelta),
      SpaceDelta: Math.round(spaceDelta),
      SpaceCoreDelta: Math.round(spaceCoreDelta),
      SpaceBCVDelta: Math.round(spaceBCVDelta),
      ChangedLaneDelta: Math.round(changedLaneDelta),
    };
  };

  const buildComparisonDetailDC = (comparisonId: string, runA: string, runB: string): ComparisonDetailDC[] => {
    const a = scenarioState.resultsDC.filter(r => r.ScenarioRunID === runA);
    const b = scenarioState.resultsDC.filter(r => r.ScenarioRunID === runB);

    const byA = new Map(a.map(dc => [dc.DCName, dc]));
    const byB = new Map(b.map(dc => [dc.DCName, dc]));
    const dcNames = Array.from(new Set([...byA.keys(), ...byB.keys()]));

    return dcNames.map((name) => {
      const dcA = byA.get(name);
      const dcB = byB.get(name);
      return {
        ComparisonID: comparisonId,
        DCName: name,
        Cost_A: dcA?.TotalCost || 0,
        Cost_B: dcB?.TotalCost || 0,
        Cost_Delta: (dcB?.TotalCost || 0) - (dcA?.TotalCost || 0),
        Util_A: dcA?.UtilPct || 0,
        Util_B: dcB?.UtilPct || 0,
        Util_Delta: (dcB?.UtilPct || 0) - (dcA?.UtilPct || 0),
        Space_A: dcA?.SpaceRequired || 0,
        Space_B: dcB?.SpaceRequired || 0,
        Space_Delta: (dcB?.SpaceRequired || 0) - (dcA?.SpaceRequired || 0),
        SLABreach_A: dcA?.SLABreachCount || 0,
        SLABreach_B: dcB?.SLABreachCount || 0,
      };
    });
  };

  const laneKey = (lane: ScenarioRunResultsLane) =>
    `${lane.Dest3Zip}|${lane.Channel}`;

  const buildComparisonDetailLanes = (comparisonId: string, runA: string, runB: string): ComparisonDetailLane[] => {
    const a = scenarioState.resultsLanes.filter(r => r.ScenarioRunID === runA);
    const b = scenarioState.resultsLanes.filter(r => r.ScenarioRunID === runB);

    const byA = new Map(a.map(l => [laneKey(l), l]));
    const byB = new Map(b.map(l => [laneKey(l), l]));
    const keys = Array.from(new Set([...byA.keys(), ...byB.keys()]));

    const rows = keys.map((key) => {
      const laneA = byA.get(key);
      const laneB = byB.get(key);
      const dest3Zip = laneA?.Dest3Zip || laneB?.Dest3Zip || '';
      const channel = laneA?.Channel || laneB?.Channel || '';
      const terms = laneA?.Terms || laneB?.Terms || '';
      const customer = laneA?.CustomerGroup || laneB?.CustomerGroup || '';

      const flags: string[] = [];
      if (laneA?.AssignedDC && laneB?.AssignedDC && laneA.AssignedDC !== laneB.AssignedDC) {
        flags.push('DCChange');
      }
      if ((laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0) > 0.5) {
        flags.push('SLA');
      }
      if (laneB?.OverrideAppliedFlag === 'Y' || laneA?.OverrideAppliedFlag === 'Y') {
        flags.push('Override');
      }

      return {
        ComparisonID: comparisonId,
        Dest3Zip: dest3Zip,
        Channel: channel,
        Terms: terms,
        CustomerGroup: customer,
        DC_A: laneA?.AssignedDC || '',
        DC_B: laneB?.AssignedDC || '',
        Cost_A: laneA?.LaneCost || 0,
        Cost_B: laneB?.LaneCost || 0,
        Cost_Delta: (laneB?.LaneCost || 0) - (laneA?.LaneCost || 0),
        Days_A: laneA?.DeliveryDays || 0,
        Days_B: laneB?.DeliveryDays || 0,
        Days_Delta: Math.round(((laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0)) * 100) / 100,
        UtilImpact_A: laneA?.UtilImpactPct || 0,
        UtilImpact_B: laneB?.UtilImpactPct || 0,
        Flags: flags.join(','),
      };
    });

    return rows
      .filter(r => r.Cost_Delta !== 0 || r.Days_Delta !== 0 || r.DC_A !== r.DC_B)
      .slice(0, 50);
  };

  const handleComparisonComplete = (payload: NewComparisonSubmit) => {
    const header = buildComparisonHeader(payload);
    const detailDC = buildComparisonDetailDC(header.ComparisonID, payload.runA, payload.runB);
    const detailLanes = buildComparisonDetailLanes(header.ComparisonID, payload.runA, payload.runB);

    setComparisonState((prev) => ({
      headers: [header, ...prev.headers],
      detailDC: [...detailDC, ...prev.detailDC],
      detailLanes: [...detailLanes, ...prev.detailLanes],
    }));

    console.log('Comparison created successfully', {
      comparisonId: header.ComparisonID,
      comparisonName: header.ComparisonName,
      runA: header.ScenarioRunID_A,
      runB: header.ScenarioRunID_B,
    });
  };

  const handleRunScenario = async (scenarioId: string, scenarioOverride?: ScenarioRunHeader) => {
    const scenario = scenarioOverride || scenarioState.headers.find((s) => s.ScenarioRunID === scenarioId);
    if (!scenario) return;

    if (activeScenarioRunsRef.current.has(scenarioId)) {
      pushToast(`${scenario.RunName || scenarioId} is already running.`, 'info');
      return;
    }

    const dataflowId = scenario.DataflowID;
    if (!dataflowId) {
      pushToast(`No Dataflow mapped for ${scenario.RunName || scenarioId}.`, 'error');
      return;
    }

    const priorStatus = scenario.Status;
    const storedRecord = getScenarioRecordFromCache(scenarioId);
    if (storedRecord?.snapshot) {
      const reconciledRecord = reconcileScenarioRepositoryRecordWithSuppressedDcs(storedRecord);
      void persistScenarioRecordToPrimaryStore(reconciledRecord).catch((error) => {
        console.warn('[Scenario AppDB] Failed to persist reconciled scenario record', error);
      });
      setScenarioState((prev) => mergeScenarioStateWithRecords(prev, [reconciledRecord]));
      setScenarioHistoryState((prev) => ({
        ...prev,
        [scenarioId]: reconciledRecord.runHistory.map((entry) => ({ ...entry })),
      }));
    }

    activeScenarioRunsRef.current.add(scenarioId);
    const runningAtIso = new Date().toISOString();
    const runId = `run-${scenarioId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((header) =>
        header.ScenarioRunID === scenarioId
          ? {
              ...header,
              Status: 'Running',
              LastRunBy: currentUserDisplayName,
              LastRunAt: runningAtIso,
              LastUpdatedAt: runningAtIso,
            }
          : header
      ),
    }));
    persistHeaderToRepository(scenarioId, {
      Status: 'Running',
      LastRunBy: currentUserDisplayName,
      LastRunAt: runningAtIso,
      LastUpdatedAt: runningAtIso,
    });
    upsertRunHistoryEntry(scenarioId, {
      runId,
      scenarioId,
      scenarioName: scenario.RunName || scenarioId,
      dataflowId,
      executionId: null,
      status: 'Running',
      triggeredBy: currentUserDisplayName,
      startedAt: runningAtIso,
      completedAt: null,
      durationMs: null,
      message: null,
    });

    const runningNotificationId = pushNotification({
      kind: 'info',
      title: 'Scenario run started',
      message: `${scenario.RunName || scenarioId} is now running.`,
      entity: { type: 'scenario', id: scenarioId },
      metadata: { dataflowId },
    });

    if (IS_READONLY_SCENARIO_RUN_MODE) {
      console.log('[Scenario Run] mode=readonly', {
        scenarioId,
        scenarioName: scenario.RunName || scenarioId,
        dataflowId,
        delayMs: READONLY_SCENARIO_RUN_DELAY_MS,
      });

      readonlyRunTimersRef.current[scenarioId] = window.setTimeout(() => {
        void (async () => {
          try {
            await loadDomoDc();
            const completionTimeIso = new Date().toISOString();
            clearPollingForScenario(scenarioId);
            setScenarioState((prev) => ({
              ...prev,
              headers: prev.headers.map((header) =>
                header.ScenarioRunID === scenarioId
                  ? {
                      ...header,
                      Status: 'Completed',
                      LastRunBy: currentUserDisplayName,
                      LastRunAt: completionTimeIso,
                      LastRunExecutionId: `readonly-${scenarioId}`,
                      LastUpdatedAt: completionTimeIso,
                    }
                  : header
              ),
            }));
            persistHeaderToRepository(scenarioId, {
              Status: 'Completed',
              LastRunBy: currentUserDisplayName,
              LastRunAt: completionTimeIso,
              LastRunExecutionId: `readonly-${scenarioId}`,
              LastUpdatedAt: completionTimeIso,
            });
            upsertRunHistoryEntry(scenarioId, {
              runId,
              scenarioId,
              scenarioName: scenario.RunName || scenarioId,
              dataflowId,
              executionId: `readonly-${scenarioId}`,
              status: 'Completed',
              triggeredBy: currentUserDisplayName,
              startedAt: runningAtIso,
              completedAt: completionTimeIso,
              durationMs: new Date(completionTimeIso).getTime() - new Date(runningAtIso).getTime(),
              message: 'Loaded latest executed outputs from Domo datasets.',
            });
            updateNotification(runningNotificationId, {
              kind: 'success',
              title: 'Scenario refreshed',
              message: `${scenario.RunName || scenarioId} loaded the latest executed outputs.`,
              metadata: { dataflowId, executionId: `readonly-${scenarioId}` },
            });
            pushToast(
              `${scenario.RunName || scenarioId} loaded the latest executed outputs from Domo.`,
              'success'
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            clearPollingForScenario(scenarioId);
            setScenarioState((prev) => ({
              ...prev,
              headers: prev.headers.map((header) =>
                header.ScenarioRunID === scenarioId
                  ? { ...header, Status: priorStatus, LastUpdatedAt: new Date().toISOString() }
                  : header
              ),
            }));
            persistHeaderToRepository(scenarioId, {
              Status: priorStatus,
              LastUpdatedAt: new Date().toISOString(),
            });
            updateNotification(runningNotificationId, {
              kind: 'error',
              title: 'Scenario refresh failed',
              message: `${scenario.RunName || scenarioId}: ${message}`,
              metadata: { dataflowId },
            });
            pushToast(`Failed to refresh ${scenario.RunName || scenarioId}. ${message}`, 'error');
          } finally {
            delete readonlyRunTimersRef.current[scenarioId];
          }
        })();
      }, READONLY_SCENARIO_RUN_DELAY_MS);

      return;
    }

    try {
      const execution = await triggerDataflow(dataflowId);
      pushToast(
        `${scenario.RunName || scenarioId} is running. Dataflow ${dataflowId}, execution ${execution.id}.`,
        'info'
      );
      updateNotification(runningNotificationId, {
        message: `${scenario.RunName || scenarioId} is running. Dataflow ${dataflowId}, execution ${execution.id}.`,
        metadata: { dataflowId, executionId: String(execution.id) },
      });

      let pollAttempts = 0;
      let consecutivePollErrors = 0;
      const executionId = execution.id;

      const pollExecution = async () => {
        pollAttempts += 1;
        if (pollAttempts > DATAFLOW_MAX_POLL_ATTEMPTS) {
          clearPollingForScenario(scenarioId);
          setScenarioState((prev) => ({
            ...prev,
            headers: prev.headers.map((header) =>
              header.ScenarioRunID === scenarioId
                ? { ...header, Status: priorStatus, LastUpdatedAt: new Date().toISOString() }
                : header
            ),
          }));
          persistHeaderToRepository(scenarioId, {
            Status: priorStatus,
            LastUpdatedAt: new Date().toISOString(),
          });
          updateNotification(runningNotificationId, {
            kind: 'error',
            title: 'Scenario timed out',
            message: `${scenario.RunName || scenarioId} timed out after ${DATAFLOW_MAX_POLL_ATTEMPTS} checks.`,
            metadata: { dataflowId, executionId: String(executionId) },
          });
          pushToast(
            `${scenario.RunName || scenarioId} timed out after ${DATAFLOW_MAX_POLL_ATTEMPTS} checks. Execution ${executionId}.`,
            'error'
          );
          return;
        }

        try {
          const status = await checkDataflowStatus(dataflowId, executionId);
          consecutivePollErrors = 0;

          if (status.state === 'SUCCESS') {
            clearPollingForScenario(scenarioId);
            await loadDomoDc();
            const completionTimeIso = new Date().toISOString();
            setScenarioState((prev) => ({
              ...prev,
              headers: prev.headers.map((header) =>
                header.ScenarioRunID === scenarioId
                  ? {
                      ...header,
                      Status: 'Completed',
                      LastRunBy: currentUserDisplayName,
                      LastRunAt: completionTimeIso,
                      LastRunExecutionId: String(executionId),
                      LastUpdatedAt: completionTimeIso,
                    }
                  : header
              ),
            }));
            persistHeaderToRepository(scenarioId, {
              Status: 'Completed',
              LastRunBy: currentUserDisplayName,
              LastRunAt: completionTimeIso,
              LastRunExecutionId: String(executionId),
              LastUpdatedAt: completionTimeIso,
            });
            upsertRunHistoryEntry(scenarioId, {
              runId,
              scenarioId,
              scenarioName: scenario.RunName || scenarioId,
              dataflowId,
              executionId: String(executionId),
              status: 'Completed',
              triggeredBy: currentUserDisplayName,
              startedAt: runningAtIso,
              completedAt: completionTimeIso,
              durationMs: new Date(completionTimeIso).getTime() - new Date(runningAtIso).getTime(),
              message: 'Dataflow completed successfully.',
            });
            updateNotification(runningNotificationId, {
              kind: 'success',
              title: 'Scenario completed',
              message: `${scenario.RunName || scenarioId} completed successfully.`,
              metadata: { dataflowId, executionId: String(executionId) },
            });
            pushToast(
              `${scenario.RunName || scenarioId} completed successfully. Dataflow ${dataflowId}, execution ${executionId}.`,
              'success'
            );
            try {
              if (currentUserEmail) {
                await triggerScenarioCompletionEmail({
                  scenarioName: scenario.RunName || scenarioId,
                  scenarioId,
                  dataflowId,
                  executionId,
                  completedAtIso: completionTimeIso,
                });
                pushToast(`Completion email sent to ${currentUserEmail}.`, 'success');
                pushNotification({
                  kind: 'success',
                  title: 'Completion email sent',
                  message: `Scenario completion email was sent to ${currentUserEmail}.`,
                  entity: { type: 'email', id: `scenario-${scenarioId}` },
                  metadata: { dataflowId, executionId: String(executionId) },
                });
              } else {
                pushNotification({
                  kind: 'warning',
                  title: 'Completion email skipped',
                  message: 'No recipient email was resolved for the current user.',
                  entity: { type: 'email', id: `scenario-${scenarioId}` },
                  metadata: { dataflowId, executionId: String(executionId) },
                });
              }
            } catch (emailError) {
              const message = emailError instanceof Error ? emailError.message : String(emailError);
              pushToast(`Scenario completed, but email notification failed: ${message}`, 'error');
              pushNotification({
                kind: 'error',
                title: 'Completion email failed',
                message,
                entity: { type: 'email', id: `scenario-${scenarioId}` },
                metadata: { dataflowId, executionId: String(executionId) },
              });
            }
            return;
          } else if (status.state === 'FAILED') {
            clearPollingForScenario(scenarioId);
            setScenarioState((prev) => ({
              ...prev,
              headers: prev.headers.map((header) =>
                header.ScenarioRunID === scenarioId
                  ? { ...header, Status: priorStatus, LastUpdatedAt: new Date().toISOString() }
                  : header
              ),
            }));
            persistHeaderToRepository(scenarioId, {
              Status: priorStatus,
              LastUpdatedAt: new Date().toISOString(),
            });
            upsertRunHistoryEntry(scenarioId, {
              runId,
              scenarioId,
              scenarioName: scenario.RunName || scenarioId,
              dataflowId,
              executionId: String(executionId),
              status: 'Failed',
              triggeredBy: currentUserDisplayName,
              startedAt: runningAtIso,
              completedAt: new Date().toISOString(),
              durationMs: new Date().getTime() - new Date(runningAtIso).getTime(),
              message: `${scenario.RunName || scenarioId} failed during execution ${executionId}.`,
            });
            updateNotification(runningNotificationId, {
              kind: 'error',
              title: 'Scenario failed',
              message: `${scenario.RunName || scenarioId} failed during execution ${executionId}.`,
              metadata: { dataflowId, executionId: String(executionId) },
            });
            pushToast(
              `${scenario.RunName || scenarioId} failed. Dataflow ${dataflowId}, execution ${executionId}.`,
              'error'
            );
            return;
          }
        } catch (pollErr) {
          consecutivePollErrors += 1;
          console.error('Error polling dataflow status:', pollErr);
          const pollMessage = pollErr instanceof Error ? pollErr.message : String(pollErr);
          const isFatalResponseError = pollMessage.includes('Invalid dataflow status response');
          if (isFatalResponseError) {
            clearPollingForScenario(scenarioId);
            setScenarioState((prev) => ({
              ...prev,
              headers: prev.headers.map((header) =>
                header.ScenarioRunID === scenarioId
                  ? { ...header, Status: priorStatus, LastUpdatedAt: new Date().toISOString() }
                  : header
              ),
            }));
            persistHeaderToRepository(scenarioId, {
              Status: priorStatus,
              LastUpdatedAt: new Date().toISOString(),
            });
            upsertRunHistoryEntry(scenarioId, {
              runId,
              scenarioId,
              scenarioName: scenario.RunName || scenarioId,
              dataflowId,
              executionId: String(executionId),
              status: 'Failed',
              triggeredBy: currentUserDisplayName,
              startedAt: runningAtIso,
              completedAt: new Date().toISOString(),
              durationMs: new Date().getTime() - new Date(runningAtIso).getTime(),
              message: `Polling stopped after repeated errors.`,
            });
            updateNotification(runningNotificationId, {
              kind: 'error',
              title: 'Polling stopped',
              message: `${scenario.RunName || scenarioId}: ${pollMessage}`,
              metadata: { dataflowId, executionId: String(executionId) },
            });
            pushToast(
              `Stopped ETL polling for ${scenario.RunName || scenarioId}. ${pollMessage}`,
              'error'
            );
            return;
          }
          if (consecutivePollErrors >= DATAFLOW_MAX_CONSECUTIVE_POLL_ERRORS) {
            clearPollingForScenario(scenarioId);
            setScenarioState((prev) => ({
              ...prev,
              headers: prev.headers.map((header) =>
                header.ScenarioRunID === scenarioId
                  ? { ...header, Status: priorStatus, LastUpdatedAt: new Date().toISOString() }
                  : header
              ),
            }));
            updateNotification(runningNotificationId, {
              kind: 'error',
              title: 'Polling stopped',
              message: `${scenario.RunName || scenarioId} stopped polling after repeated errors.`,
              metadata: { dataflowId, executionId: String(executionId) },
            });
            const message = pollErr instanceof Error ? pollErr.message : 'Unknown error';
            pushToast(
              `Polling stopped for ${scenario.RunName || scenarioId} after ${DATAFLOW_MAX_CONSECUTIVE_POLL_ERRORS} errors. Execution ${executionId}. ${message}`,
              'error'
            );
            return;
          }
        }

        pollingTimersRef.current[scenarioId] = window.setTimeout(() => {
          void pollExecution();
        }, DATAFLOW_POLL_INTERVAL_MS);
      };

      void pollExecution();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const failureTimeIso = new Date().toISOString();
      clearPollingForScenario(scenarioId);
      setScenarioState((prev) => ({
        ...prev,
        headers: prev.headers.map((header) =>
          header.ScenarioRunID === scenarioId
            ? {
                ...header,
                Status: 'Failed',
                LastRunBy: currentUserDisplayName,
                LastRunAt: failureTimeIso,
                LastRunExecutionId: null,
                LastUpdatedAt: failureTimeIso,
              }
            : header
        ),
      }));
      persistHeaderToRepository(scenarioId, {
        Status: 'Failed',
        LastRunBy: currentUserDisplayName,
        LastRunAt: failureTimeIso,
        LastRunExecutionId: null,
        LastUpdatedAt: failureTimeIso,
      });
      upsertRunHistoryEntry(scenarioId, {
        runId,
        scenarioId,
        scenarioName: scenario.RunName || scenarioId,
        dataflowId,
        executionId: null,
        status: 'Failed',
        triggeredBy: currentUserDisplayName,
        startedAt: runningAtIso,
        completedAt: failureTimeIso,
        durationMs: new Date(failureTimeIso).getTime() - new Date(runningAtIso).getTime(),
        message,
      });
      updateNotification(runningNotificationId, {
        kind: 'error',
        title: 'Scenario trigger failed',
        message: `${scenario.RunName || scenarioId} could not start: ${message}`,
        metadata: { dataflowId },
      });
      pushToast(`Failed to trigger ETL for ${scenario.RunName || scenarioId}. Dataflow ${dataflowId}. ${message}`, 'error');
    }
  };
  const blockingMessage = uiBusyMessage || (!domoDcLoaded ? 'Loading scenario data...' : '');
  const renderPage = () => {
    switch (appState.currentPage) {
      case 'home':
        return (
          <Home
            onOpenScenario={navigateToScenario}
            onOpenComparison={navigateToComparison}
            onNewScenario={handleNewScenario}
            onNewComparison={handleNewComparison}
            onDataHealth={handleDataHealth}
            workspace={workspace}
            onWorkspaceChange={setWorkspace}
            scenarioRunHeaders={scenarioState.headers}
            scenarioRunResultsDC={scenarioState.resultsDC}
            comparisonHeaders={comparisonState.headers}
            dataHealthSnapshot={dataHealthSnapshot}
            onDuplicateScenario={duplicateScenario}
            onArchiveScenario={archiveScenario}
            onUnarchiveScenario={unarchiveScenario}
            onDeleteScenario={deleteScenario}
            onDuplicateComparison={duplicateComparison}
            onArchiveComparison={archiveComparison}
            onUnarchiveComparison={unarchiveComparison}
            onDeleteComparison={deleteComparison}
            onRefresh={refreshData}
            onRefreshComparisons={refreshComparisonsFromAppDb}
            comparisonsRefreshActive={comparisonsRefreshActive}
            onRunScenario={handleRunScenario}
            runningScenarioId={runningScenarioId}
            currentUserDisplayName={currentUserDisplayName}
            currentUserEmail={currentUserEmail}
            notificationCount={unreadNotificationCount}
            onOpenNotifications={() => setShowNotifications(true)}
            onSendTestEmail={handleSendTestEmail}
            testEmailActive={testEmailActive}
            onRefreshNotifications={refreshNotificationsFromAppDb}
            notificationsRefreshActive={notificationsRefreshActive}
          />
        );

      case 'scenario':
        if (!appState.selectedScenarioId) {
          navigateToHome();
          return null;
        }
        return (
          <ScenarioDetails
            scenarioId={appState.selectedScenarioId}
            onBack={navigateToHome}
            scenarioRunHeaders={scenarioState.headers}
            scenarioRunConfigs={scenarioState.configs}
            scenarioRunResultsDC={scenarioState.resultsDC}
          scenarioRunResultsLanes={scenarioState.resultsLanes}
          scenarioOverrides={scenarioState.overrides}
          recentRuns={scenarioHistoryState[appState.selectedScenarioId] || []}
          onDuplicateScenario={duplicateScenario}
          onPublishScenario={publishScenario}
          onApproveScenario={approveScenario}
          onArchiveScenario={archiveScenario}
            onAddComment={addScenarioComment}
            onApplyOverride={applyOverride}
          />
        );

      case 'comparison':
        if (!appState.selectedComparisonId) {
          navigateToHome();
          return null;
        }
        return (
          <ComparisonDetails
            comparisonId={appState.selectedComparisonId}
            onBack={navigateToHome}
            scenarioRunHeaders={scenarioState.headers}
            comparisonHeaders={comparisonState.headers}
            comparisonDetailDC={comparisonState.detailDC}
            comparisonDetailLanes={comparisonState.detailLanes}
            scenarioRunResultsDC={scenarioState.resultsDC}
            scenarioRunResultsLanes={scenarioState.resultsLanes}
            onPublishComparison={publishComparison}
            onAddDecision={addComparisonDecision}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderPage()}

      {blockingMessage ? (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <div className="flex min-w-[18rem] flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white px-6 py-5 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-900">{blockingMessage}</div>
              <div className="mt-1 text-xs text-slate-500">Please wait, this may take few seconds.</div>
            </div>
          </div>
        </div>
      ) : null}

        <NewScenarioWizard
          isOpen={showNewScenario}
          onClose={() => setShowNewScenario(false)}
          onComplete={handleScenarioComplete}
          dataHealthSnapshot={dataHealthSnapshot}
          availableRegions={['All', 'US', 'Canada']}
          missingDataReasons={datasetContext.missingDataReasons}
          scenarioTemplatesByRegion={scenarioTemplatesByRegion}
          datasetOptions={datasetOptions}
        />

      <NewComparisonModal
        isOpen={showNewComparison}
        onClose={() => setShowNewComparison(false)}
        onComplete={handleComparisonComplete}
        scenarioRunHeaders={scenarioState.headers}
        preselectedA={preselectedRuns.a}
        preselectedB={preselectedRuns.b}
      />

      <DataHealthModal
        isOpen={showDataHealth}
        onClose={() => setShowDataHealth(false)}
        dataHealthSnapshot={dataHealthSnapshot}
        missingLanes={scenarioState.resultsLanes
          .filter((lane) => {
            const scenario = scenarioState.headers.find((s) => s.ScenarioRunID === lane.ScenarioRunID);
            if (!scenario) return false;
            if (workspace !== 'All' && scenario.Region !== workspace) return false;
            return (
              lane.NotesFlag?.toLowerCase().includes('missing') ||
              lane.SLABreachFlag === 'Y' ||
              lane.ExcludedBySLAFlag === 'Y'
            );
          })
          .slice(0, 50)}
      />

      <NotificationCenter
        isOpen={showNotifications}
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onRefresh={refreshNotificationsFromAppDb}
        refreshActive={notificationsRefreshActive}
        onMarkRead={markNotificationRead}
        onDismiss={dismissNotification}
        onClearAll={clearNotifications}
        onOpenScenario={navigateToScenario}
        onOpenComparison={navigateToComparison}
      />

      <div className="fixed top-4 right-4 z-[10000] flex w-[min(32rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            kind={toast.kind}
            message={toast.message}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
}

export default App;
