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
  fetchAllScenarioDatasets,
  getEntityOrder,
  mapDcResultsFromRows,
  resolveRegistryItemFromMeta,
  triggerDataflow,
  checkDataflowStatus,
  sendCodeEngineEmail,
  DomoApi,
} from '@/services';
import {
  buildScenarioArtifacts,
  buildScenarioRepositoryRecord,
  buildScenarioRepositoryRecordFromState,
  reconcileScenarioRepositoryRecordWithSuppressedDcs,
  createScenario as createScenarioRecord,
  archiveScenario as archiveScenarioRecord,
  duplicateScenario as duplicateScenarioRecord,
  getScenarioRecord,
  listScenarioRecords,
  saveScenarioRecord,
  updateScenario,
  updateScenarioOverrides,
  updateScenarioRunHistory,
  updateScenarioSnapshot,
  ScenarioTemplateOption,
  type ScenarioRepositoryRecord,
} from '@/services/scenario';
import { Toast } from '@/components/ui';
import { AppNotification } from '@/types/notifications';
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

const mergeScenarioStateWithRecords = (
  base: ScenarioState,
  records: ScenarioRepositoryRecord[],
): ScenarioState => {
  if (records.length === 0) return base;

  const headers = new Map<string, ScenarioRunHeader>();
  const configs = new Map<string, ScenarioRunConfig>();
  const resultsDC = new Map<string, ScenarioRunResultsDC[]>();
  const resultsLanes = new Map<string, ScenarioRunResultsLane[]>();

  records.forEach((record) => {
    if (!record.snapshot) return;
    const scenarioId = record.definition.scenarioId;
    const hydratedHeader = {
      ...cloneScenarioHeader(record.snapshot.header),
      DataflowID: record.snapshot.header.DataflowID || record.definition.dataflowId,
    };
    headers.set(scenarioId, hydratedHeader);
    configs.set(scenarioId, cloneScenarioConfig(record.snapshot.config));
    resultsDC.set(scenarioId, cloneScenarioResultsDC(record.snapshot.resultsDC));
    resultsLanes.set(scenarioId, cloneScenarioResultsLanes(record.snapshot.resultsLanes));
  });

  base.headers.forEach((header) => {
    if (!headers.has(header.ScenarioRunID)) {
      headers.set(header.ScenarioRunID, cloneScenarioHeader(header));
    }
  });

  base.configs.forEach((config) => {
    if (!configs.has(config.ScenarioRunID)) {
      configs.set(config.ScenarioRunID, cloneScenarioConfig(config));
    }
  });

  base.resultsDC.forEach((row) => {
    if (!resultsDC.has(row.ScenarioRunID)) {
      resultsDC.set(row.ScenarioRunID, cloneScenarioResultsDC(base.resultsDC.filter((item) => item.ScenarioRunID === row.ScenarioRunID)));
    }
  });

  base.resultsLanes.forEach((row) => {
    if (!resultsLanes.has(row.ScenarioRunID)) {
      resultsLanes.set(row.ScenarioRunID, cloneScenarioResultsLanes(base.resultsLanes.filter((item) => item.ScenarioRunID === row.ScenarioRunID)));
    }
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

const COMPARISON_STORAGE_KEY = 'bissell-comparisons-v1';
const NOTIFICATIONS_STORAGE_KEY = 'bissell-notifications-v1';
const DATAFLOW_POLL_INTERVAL_MS = 5000;
const DATAFLOW_MAX_POLL_ATTEMPTS = 360;
const DATAFLOW_MAX_CONSECUTIVE_POLL_ERRORS = 3;

type ToastKind = 'success' | 'error' | 'info';
interface AppToast {
  id: number;
  kind: ToastKind;
  message: string;
}

const loadNotifications = (): AppNotification[] => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse notifications from localStorage', error);
    return [];
  }
};

function App() {
  const [workspace, setWorkspace] = useState<'All' | 'US' | 'Canada'>('All');
  const [scenarioState, setScenarioState] = useState<ScenarioState>(EMPTY_SCENARIO_STATE);
  const [scenarioHistoryState, setScenarioHistoryState] = useState<ScenarioHistoryState>(EMPTY_SCENARIO_HISTORY);
  const [comparisonState, setComparisonState] = useState<ComparisonState>(() => {
    try {
      const stored = localStorage.getItem(COMPARISON_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse comparisons from localStorage', e);
    }
    return EMPTY_COMPARISON_STATE;
  });
  const [domoDcLoaded, setDomoDcLoaded] = useState(false);
  const [dataHealthSnapshot, setDataHealthSnapshot] = useState(() => buildDataHealthSnapshotFromRows([]));
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
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState('You');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [testEmailActive, setTestEmailActive] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Record<number, number>>({});
  const activeScenarioRunsRef = useRef<Set<string>>(new Set());
  const pollingTimersRef = useRef<Record<string, number>>({});

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

  const datasetContext = useMemo(() => {
    const regions = Array.from(new Set(scenarioState.headers.map((h) => h.Region))) as Array<'US' | 'Canada'>;
    const entities = new Set<string>();
    scenarioState.headers.forEach((h) => {
      h.EntityScope?.split('/').forEach((e) => {
        const trimmed = e.trim();
        if (trimmed) entities.add(trimmed);
      });
    });
    const scenarioRegionById = new Map(scenarioState.headers.map((h) => [h.ScenarioRunID, h.Region]));
    const dcsByRegion: Record<string, string[]> = {};
    scenarioState.resultsDC.forEach((dc) => {
      const region = scenarioRegionById.get(dc.ScenarioRunID) || 'US';
      dcsByRegion[region] = dcsByRegion[region] || [];
      if (!dcsByRegion[region].includes(dc.DCName)) {
        dcsByRegion[region].push(dc.DCName);
      }
    });
    const dcCapacityByName: Record<string, number> = {};
    scenarioState.resultsDC.forEach((dc) => {
      if (dcCapacityByName[dc.DCName] === undefined) {
        dcCapacityByName[dc.DCName] = dc.SpaceRequired;
      }
    });

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
  }, [scenarioState, datasetOptions]);

  const scenarioTemplatesByRegion = useMemo<Record<'US' | 'Canada', ScenarioTemplateOption[]>>(() => {
    const buildTemplate = (header: ScenarioRunHeader): ScenarioTemplateOption | null => {
      const dcRows = scenarioState.resultsDC.filter((row) => row.ScenarioRunID === header.ScenarioRunID);
      const config = scenarioState.configs.find((item) => item.ScenarioRunID === header.ScenarioRunID);
      if (dcRows.length === 0 && !config) return null;
      if (!header.DataflowID) return null;

      const availableDcs = Array.from(new Set(dcRows.map((row) => row.DCName).filter(Boolean)));
      const availableDcCapacity = dcRows.reduce<Record<string, number>>((acc, row) => {
        if (acc[row.DCName] === undefined) {
          acc[row.DCName] = row.SpaceRequired;
        }
        return acc;
      }, {});

      const accessorialFlags = config?.AccessorialFlags
        ? config.AccessorialFlags.split(',').map((flag) => flag.trim()).filter(Boolean)
        : header.Tags.split(',').map((tag) => tag.trim()).filter(Boolean);

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

    return {
      US: sortTemplates(grouped.US),
      Canada: sortTemplates(grouped.Canada),
    };
  }, [scenarioState.headers, scenarioState.configs, scenarioState.resultsDC]);

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
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'readAt'>
  ) => {
    const id = `notif-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    setNotifications((prev) => [
      {
        id,
        createdAt,
        readAt: null,
        ...notification,
      },
      ...prev,
    ]);
    return id;
  }, []);

  const updateNotification = useCallback((id: string, patch: Partial<AppNotification>) => {
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    updateNotification(id, { readAt: new Date().toISOString() });
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

  const unreadNotificationCount = notifications.filter((notification) => !notification.readAt).length;

  const loadDomoDc = useCallback(async () => {
    try {
      const datasetResults = await fetchAllScenarioDatasets();
      const allRows = datasetResults.flatMap((result) => result.rows);

      console.log('Domo datasets loaded:', datasetResults.map((d) => ({
        datasetId: d.datasetId,
        scenarioKey: d.registryItem.scenarioKey,
        rows: d.rows.length,
      })));

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
          return { header, dcResults };
        });
      }) : [];

      const dataflowSortValue = (value?: string) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
      };
      const sortedScenarioPayloads = [...scenarioPayloads].sort((a, b) => {
        const byDataflow = dataflowSortValue(a.header.DataflowID) - dataflowSortValue(b.header.DataflowID);
        if (byDataflow !== 0) return byDataflow;
        return a.header.RunName.localeCompare(b.header.RunName);
      });

      setDatasetOptions(buildDatasetOptionSets(allRows));
      setDataHealthSnapshot(buildDataHealthSnapshotFromRows(allRows));
      const baseScenarioState: ScenarioState = {
        headers: sortedScenarioPayloads.map((p) => p.header),
        configs: [],
        resultsDC: sortedScenarioPayloads.flatMap((p) => p.dcResults),
        resultsLanes: [],
        overrides: [],
      };
      const persistedBeforeSeed = listScenarioRecords();
      const persistedIds = new Set(persistedBeforeSeed.map((record) => record.definition.scenarioId));
      const legacySeedRecords = baseScenarioState.headers
        .filter((header) => !persistedIds.has(header.ScenarioRunID))
        .map((header) =>
          buildScenarioRepositoryRecordFromState(
            header,
            baseScenarioState.resultsDC.filter((row) => row.ScenarioRunID === header.ScenarioRunID),
            []
          )
        );
      legacySeedRecords.forEach((record) => {
        createScenarioRecord(record.definition, record.snapshot);
      });

      const persistedRecords = listScenarioRecords();
      setScenarioState(mergeScenarioStateWithRecords(baseScenarioState, persistedRecords));
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
    const subject = `Scenario Run Completed: ${params.scenarioName}`;
    const body = [
      `<p>Hi ${currentUserDisplayName || 'there'},</p>`,
      '<p>Your scenario ETL completed successfully.</p>',
      '<ul>',
      `<li><strong>Scenario:</strong> ${params.scenarioName}</li>`,
      `<li><strong>Scenario ID:</strong> ${params.scenarioId}</li>`,
      `<li><strong>Dataflow ID:</strong> ${params.dataflowId}</li>`,
      `<li><strong>Execution ID:</strong> ${params.executionId}</li>`,
      `<li><strong>Completed At:</strong> ${completedAt}</li>`,
      '</ul>',
      '<p>Regards,<br/>Network Optimization UI</p>',
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
    try {
      localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(comparisonState));
    } catch (e) {
      console.warn('Failed to save comparisons to localStorage', e);
    }
  }, [comparisonState]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 200)));
    } catch (e) {
      console.warn('Failed to save notifications to localStorage', e);
    }
  }, [notifications]);

  useEffect(() => {
    return () => {
      Object.values(pollingTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      pollingTimersRef.current = {};
      activeScenarioRunsRef.current.clear();
      Object.values(toastTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      toastTimersRef.current = {};
    };
  }, []);

  const handleScenarioComplete = (payload: NewScenarioSubmit) => {
    const selectedTemplate = scenarioTemplatesByRegion[payload.input.region]?.find(
      (template) => template.scenarioId === payload.input.baselineScenarioId,
    ) || null;
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

    const buildContext = {
      scenarioHeaders: scenarioState.headers,
      scenarioResultsDC: scenarioState.resultsDC,
      scenarioResultsLanes: scenarioState.resultsLanes,
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
    const artifact = buildScenarioArtifacts(payload, buildContext);
    const repositoryRecord = buildScenarioRepositoryRecord(payload, buildContext, artifact);
    createScenarioRecord(repositoryRecord.definition, repositoryRecord.snapshot);
    const { header, config, resultsDC, resultsLanes } = artifact;

    setScenarioState((prev) => ({
      headers: [header, ...prev.headers],
      configs: [config, ...prev.configs],
      resultsDC: [...resultsDC, ...prev.resultsDC],
      resultsLanes: [...resultsLanes, ...prev.resultsLanes],
      overrides: [...prev.overrides],
    }));

    navigateToHome();
  };

  const persistHeaderToRepository = useCallback((
    scenarioId: string,
    headerPatch: Partial<ScenarioRunHeader>,
  ) => {
    const record = getScenarioRecord(scenarioId);
    if (!record) return;
    const nextUpdatedAt = headerPatch.LastUpdatedAt || record.definition.updatedAt || new Date().toISOString();
    const definitionPatch: Parameters<typeof updateScenario>[1] = {
      scenarioName: headerPatch.RunName ?? record.definition.scenarioName,
      region: headerPatch.Region ?? record.definition.region,
      scenarioType: headerPatch.ScenarioType ?? record.definition.scenarioType,
      dataflowId: headerPatch.DataflowID ?? record.definition.dataflowId,
      status: headerPatch.Status ?? record.definition.status,
      lastRunBy: headerPatch.LastRunBy ?? record.definition.lastRunBy ?? null,
      lastRunAt: headerPatch.LastRunAt ?? record.definition.lastRunAt ?? null,
      lastRunExecutionId: headerPatch.LastRunExecutionId ?? record.definition.lastRunExecutionId ?? null,
      updatedAt: nextUpdatedAt,
    };
    updateScenario(scenarioId, definitionPatch);
    if (record.snapshot) {
      updateScenarioSnapshot(scenarioId, {
        ...record.snapshot,
        header: { ...record.snapshot.header, ...headerPatch },
        updatedAt: nextUpdatedAt,
      });
    }
  }, []);

  const persistScenarioRecordSnapshot = useCallback((
    scenarioId: string,
    patch: Partial<Pick<ScenarioRepositoryRecord, 'snapshot' | 'overrides'>>,
  ) => {
    const record = getScenarioRecord(scenarioId);
    if (!record) return;
    const nextSnapshot = patch.snapshot ?? record.snapshot;
    const nextOverrides = patch.overrides ?? record.overrides;
    saveScenarioRecord({
      ...record,
      definition: {
        ...record.definition,
        updatedAt: new Date().toISOString(),
      },
      snapshot: nextSnapshot,
      overrides: nextOverrides,
    });
  }, []);

  const upsertRunHistoryEntry = useCallback((
    scenarioId: string,
    entry: ScenarioRunHistoryEntry,
  ) => {
    const record = getScenarioRecord(scenarioId);
    if (!record) return;
    const nextHistory = [
      ...record.runHistory.filter((item) => item.runId !== entry.runId),
      { ...entry },
    ].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    updateScenarioRunHistory(scenarioId, nextHistory);
    setScenarioHistoryState((prev) => ({
      ...prev,
      [scenarioId]: nextHistory.map((item) => ({ ...item })),
    }));
  }, []);

  const refreshData = () => {
    setDomoDcLoaded(false);
    loadDomoDc().catch(() => undefined);
  };

  const duplicateScenario = (scenarioId: string) => {
    const sourceHeader = scenarioState.headers.find(s => s.ScenarioRunID === scenarioId);
    if (!sourceHeader) return;
    const now = new Date().toISOString();
    const numeric = (scenarioState.headers.length + 1).toString().padStart(3, '0');
    const newId = `SR${numeric}`;

    const sourceRecord = getScenarioRecord(scenarioId);
    if (sourceRecord) {
      const clonedRecord = duplicateScenarioRecord(scenarioId, newId, now);
      if (!clonedRecord) return;

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
  };

  const archiveScenario = (scenarioId: string) => {
    const now = new Date().toISOString();
    const record = getScenarioRecord(scenarioId);
    if (record) {
      archiveScenarioRecord(scenarioId, now);
      if (record.snapshot) {
        updateScenarioSnapshot(scenarioId, {
          ...record.snapshot,
          header: {
            ...record.snapshot.header,
            Status: 'Archived',
            LastUpdatedAt: now,
          },
          updatedAt: now,
        });
      }
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
    const record = getScenarioRecord(scenarioId);
    if (record) {
      updateScenario(scenarioId, {
        status: fallbackStatus,
        updatedAt: now,
      });
      if (record.snapshot) {
        updateScenarioSnapshot(scenarioId, {
          ...record.snapshot,
          header: {
            ...record.snapshot.header,
            Status: fallbackStatus,
            LastUpdatedAt: now,
          },
          updatedAt: now,
        });
      }
    }
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId ? { ...s, Status: fallbackStatus, LastUpdatedAt: now } : s
      ),
    }));
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
          lane.Channel === overrideInput.Channel &&
          lane.Terms === overrideInput.Terms &&
          lane.CustomerGroup === overrideInput.CustomerGroup
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
        const currentRecord = getScenarioRecord(scenarioId);
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
      snapshot: nextSnapshot ?? getScenarioRecord(scenarioId)?.snapshot ?? null,
      overrides: nextOverrides,
    });
  };

  const duplicateComparison = (comparisonId: string) => {
    const sourceHeader = comparisonState.headers.find(c => c.ComparisonID === comparisonId);
    if (!sourceHeader) return;
    const now = new Date().toISOString();
    const numeric = (comparisonState.headers.length + 1).toString().padStart(3, '0');
    const newId = `CMP${numeric}`;

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
    const numeric = (comparisonState.headers.length + 1).toString().padStart(3, '0');
    const comparisonId = `CMP${numeric}`;

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
    `${lane.Dest3Zip}|${lane.Channel}|${lane.Terms}|${lane.CustomerGroup}`;

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

    console.log('Comparison created successfully');
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
    const storedRecord = getScenarioRecord(scenarioId);
    if (storedRecord?.snapshot) {
      const reconciledRecord = reconcileScenarioRepositoryRecordWithSuppressedDcs(storedRecord);
      saveScenarioRecord(reconciledRecord);
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
        executionId: null,
        status: 'Failed',
        triggeredBy: currentUserDisplayName,
        startedAt: runningAtIso,
        completedAt: new Date().toISOString(),
        durationMs: new Date().getTime() - new Date(runningAtIso).getTime(),
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
            onDuplicateComparison={duplicateComparison}
            onArchiveComparison={archiveComparison}
            onUnarchiveComparison={unarchiveComparison}
            onRefresh={refreshData}
            onRunScenario={handleRunScenario}
            runningScenarioId={runningScenarioId}
            currentUserDisplayName={currentUserDisplayName}
            currentUserEmail={currentUserEmail}
            notificationCount={unreadNotificationCount}
            onOpenNotifications={() => setShowNotifications(true)}
            onSendTestEmail={handleSendTestEmail}
            testEmailActive={testEmailActive}
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

      <NewScenarioWizard
        isOpen={showNewScenario}
        onClose={() => setShowNewScenario(false)}
        onComplete={handleScenarioComplete}
        dataHealthSnapshot={dataHealthSnapshot}
        availableRegions={datasetContext.regions}
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

