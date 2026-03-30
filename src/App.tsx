import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Home } from './pages/Home';
import { ScenarioDetails } from './pages/ScenarioDetails';
import { ComparisonDetails } from './pages/ComparisonDetails';
import { NewScenarioSubmit, NewScenarioWizard } from './components/NewScenarioWizard';
import { NewComparisonModal, NewComparisonSubmit } from './components/NewComparisonModal';
import { DataHealthModal } from './components/DataHealthModal';
import {
  ComparisonDetailDC,
  ComparisonDetailLane,
  ComparisonHeader,
  ScenarioOverride,
  ScenarioRunConfig,
  ScenarioRunHeader,
  ScenarioRunResultsDC,
  ScenarioRunResultsLane,
  getDataHealthSnapshot,
} from './data/mockData';
import {
  buildScenarioHeaderFromRows,
  buildDataHealthSnapshotFromRows,
  buildDatasetOptionSets,
  fetchDomoDcDatasetRows,
  getEntityOrder,
  mapDcResultsFromRows,
} from './helpers/domoDataset';

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

const SCENARIO_STORAGE_KEY = 'bno_scenarios_v2';
const COMPARISON_STORAGE_KEY = 'bno_comparisons_v1';

const loadScenarioState = (): ScenarioState => {
  if (typeof window === 'undefined') {
    return {
      headers: [],
      configs: [],
      resultsDC: [],
      resultsLanes: [],
      overrides: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) {
      return {
        headers: [],
        configs: [],
        resultsDC: [],
        resultsLanes: [],
        overrides: [],
      };
    }
    const parsed = JSON.parse(raw) as ScenarioState;
    return {
      headers: parsed.headers ?? [],
      configs: parsed.configs ?? [],
      resultsDC: parsed.resultsDC ?? [],
      resultsLanes: parsed.resultsLanes ?? [],
      overrides: parsed.overrides ?? [],
    };
  } catch {
    return {
      headers: [],
      configs: [],
      resultsDC: [],
      resultsLanes: [],
      overrides: [],
    };
  }
};

const loadComparisonState = (): ComparisonState => {
  if (typeof window === 'undefined') {
    return { headers: [], detailDC: [], detailLanes: [] };
  }

  try {
    const raw = window.localStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!raw) return { headers: [], detailDC: [], detailLanes: [] };
    const parsed = JSON.parse(raw) as ComparisonState;
    return {
      headers: parsed.headers ?? [],
      detailDC: parsed.detailDC ?? [],
      detailLanes: parsed.detailLanes ?? [],
    };
  } catch {
    return { headers: [], detailDC: [], detailLanes: [] };
  }
};

const readLocalScenarioState = (): ScenarioState => loadScenarioState();
const readLocalComparisonState = (): ComparisonState => loadComparisonState();

const mergeScenarioStates = (base: ScenarioState, local: ScenarioState): ScenarioState => {
  const baseHeaders = new Map(base.headers.map((h) => [h.ScenarioRunID, h]));
  const localHeaders = new Map(local.headers.map((h) => [h.ScenarioRunID, h]));

  const mergedHeaders: ScenarioRunHeader[] = [];
  baseHeaders.forEach((baseHeader, id) => {
    const localHeader = localHeaders.get(id);
    if (!localHeader) {
      mergedHeaders.push(baseHeader);
      return;
    }
    mergedHeaders.push({
      ...baseHeader,
      Status: localHeader.Status ?? baseHeader.Status,
      ApprovedBy: localHeader.ApprovedBy ?? baseHeader.ApprovedBy,
      ApprovedAt: localHeader.ApprovedAt ?? baseHeader.ApprovedAt,
      LatestComment: localHeader.LatestComment ?? baseHeader.LatestComment,
      Tags: localHeader.Tags ?? baseHeader.Tags,
      CreatedBy: localHeader.CreatedBy ?? baseHeader.CreatedBy,
      CreatedAt: localHeader.CreatedAt ?? baseHeader.CreatedAt,
      LastUpdatedAt: localHeader.LastUpdatedAt ?? baseHeader.LastUpdatedAt,
      OverrideCount: localHeader.OverrideCount ?? baseHeader.OverrideCount,
      Notes: (localHeader as any).Notes ?? (baseHeader as any).Notes,
    });
  });
  localHeaders.forEach((localHeader, id) => {
    if (!baseHeaders.has(id)) mergedHeaders.push(localHeader);
  });

  const mergeRowsByScenarioId = <T extends { ScenarioRunID: string }>(
    baseRows: T[],
    localRows: T[]
  ): T[] => {
    const localIds = new Set(localRows.map((r) => r.ScenarioRunID));
    const baseFiltered = baseRows.filter((r) => !localIds.has(r.ScenarioRunID));
    return [...baseFiltered, ...localRows];
  };

  const mergedConfigs = mergeRowsByScenarioId(base.configs, local.configs);
  const mergedResultsDC = mergeRowsByScenarioId(base.resultsDC, local.resultsDC);
  const mergedResultsLanes = mergeRowsByScenarioId(base.resultsLanes, local.resultsLanes);
  const mergedOverrides = mergeRowsByScenarioId(base.overrides, local.overrides);

  return {
    headers: mergedHeaders,
    configs: mergedConfigs,
    resultsDC: mergedResultsDC,
    resultsLanes: mergedResultsLanes,
    overrides: mergedOverrides,
  };
};

const mergeComparisonStates = (base: ComparisonState, local: ComparisonState): ComparisonState => {
  const byId = (rows: { ComparisonID: string }[]) => new Map(rows.map((r) => [r.ComparisonID, r]));
  const baseHeaders = byId(base.headers);
  const localHeaders = byId(local.headers);
  const mergedHeaders: ComparisonHeader[] = [];
  baseHeaders.forEach((b, id) => {
    const l = localHeaders.get(id);
    mergedHeaders.push(l ? { ...b, ...l } : b);
  });
  localHeaders.forEach((l, id) => {
    if (!baseHeaders.has(id)) mergedHeaders.push(l as ComparisonHeader);
  });

  const mergeRows = <T extends { ComparisonID: string }>(baseRows: T[], localRows: T[]): T[] => {
    const localIds = new Set(localRows.map((r) => r.ComparisonID));
    const baseFiltered = baseRows.filter((r) => !localIds.has(r.ComparisonID));
    return [...baseFiltered, ...localRows];
  };

  return {
    headers: mergedHeaders,
    detailDC: mergeRows(base.detailDC, local.detailDC),
    detailLanes: mergeRows(base.detailLanes, local.detailLanes),
  };
};

function App() {
  const [workspace, setWorkspace] = useState<'All' | 'US' | 'Canada'>('All');
  const [scenarioState, setScenarioState] = useState<ScenarioState>(() => loadScenarioState());
  const [comparisonState, setComparisonState] = useState<ComparisonState>(() => loadComparisonState());
  const [domoDcLoaded, setDomoDcLoaded] = useState(false);
  const [dataHealthSnapshot, setDataHealthSnapshot] = useState(() => getDataHealthSnapshot('All'));
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

  const [datasetOptions, setDatasetOptions] = useState(() => ({
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenarioState));
  }, [scenarioState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(comparisonState));
  }, [comparisonState]);

  const loadDomoDc = useCallback(async () => {
    try {
      const result = await fetchDomoDcDatasetRows();

      console.log('Domo dataset details:', result.dataset);
      console.log('Domo dataset CSV (sample):', result.rawCsv.slice(0, 1000));
      console.log('Domo dataset rows (sample):', result.rows.slice(0, 10));

      if (result.rows.length === 0) {
        setDomoDcLoaded(true);
        return;
      }

      const rowsByRegion = result.rows.reduce<Record<string, typeof result.rows>>((acc, row) => {
        const region = String(row['DC_region'] ?? '').trim() || 'US';
        acc[region] = acc[region] || [];
        acc[region].push(row);
        return acc;
      }, {});

      const globalEntityOrder = getEntityOrder(result.rows);
      const scenarioPayloads = Object.entries(rowsByRegion).map(([region, rows]) => {
        const scenarioId = `SR_DOMO_${region.toUpperCase()}`;
        const header = buildScenarioHeaderFromRows(rows, scenarioId, globalEntityOrder);
        const dcResults = mapDcResultsFromRows(rows, scenarioId, globalEntityOrder);
        return { header, dcResults };
      });

      setDatasetOptions(buildDatasetOptionSets(result.rows));
      setDataHealthSnapshot(buildDataHealthSnapshotFromRows(result.rows));
      const baseScenarioState: ScenarioState = {
        headers: scenarioPayloads.map((p) => p.header),
        configs: [],
        resultsDC: scenarioPayloads.flatMap((p) => p.dcResults),
        resultsLanes: [],
        overrides: [],
      };
      const localScenarioState = readLocalScenarioState();
      const mergedScenarioState = mergeScenarioStates(baseScenarioState, localScenarioState);
      setScenarioState(() => mergedScenarioState);

      const baseComparisonState: ComparisonState = { headers: [], detailDC: [], detailLanes: [] };
      const localComparisonState = readLocalComparisonState();
      const mergedComparisonState = mergeComparisonStates(baseComparisonState, localComparisonState);
      setComparisonState(mergedComparisonState);

      setDomoDcLoaded(true);
    } catch (err) {
      console.warn('Failed to load Domo dataset', err);
      setDomoDcLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (domoDcLoaded) return;
    let cancelled = false;
    loadDomoDc().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [domoDcLoaded, loadDomoDc]);

  const createScenarioHeader = (payload: NewScenarioSubmit): ScenarioRunHeader => {
    const now = new Date().toISOString();
    const numeric = (scenarioState.headers.length + 1).toString().padStart(3, '0');
    const scenarioId = `SR${numeric}`;

    const baseForRegion = [...scenarioState.headers]
      .filter(s => s.Region === payload.input.region && s.Status === 'Published')
      .sort((a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime())[0];

    const baseline =
      baseForRegion ??
      scenarioState.headers.find((s) => s.Region === payload.input.region) ??
      scenarioState.headers[0];

    const hasCostVsService = datasetOptions.costVsServiceWeights.length > 0;
    const hasUtilCap = datasetOptions.utilCaps.length > 0;
    const costShift = hasCostVsService ? (payload.input.costVsService - 50) / 500 : 0;
    const serviceShift = hasCostVsService ? (payload.input.costVsService - 50) / 100 : 0;
    const utilCapImpact = hasUtilCap
      ? payload.input.utilCap < 80 ? 0.02 : payload.input.utilCap > 90 ? -0.01 : 0
      : 0;

    const totalCost = baseline ? Math.round(baseline.TotalCost * (1 + costShift + utilCapImpact)) : 0;
    const costPerUnit = baseline ? Number((baseline.CostPerUnit * (1 + costShift)).toFixed(2)) : 0;
    const avgDays = baseline ? Number((baseline.AvgDeliveryDays * (1 - serviceShift * 0.1)).toFixed(1)) : 0;
    const slaBreach = baseline ? Number((baseline.SLABreachPct * (1 + costShift * 0.5)).toFixed(1)) : 0;
    const maxUtil = baseline ? Number((baseline.MaxUtilPct * (1 + utilCapImpact)).toFixed(2)) : 0;

    const totalSpace = baseline ? baseline.TotalSpaceRequired : 0;
    const spaceCore = baseline ? baseline.SpaceCore : 0;
    const spaceBCV = baseline ? baseline.SpaceBCV : 0;

    const alertFlags = [];
    if (hasUtilCap && payload.input.utilCap > 90) alertFlags.push('OverCap');
    if (datasetOptions.leadTimeCaps.length > 0 && payload.input.leadTimeCap <= 5) alertFlags.push('SLA');

    return {
      ScenarioRunID: scenarioId,
      RunName: payload.input.runName || `New Scenario ${scenarioId}`,
      Region: payload.input.region,
      ScenarioType: (payload.input.scenarioType || baseline?.ScenarioType || 'Baseline') as ScenarioRunHeader['ScenarioType'],
      EntityScope: payload.input.entityScope,
      ChannelScope: payload.input.channelScope.length > 0 ? payload.input.channelScope.join(',') : 'NA',
      TermsScope: payload.input.termsScope || 'NA',
      CreatedBy: 'You',
      CreatedAt: now,
      LastUpdatedAt: now,
      Status: payload.action === 'draft' ? 'Draft' : 'Running',
      ApprovedBy: null,
      ApprovedAt: null,
      LatestComment: payload.input.notes || 'NA',
      Tags: payload.input.tags.length > 0 ? payload.input.tags.join(',') : 'NA',
      DataSnapshotVersion: dataHealthSnapshot?.SnapshotTime || 'NA',
      AssumptionsSummary: 'NA',
      AlertFlags: alertFlags.join(','),
      TotalCost: totalCost,
      CostPerUnit: costPerUnit,
      AvgDeliveryDays: avgDays,
      SLABreachPct: slaBreach,
      ExcludedBySLACount: baseline ? Math.round(baseline.ExcludedBySLACount * (1 + costShift)) : 0,
      MaxUtilPct: maxUtil,
      TotalSpaceRequired: totalSpace,
      SpaceCore: spaceCore,
      SpaceBCV: spaceBCV,
      OverrideCount: 0,
      LaneCount: baseline ? baseline.LaneCount : 0,
      ChangedLaneCountVsBaseline: payload.action === 'draft' ? 0 : baseline ? Math.round(baseline.ChangedLaneCountVsBaseline * (1 + costShift)) : 0,
    };
  };

  const createScenarioConfig = (payload: NewScenarioSubmit, scenarioId: string): ScenarioRunConfig => ({
    ScenarioRunID: scenarioId,
    ActiveDCs: payload.input.activeDCs.join(','),
    SuppressedDCs: payload.input.suppressedDCs.join(','),
    FootprintMode: payload.input.footprintMode as ScenarioRunConfig['FootprintMode'],
    UtilCapPct: payload.input.utilCap,
    LevelLoadMode: payload.input.levelLoad ? 'On' : 'Off',
    LeadTimeCapDays: payload.input.leadTimeCap === 0 ? null : payload.input.leadTimeCap,
    CostVsServiceWeight: payload.input.costVsService,
    AllowRelocationPrepaid: payload.input.allowRelocationPrepaid ? 'Y' : 'N',
    AllowRelocationCollect: payload.input.allowRelocationCollect ? 'Y' : 'N',
    BCVRuleSet: payload.input.bcvRuleSet as ScenarioRunConfig['BCVRuleSet'],
    FuelSurchargeMode: payload.input.fuelSurchargeMode as ScenarioRunConfig['FuelSurchargeMode'],
    FuelSurchargeOverridePct: payload.input.fuelSurchargeOverride,
    AccessorialFlags: [
      payload.input.accessorials.residential ? 'Residential' : null,
      payload.input.accessorials.liftgate ? 'Liftgate' : null,
      payload.input.accessorials.insideDelivery ? 'InsideDelivery' : null,
    ].filter(Boolean).join(','),
    Notes: payload.input.notes || 'Created via New Scenario Wizard',
  });

  const createScenarioResultsDC = (payload: NewScenarioSubmit, scenarioId: string): ScenarioRunResultsDC[] => {
    const active = new Set(payload.input.activeDCs);
    const baselineHeader = scenarioState.headers.find((h) => h.Region === payload.input.region) ?? scenarioState.headers[0];
    const baselineResults = baselineHeader
      ? scenarioState.resultsDC.filter((r) => r.ScenarioRunID === baselineHeader.ScenarioRunID)
      : [];
    const hasUtilCap = datasetOptions.utilCaps.length > 0;

    if (baselineResults.length === 0) return [];

    return baselineResults.map((dc, idx) => ({
      ...dc,
      ScenarioRunID: scenarioId,
      UtilPct: hasUtilCap ? Math.min(dc.UtilPct, payload.input.utilCap) : dc.UtilPct,
      RankOverall: idx + 1,
      IsSuppressed: active.has(dc.DCName) ? 'N' : 'Y',
    }));
  };

  const summarizeDcResults = (rows: ScenarioRunResultsDC[]) => {
    if (rows.length === 0) {
      return {
        totalCost: 0,
        totalUnits: 0,
        costPerUnit: 0,
        avgDays: 0,
        maxUtil: 0,
        totalSpaceRequired: 0,
        excludedBySla: 0,
        slaBreachCount: 0,
        missingAvgDays: 0,
      };
    }

    const totalCost = rows.reduce((sum, row) => sum + row.TotalCost, 0);
    const totalUnits = rows.reduce((sum, row) => sum + row.VolumeUnits, 0);
    let avgDaysNumerator = 0;
    let avgDaysWeight = 0;
    rows.forEach((row) => {
      const weight = row.VolumeUnits > 0 ? row.VolumeUnits : 1;
      avgDaysNumerator += row.AvgDays * weight;
      avgDaysWeight += weight;
    });
    const avgDays = avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;
    const maxUtil = rows.reduce((max, row) => Math.max(max, row.UtilPct), 0);
    const totalSpaceRequired = rows.reduce((sum, row) => sum + row.SpaceRequired, 0);
    const excludedBySla = rows.reduce((sum, row) => sum + row.ExcludedBySLACount, 0);
    const slaBreachCount = rows.reduce((sum, row) => sum + row.SLABreachCount, 0);
    const missingAvgDays = rows.filter((row) => row.AvgDays === 0).length;

    return {
      totalCost,
      totalUnits,
      costPerUnit: totalUnits > 0 ? Number((totalCost / totalUnits).toFixed(2)) : 0,
      avgDays: Number(avgDays.toFixed(2)),
      maxUtil: Number(maxUtil.toFixed(2)),
      totalSpaceRequired,
      excludedBySla,
      slaBreachCount,
      missingAvgDays,
    };
  };

  const buildAlertFlagsFromResults = (summary: ReturnType<typeof summarizeDcResults>) => {
    const flags: string[] = [];
    if (summary.maxUtil > 100) flags.push('OverCap');
    if (summary.totalUnits > 0 && summary.slaBreachCount > 0) flags.push('SLA');
    if (summary.missingAvgDays > 0) flags.push('MissingRates');
    return flags.join(',');
  };

  const createScenarioResultsLanes = (scenarioId: string): ScenarioRunResultsLane[] => {
    const baselineLanes = scenarioState.resultsLanes.filter(l => l.ScenarioRunID === 'SR001');
    if (baselineLanes.length === 0) return [];

    return baselineLanes.slice(0, 6).map((lane, idx) => ({
      ...lane,
      ScenarioRunID: scenarioId,
      LaneCost: Number((lane.LaneCost * (1 + idx * 0.02)).toFixed(2)),
      CostDeltaVsBest: Number((lane.CostDeltaVsBest + idx * 0.05).toFixed(2)),
      DeliveryDays: Number((lane.DeliveryDays + idx * 0.1).toFixed(1)),
      OverrideAppliedFlag: 'N',
      OverrideVersion: null,
      NotesFlag: '',
    }));
  };

  const handleScenarioComplete = (payload: NewScenarioSubmit) => {
    const headerBase = createScenarioHeader(payload);
    const config = createScenarioConfig(payload, headerBase.ScenarioRunID);
    const resultsDC = createScenarioResultsDC(payload, headerBase.ScenarioRunID);
    const resultsLanes = createScenarioResultsLanes(headerBase.ScenarioRunID);
    const summary = summarizeDcResults(resultsDC);
    const header: ScenarioRunHeader = resultsDC.length === 0
      ? headerBase
      : {
          ...headerBase,
          TotalCost: summary.totalCost,
          CostPerUnit: summary.costPerUnit,
          AvgDeliveryDays: summary.avgDays,
          MaxUtilPct: summary.maxUtil,
          TotalSpaceRequired: summary.totalSpaceRequired,
          ExcludedBySLACount: summary.excludedBySla,
          AlertFlags: buildAlertFlagsFromResults(summary),
        };

    setScenarioState((prev) => ({
      headers: [header, ...prev.headers],
      configs: [config, ...prev.configs],
      resultsDC: [...resultsDC, ...prev.resultsDC],
      resultsLanes: [...resultsLanes, ...prev.resultsLanes],
      overrides: [...prev.overrides],
    }));
  };

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
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId ? { ...s, Status: 'Archived', LastUpdatedAt: new Date().toISOString() } : s
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
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? { ...s, Status: fallbackStatus, LastUpdatedAt: new Date().toISOString() }
          : s
      ),
    }));
  };

  const publishScenario = (scenarioId: string) => {
    const now = new Date().toISOString();
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? { ...s, Status: 'Published', ApprovedBy: 'You', ApprovedAt: now, LastUpdatedAt: now }
          : s
      ),
    }));
  };

  const approveScenario = (scenarioId: string) => {
    const now = new Date().toISOString();
    setScenarioState((prev) => ({
      ...prev,
      headers: prev.headers.map((s) =>
        s.ScenarioRunID === scenarioId
          ? { ...s, ApprovedBy: 'You', ApprovedAt: now, LastUpdatedAt: now }
          : s
      ),
    }));
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
  };

  const applyOverride = (
    scenarioId: string,
    overrideInput: Omit<ScenarioOverride, 'ScenarioRunID' | 'OverrideVersion' | 'UpdatedAt' | 'UpdatedBy'>
  ) => {
    const now = new Date().toISOString();
    setScenarioState((prev) => {
      const scenarioOverridesForId = prev.overrides.filter(o => o.ScenarioRunID === scenarioId);
      const newVersion = `v${scenarioOverridesForId.length + 1}`;

      const newOverride: ScenarioOverride = {
        ScenarioRunID: scenarioId,
        OverrideVersion: newVersion,
        UpdatedAt: now,
        UpdatedBy: 'You',
        ...overrideInput,
      };

      let deltaCost = 0;
      const updatedLanes = prev.resultsLanes.map((lane) => {
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

      const updatedHeaders = prev.headers.map((s) =>
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

      return {
        ...prev,
        headers: updatedHeaders,
        overrides: [newOverride, ...prev.overrides],
        resultsLanes: updatedLanes,
      };
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
      CreatedBy: 'You',
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
  // const handleComparisonComplete = () => {
  //   console.log('Comparison created successfully');
  // };

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
        availableEntities={datasetContext.entities}
        availableDcsByRegion={datasetContext.dcsByRegion}
        availableDcCapacity={datasetContext.dcCapacityByName}
        missingDataReasons={datasetContext.missingDataReasons}
        availableScenarioTypes={datasetContext.scenarioTypes}
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
    </>
  );
}

export default App;
