import React, { useEffect, useState } from 'react';
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
  dcCapacityReference,
  getDataHealthSnapshot,
  comparisonDetailDC as mockComparisonDetailDC,
  comparisonDetailLanes as mockComparisonDetailLanes,
  comparisonHeaders as mockComparisonHeaders,
  scenarioOverrides as mockScenarioOverrides,
  scenarioRunConfigs as mockScenarioRunConfigs,
  scenarioRunHeaders as mockScenarioRunHeaders,
  scenarioRunResultsDC as mockScenarioRunResultsDC,
  scenarioRunResultsLanes as mockScenarioRunResultsLanes,
} from './data/mockData';

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
      headers: mockScenarioRunHeaders,
      configs: mockScenarioRunConfigs,
      resultsDC: mockScenarioRunResultsDC,
      resultsLanes: mockScenarioRunResultsLanes,
      overrides: mockScenarioOverrides,
    };
  }

  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) {
      return {
        headers: mockScenarioRunHeaders,
        configs: mockScenarioRunConfigs,
        resultsDC: mockScenarioRunResultsDC,
        resultsLanes: mockScenarioRunResultsLanes,
        overrides: mockScenarioOverrides,
      };
    }
    const parsed = JSON.parse(raw) as ScenarioState;
    return {
      headers: parsed.headers ?? mockScenarioRunHeaders,
      configs: parsed.configs ?? mockScenarioRunConfigs,
      resultsDC: parsed.resultsDC ?? mockScenarioRunResultsDC,
      resultsLanes: parsed.resultsLanes ?? mockScenarioRunResultsLanes,
      overrides: parsed.overrides ?? mockScenarioOverrides,
    };
  } catch {
    return {
      headers: mockScenarioRunHeaders,
      configs: mockScenarioRunConfigs,
      resultsDC: mockScenarioRunResultsDC,
      resultsLanes: mockScenarioRunResultsLanes,
      overrides: mockScenarioOverrides,
    };
  }
};

const loadComparisonState = (): ComparisonState => {
  if (typeof window === 'undefined') {
    return {
      headers: mockComparisonHeaders,
      detailDC: mockComparisonDetailDC,
      detailLanes: mockComparisonDetailLanes,
    };
  }

  try {
    const raw = window.localStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!raw) {
      return {
        headers: mockComparisonHeaders,
        detailDC: mockComparisonDetailDC,
        detailLanes: mockComparisonDetailLanes,
      };
    }
    const parsed = JSON.parse(raw) as ComparisonState;
    return {
      headers: parsed.headers ?? mockComparisonHeaders,
      detailDC: parsed.detailDC ?? mockComparisonDetailDC,
      detailLanes: parsed.detailLanes ?? mockComparisonDetailLanes,
    };
  } catch {
    return {
      headers: mockComparisonHeaders,
      detailDC: mockComparisonDetailDC,
      detailLanes: mockComparisonDetailLanes,
    };
  }
};

function App() {
  const [workspace, setWorkspace] = useState<'All' | 'US' | 'Canada'>('All');
  const [scenarioState, setScenarioState] = useState<ScenarioState>(() => loadScenarioState());
  const [comparisonState, setComparisonState] = useState<ComparisonState>(() => loadComparisonState());
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

  const createScenarioHeader = (payload: NewScenarioSubmit): ScenarioRunHeader => {
    const now = new Date().toISOString();
    const numeric = (scenarioState.headers.length + 1).toString().padStart(3, '0');
    const scenarioId = `SR${numeric}`;

    const baseForRegion = [...scenarioState.headers]
      .filter(s => s.Region === payload.input.region && s.Status === 'Published')
      .sort((a, b) => new Date(b.LastUpdatedAt).getTime() - new Date(a.LastUpdatedAt).getTime())[0];

    const baseline = baseForRegion ?? scenarioState.headers[0];

    const costShift = (payload.input.costVsService - 50) / 500; // -0.1..0.1
    const serviceShift = (payload.input.costVsService - 50) / 100; // -0.5..0.5
    const utilCapImpact = payload.input.utilCap < 80 ? 0.02 : payload.input.utilCap > 90 ? -0.01 : 0;

    const totalCost = baseline ? Math.round(baseline.TotalCost * (1 + costShift + utilCapImpact)) : 0;
    const costPerUnit = baseline ? Number((baseline.CostPerUnit * (1 + costShift)).toFixed(2)) : 0;
    const avgDays = baseline ? Number((baseline.AvgDeliveryDays * (1 - serviceShift * 0.1)).toFixed(1)) : 0;
    const slaBreach = baseline ? Number((baseline.SLABreachPct * (1 + costShift * 0.5)).toFixed(1)) : 0;
    const maxUtil = baseline ? Math.round(baseline.MaxUtilPct * (1 + utilCapImpact)) : 0;

    const totalSpace = baseline ? baseline.TotalSpaceRequired : 0;
    const spaceCore = baseline ? baseline.SpaceCore : 0;
    const spaceBCV = baseline ? baseline.SpaceBCV : 0;

    const alertFlags = [];
    if (payload.input.utilCap > 90) alertFlags.push('OverCap');
    if (payload.input.leadTimeCap <= 5) alertFlags.push('SLA');

    return {
      ScenarioRunID: scenarioId,
      RunName: payload.input.runName || `New Scenario ${scenarioId}`,
      Region: payload.input.region,
      ScenarioType: payload.input.scenarioType as ScenarioRunHeader['ScenarioType'],
      EntityScope: payload.input.entityScope,
      ChannelScope: payload.input.channelScope.join(','),
      TermsScope: payload.input.termsScope,
      CreatedBy: 'You',
      CreatedAt: now,
      LastUpdatedAt: now,
      Status: payload.action === 'draft' ? 'Draft' : 'Completed',
      ApprovedBy: null,
      ApprovedAt: null,
      LatestComment: payload.input.notes || 'New scenario created',
      Tags: payload.input.tags.join(','),
      DataSnapshotVersion: getDataHealthSnapshot(payload.input.region).SnapshotTime,
      AssumptionsSummary: payload.input.entityScope.includes('BCV')
        ? 'BCV dims assumed via carton avg'
        : 'Core entity only',
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
    FootprintMode: payload.input.footprintMode,
    UtilCapPct: payload.input.utilCap,
    LevelLoadMode: payload.input.levelLoad ? 'On' : 'Off',
    LeadTimeCapDays: payload.input.leadTimeCap === 0 ? null : payload.input.leadTimeCap,
    CostVsServiceWeight: payload.input.costVsService,
    AllowRelocationPrepaid: payload.input.allowRelocationPrepaid ? 'Y' : 'N',
    AllowRelocationCollect: payload.input.allowRelocationCollect ? 'Y' : 'N',
    BCVRuleSet: payload.input.bcvRuleSet,
    FuelSurchargeMode: payload.input.fuelSurchargeMode,
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
    const baseline = scenarioState.resultsDC.find(r => r.ScenarioRunID === 'SR001');

    return payload.input.activeDCs.map((dc, idx) => {
      const capacity = dcCapacityReference.find(d => d.DCName === dc)?.CurrentCapacity ?? 0;
      const utilPct = Math.min(payload.input.utilCap, 95);
      const totalCost = baseline ? Math.round((baseline.TotalCost / 6) * (1 + idx * 0.02)) : 0;

      return {
        ScenarioRunID: scenarioId,
        DCName: dc,
        TotalCost: totalCost,
        VolumeUnits: Math.round(totalCost / 6),
        AvgDays: Number((3.5 + idx * 0.2).toFixed(1)),
        UtilPct: utilPct,
        SpaceRequired: Math.round(capacity * (utilPct / 100)),
        SpaceCore: Math.round(capacity * (utilPct / 100) * 0.8),
        SpaceBCV: Math.round(capacity * (utilPct / 100) * 0.2),
        SLABreachCount: payload.input.leadTimeCap <= 5 ? 5 + idx : 2 + idx,
        ExcludedBySLACount: payload.input.excludeBeyondCap ? 2 + idx : 0,
        RankOverall: idx + 1,
        IsSuppressed: active.has(dc) ? 'N' : 'Y',
      };
    });
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
    const header = createScenarioHeader(payload);
    const config = createScenarioConfig(payload, header.ScenarioRunID);
    const resultsDC = createScenarioResultsDC(payload, header.ScenarioRunID);
    const resultsLanes = createScenarioResultsLanes(header.ScenarioRunID);

    setScenarioState((prev) => ({
      headers: [header, ...prev.headers],
      configs: [config, ...prev.configs],
      resultsDC: [...resultsDC, ...prev.resultsDC],
      resultsLanes: [...resultsLanes, ...prev.resultsLanes],
      overrides: [...prev.overrides],
    }));
  };

  const refreshData = () => {
    setScenarioState(loadScenarioState());
    setComparisonState(loadComparisonState());
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
        Days_Delta: (laneB?.DeliveryDays || 0) - (laneA?.DeliveryDays || 0),
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
            comparisonHeaders={comparisonState.headers}
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
        dataHealthSnapshot={getDataHealthSnapshot(workspace)}
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
        dataHealthSnapshot={getDataHealthSnapshot(workspace)}
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
