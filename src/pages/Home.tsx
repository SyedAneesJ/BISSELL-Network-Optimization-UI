import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { downloadBlob, toCSV, useActionFeedback } from '@/utils';
import {
  ScenarioRunHeader,
  ComparisonHeader,
  DataHealthSnapshot,
  ScenarioRunResultsDC,
} from '@/data';
import { AppPage } from '@/layouts';
import { createScenarioColumns, createComparisonColumns } from '@/lib';
import {
  HomeAlertsSection,
  HomeComparisonsSection,
  HomeHeader,
  HomeKpiRow,
  HomeScenarioRunsSection,
} from '@/sections/home';
import { Button, Modal } from '@/components/ui';

interface HomeProps {
  onOpenScenario: (scenarioId: string) => void;
  onOpenComparison: (comparisonId: string) => void;
  onNewScenario: () => void;
  onNewComparison: (preselectedA?: string, preselectedB?: string) => void;
  onDataHealth: () => void;
  workspace: 'All' | 'US' | 'Canada';
  onWorkspaceChange: (workspace: 'All' | 'US' | 'Canada') => void;
  scenarioRunHeaders: ScenarioRunHeader[];
  scenarioRunResultsDC: ScenarioRunResultsDC[];
  comparisonHeaders: ComparisonHeader[];
  dataHealthSnapshot: DataHealthSnapshot;
  onDuplicateScenario: (scenarioId: string) => void;
  onArchiveScenario: (scenarioId: string) => void;
  onUnarchiveScenario: (scenarioId: string) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onDuplicateComparison: (comparisonId: string) => void;
  onArchiveComparison: (comparisonId: string) => void;
  onUnarchiveComparison: (comparisonId: string) => void;
  onDeleteComparison: (comparisonId: string) => void | Promise<void>;
  onRefresh: () => void;
  onRefreshComparisons: () => void;
  comparisonsRefreshActive: boolean;
  onRunScenario: (scenarioId: string) => void;
  runningScenarioId?: string | null;
  currentUserDisplayName: string;
  currentUserEmail?: string | null;
  notificationCount: number;
  onOpenNotifications: () => void;
  onSendTestEmail: () => void;
  testEmailActive?: boolean;
}

export const Home: React.FC<HomeProps> = ({
  onOpenScenario,
  onOpenComparison,
  onNewScenario,
  onNewComparison,
  onDataHealth,
  workspace,
  onWorkspaceChange,
  scenarioRunHeaders,
  scenarioRunResultsDC,
  comparisonHeaders,
  dataHealthSnapshot,
  onDuplicateScenario,
  onArchiveScenario,
  onUnarchiveScenario,
  onDeleteScenario,
  onDuplicateComparison,
  onArchiveComparison,
  onUnarchiveComparison,
  onDeleteComparison,
  onRefresh,
  onRefreshComparisons,
  comparisonsRefreshActive,
  onRunScenario,
  runningScenarioId,
  currentUserDisplayName,
  currentUserEmail,
  notificationCount,
  onOpenNotifications,
  onSendTestEmail,
  testEmailActive,
}) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const handleRefresh = () => {
    onRefresh();
    triggerAction('refresh_data');
  };
  const handleRefreshComparisons = () => {
    onRefreshComparisons();
    triggerAction('refresh_comparisons');
  };
  const [scenarioToRun, setScenarioToRun] = useState<string | null>(null);
  const [scenarioMonitorId, setScenarioMonitorId] = useState<string | null>(null);
  const [runningIconIndex, setRunningIconIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const hasComparisons = comparisonHeaders.length > 0;

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [scenarioTypeFilter, setScenarioTypeFilter] = useState<string[]>([]);
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [onlyPublished, setOnlyPublished] = useState(false);
  const [pendingDeleteScenario, setPendingDeleteScenario] = useState<ScenarioRunHeader | null>(null);
  const [pendingDeleteComparison, setPendingDeleteComparison] = useState<ComparisonHeader | null>(null);
  const visibleScenarioRunHeaders = useMemo(() => {
    const isOriginalScenario = (scenario: ScenarioRunHeader) =>
      !String(scenario.CreatedBy || '').trim() || String(scenario.CreatedBy || '').trim() === 'NA';

    const isUsBaselineScenario = (scenario: ScenarioRunHeader) =>
      scenario.Region === 'US'
      && isOriginalScenario(scenario)
      && (
        String(scenario.DataflowID || '').trim() === '3228'
        || String(scenario.RunName || '').toLowerCase().includes('baseline')
      );

    return scenarioRunHeaders.filter((scenario) => isUsBaselineScenario(scenario) || !isOriginalScenario(scenario));
  }, [scenarioRunHeaders]);

  const visibleScenarioRunIds = useMemo(
    () => new Set(visibleScenarioRunHeaders.map((scenario) => scenario.ScenarioRunID)),
    [visibleScenarioRunHeaders]
  );

  const visibleScenarioRunResultsDC = useMemo(
    () => scenarioRunResultsDC.filter((row) => visibleScenarioRunIds.has(row.ScenarioRunID)),
    [scenarioRunResultsDC, visibleScenarioRunIds]
  );

  const entityLabels = useMemo(() => {
    const entities = new Set<string>();
    visibleScenarioRunHeaders.forEach((s) => {
      s.EntityScope?.split('/').forEach((e) => {
        const trimmed = e.trim();
        if (trimmed && trimmed.toLowerCase() !== 'unknown' && trimmed.toLowerCase() !== 'na') {
          entities.add(trimmed);
        }
      });
    });
    const list = Array.from(entities);
    return {
      first: list[0] || 'Entity A',
      second: list[1] || 'Entity B',
    };
  }, [visibleScenarioRunHeaders]);
  const filteredScenarios = useMemo(() => {
    const filtered = visibleScenarioRunHeaders.filter(scenario => {
      if (workspace !== 'All' && scenario.Region !== workspace) return false;
      if (searchTerm && !scenario.RunName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter !== 'All' && scenario.Status !== statusFilter) return false;
      if (scenarioTypeFilter.length > 0 && !scenarioTypeFilter.includes(scenario.ScenarioType)) return false;
      if (onlyAlerts && !scenario.AlertFlags) return false;
      if (onlyPublished && scenario.Status !== 'Published') return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const createdA = new Date(a.CreatedAt || a.LastUpdatedAt || 0).getTime();
      const createdB = new Date(b.CreatedAt || b.LastUpdatedAt || 0).getTime();
      if (createdA !== createdB) return createdB - createdA;
      return a.RunName.localeCompare(b.RunName);
    });
  }, [visibleScenarioRunHeaders, workspace, searchTerm, statusFilter, scenarioTypeFilter, onlyAlerts, onlyPublished]);

  const filteredComparisons = useMemo(() => {
    return comparisonHeaders.filter(comp => {
      const scenarioA = scenarioRunHeaders.find(s => s.ScenarioRunID === comp.ScenarioRunID_A);
      const scenarioB = scenarioRunHeaders.find(s => s.ScenarioRunID === comp.ScenarioRunID_B);

      if (workspace !== 'All') {
        if (!scenarioA || !scenarioB) return false;
        if (scenarioA.Region !== workspace || scenarioB.Region !== workspace) return false;
      }
      return true;
    });
  }, [comparisonHeaders, scenarioRunHeaders, workspace]);

  const requestDeleteScenario = (scenarioId: string) => {
    const target = visibleScenarioRunHeaders.find((scenario) => scenario.ScenarioRunID === scenarioId) || null;
    if (!target) return;
    setPendingDeleteScenario(target);
  };

  const requestDeleteComparison = (comparisonId: string) => {
    const target = comparisonHeaders.find((comparison) => comparison.ComparisonID === comparisonId) || null;
    if (!target) return;
    setPendingDeleteComparison(target);
  };

  const confirmDeleteScenario = () => {
    if (!pendingDeleteScenario) return;
    onDeleteScenario(pendingDeleteScenario.ScenarioRunID);
    triggerAction(`scenario_delete_${pendingDeleteScenario.ScenarioRunID}`);
    setPendingDeleteScenario(null);
  };

  const confirmDeleteComparison = () => {
    if (!pendingDeleteComparison) return;
    void onDeleteComparison(pendingDeleteComparison.ComparisonID);
    triggerAction(`comparison_delete_${pendingDeleteComparison.ComparisonID}`);
    setPendingDeleteComparison(null);
  };

  const cancelDeleteScenario = () => {
    setPendingDeleteScenario(null);
  };

  const comparisonEmptyStateMessage = useMemo(() => {
    if (comparisonHeaders.length === 0) {
      return 'No comparisons have been created yet.';
    }

    const reasons: string[] = [];
    if (workspace !== 'All') {
      reasons.push(`workspace "${workspace}"`);
    }

    if (reasons.length === 0) {
      return 'No comparisons match the current filters.';
    }

    return `No comparisons match the current filters (${reasons.join(' and ')}).`;
  }, [comparisonHeaders.length, workspace, searchTerm]);

  const handleSelectScenario = (scenarioId: string) => {
    const newSelected = new Set(selectedScenarios);
    if (newSelected.has(scenarioId)) {
      newSelected.delete(scenarioId);
    } else {
      newSelected.add(scenarioId);
    }
    setSelectedScenarios(newSelected);
  };

  const handleCompareSelected = () => {
    const selected = Array.from(selectedScenarios);
    if (selected.length === 2) {
      onNewComparison(selected[0], selected[1]);
    }
  };

  const handleRunSelected = () => {
    if (selectedScenarios.size === 1 && canRunSelected) {
      setScenarioToRun(Array.from(selectedScenarios)[0]);
    }
  };

  const handleConfirmRun = () => {
    if (scenarioToRun) {
      setScenarioMonitorId(scenarioToRun);
      onRunScenario(scenarioToRun);
      setScenarioToRun(null);
      setSelectedScenarios(new Set());
    }
  };

  const handleOpenScenarioFromRow = (scenarioId: string) => {
    const scenario = visibleScenarioRunHeaders.find((s) => s.ScenarioRunID === scenarioId);
    if (!scenario) return;
    if (scenario.Status === 'Running') {
      setScenarioMonitorId(scenarioId);
      return;
    }
    onOpenScenario(scenarioId);
  };

  const monitoredScenario = useMemo(
    () => (scenarioMonitorId ? visibleScenarioRunHeaders.find((s) => s.ScenarioRunID === scenarioMonitorId) || null : null),
    [scenarioMonitorId, visibleScenarioRunHeaders]
  );

  useEffect(() => {
    if (runningScenarioId) {
      setScenarioMonitorId(runningScenarioId);
    }
  }, [runningScenarioId]);

  useEffect(() => {
    if (!scenarioMonitorId || !monitoredScenario || monitoredScenario.Status !== 'Running') return undefined;
    const timerId = window.setInterval(() => {
      setRunningIconIndex((prev) => (prev + 1) % 3);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [scenarioMonitorId, monitoredScenario]);

  const runningIcons = [
    <Loader2 key="loader" className="w-8 h-8 text-blue-600 animate-spin" />,
    <Activity key="activity" className="w-8 h-8 text-indigo-600 animate-pulse" />,
    <Sparkles key="sparkles" className="w-8 h-8 text-cyan-600 animate-pulse" />,
  ];

  const selectedScenarioForRun = useMemo(() => {
    if (selectedScenarios.size !== 1) return null;
    const selectedId = Array.from(selectedScenarios)[0];
    return visibleScenarioRunHeaders.find((scenario) => scenario.ScenarioRunID === selectedId) || null;
  }, [selectedScenarios, visibleScenarioRunHeaders]);

  const canRunSelected = !!selectedScenarioForRun
    && selectedScenarioForRun.Status !== 'Running'
    && !!selectedScenarioForRun.DataflowID;

  const alertCounts = useMemo(() => {
    const overCap = filteredScenarios.filter(s => s.AlertFlags?.includes('OverCap')).length;
    const sla = filteredScenarios.filter(s => s.AlertFlags?.includes('SLA')).length;
    const missingRates = filteredScenarios.filter(s => s.AlertFlags?.includes('MissingRates')).length;
    const assumptions = filteredScenarios.filter(s => s.AlertFlags?.includes('Assumed')).length;

    return { overCap, sla, missingRates, assumptions };
  }, [filteredScenarios]);

  const aggregateKPIs = useMemo(() => {
    const isOriginalScenario = (scenario: ScenarioRunHeader) =>
      !String(scenario.CreatedBy || '').trim() || String(scenario.CreatedBy || '').trim() === 'NA';
    const baselineDataflowIdsByRegion: Record<'US' | 'Canada', string> = {
      US: '3228',
      Canada: '3211',
    };

    const toNumber = (value: unknown) => {
      const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,%\s,]/g, ''));
      return Number.isFinite(n) ? n : 0;
    };

    const visibleRegions = workspace === 'All' ? (['US', 'Canada'] as const) : ([workspace] as const);

    const baselineScenarioIds = visibleRegions.flatMap((region) => {
      const originalHeaders = visibleScenarioRunHeaders.filter((scenario) => scenario.Region === region && isOriginalScenario(scenario));
      const exactMatches = originalHeaders.filter((scenario) =>
        scenario.DataflowID === baselineDataflowIdsByRegion[region]
      );
      if (exactMatches.length > 0) {
        return exactMatches.map((scenario) => scenario.ScenarioRunID);
      }

      const nameMatches = originalHeaders.filter((scenario) =>
        scenario.RunName.toLowerCase().includes('baseline')
      );
      if (nameMatches.length > 0) {
        return nameMatches.map((scenario) => scenario.ScenarioRunID);
      }

      const firstMatch = originalHeaders[0] || null;
      return firstMatch ? [firstMatch.ScenarioRunID] : [];
    });

    const baselineRows = visibleScenarioRunResultsDC.filter((row) => baselineScenarioIds.includes(row.ScenarioRunID));
    const baselineHeaders = visibleScenarioRunHeaders.filter((scenario) => baselineScenarioIds.includes(scenario.ScenarioRunID));

    const sourceRows = baselineRows.length > 0 ? baselineRows : [];
    const sourceHeaders = baselineHeaders.length > 0 ? baselineHeaders : [];

    const totalCost =
      sourceRows.length > 0
        ? sourceRows.reduce((sum, r) => sum + toNumber(r.TotalCost), 0)
        : sourceHeaders.reduce((sum, s) => sum + toNumber(s.TotalCost), 0);

    const totalSpaceRequired =
      sourceRows.length > 0
        ? sourceRows.reduce((sum, r) => sum + toNumber(r.SpaceRequired), 0)
        : sourceHeaders.reduce((sum, s) => sum + toNumber(s.TotalSpaceRequired), 0);

    const maxUtilPct =
      sourceRows.length > 0
        ? Math.max(...sourceRows.map((r) => toNumber(r.UtilPct)))
        : Math.max(...sourceHeaders.map((s) => toNumber(s.MaxUtilPct)), 0);

    const avgDeliveryDays = (() => {
      if (sourceRows.length > 0) {
        let avgDaysNumerator = 0;
        let avgDaysWeight = 0;
        sourceRows.forEach((r) => {
          const days = toNumber(r.AvgDays);
          if (days <= 0) return;
          const weight = toNumber(r.VolumeUnits) > 0 ? toNumber(r.VolumeUnits) : 1;
          avgDaysNumerator += days * weight;
          avgDaysWeight += weight;
        });
        return avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;
      }

      const numerator = sourceHeaders.reduce((sum, s) => {
        const days = toNumber(s.AvgDeliveryDays);
        const weight = toNumber(s.TotalCount) > 0 ? toNumber(s.TotalCount) : 1;
        return days > 0 ? sum + days * weight : sum;
      }, 0);
      const weight = sourceHeaders.reduce((sum, s) => {
        const days = toNumber(s.AvgDeliveryDays);
        const scenarioWeight = toNumber(s.TotalCount) > 0 ? toNumber(s.TotalCount) : 1;
        return days > 0 ? sum + scenarioWeight : sum;
      }, 0);
      return weight > 0 ? numerator / weight : 0;
    })();

    const slaBreachPct =
      sourceRows.length > 0
        ? (() => {
            let slaNumerator = 0;
            let slaWeight = 0;
            baselineScenarioIds.forEach((scenarioId) => {
              const matchingRows = sourceRows.filter((r) => r.ScenarioRunID === scenarioId);
              const count = matchingRows.length;
              if (count === 0) return;
              const scenario = visibleScenarioRunHeaders.find((item) => item.ScenarioRunID === scenarioId);
              slaNumerator += toNumber(scenario?.SLABreachPct) * count;
              slaWeight += count;
            });
            return slaWeight > 0 ? slaNumerator / slaWeight : 0;
          })()
        : (sourceHeaders.length > 0
            ? sourceHeaders.reduce((sum, s) => sum + toNumber(s.SLABreachPct), 0) / sourceHeaders.length
            : 0);

    return {
      totalCost,
      avgDeliveryDays,
      maxUtilPct,
      totalSpaceRequired,
      slaBreachPct,
    };
  }, [visibleScenarioRunHeaders, visibleScenarioRunResultsDC, workspace]);

  const handleExportScenarioList = () => {
    const rows = filteredScenarios.map((s) => ({
      ScenarioRunID: s.ScenarioRunID,
      RunName: s.RunName,
      Region: s.Region,
      ScenarioType: s.ScenarioType,
      EntityScope: s.EntityScope,
      Status: s.Status,
      TotalCost: s.TotalCost,
      CostPerUnit: s.CostPerUnit,
      AvgDeliveryDays: s.AvgDeliveryDays,
      AvgTransitDays: s.AvgTransitDays ?? '',
      TotalCount: s.TotalCount ?? '',
      SLABreachPct: s.SLABreachPct,
      ExcludedBySLACount: s.ExcludedBySLACount,
      MaxUtilPct: s.MaxUtilPct,
      TotalSpaceRequired: s.TotalSpaceRequired,
      SpaceCore: s.SpaceCore,
      SpaceBCV: s.SpaceBCV,
      FootprintMode: s.FootprintMode ?? '',
      LevelLoad: s.LevelLoad ?? '',
      UtilizationCap: s.UtilizationCap ?? '',
      CollectTreatment: s.CollectTreatment ?? '',
      OverrideCount: s.OverrideCount,
      LaneCount: s.LaneCount,
      ChangedLaneCountVsBaseline: s.ChangedLaneCountVsBaseline,
      DataflowID: s.DataflowID || '',
      BaselineScenarioID: s.BaselineScenarioID || '',
      LastRunBy: s.LastRunBy || '',
      LastRunAt: s.LastRunAt || '',
      LastRunExecutionId: s.LastRunExecutionId || '',
      ApprovedBy: s.ApprovedBy || '',
      ApprovedAt: s.ApprovedAt || '',
      LatestComment: s.LatestComment,
      Tags: s.Tags,
      DataSnapshotVersion: s.DataSnapshotVersion,
      AssumptionsSummary: s.AssumptionsSummary,
      AlertFlags: s.AlertFlags,
      CreatedBy: s.CreatedBy,
      CreatedAt: s.CreatedAt,
      LastUpdatedAt: s.LastUpdatedAt,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, 'scenario_list.csv', 'text/csv;charset=utf-8;');
    triggerAction('export_scenario_list');
  };

  const handleExportComparisonList = () => {
    const rows = filteredComparisons.map((c) => ({
      ComparisonID: c.ComparisonID,
      ComparisonName: c.ComparisonName,
      ScenarioRunID_A: c.ScenarioRunID_A,
      ScenarioRunID_B: c.ScenarioRunID_B,
      CostDelta: c.CostDelta,
      CostDeltaPct: c.CostDeltaPct,
      AvgDaysDelta: c.AvgDaysDelta,
      SLABreachDelta: c.SLABreachDelta,
      Status: c.Status,
      CreatedAt: c.CreatedAt,
      CreatedBy: c.CreatedBy,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, 'comparison_list.csv', 'text/csv;charset=utf-8;');
    triggerAction('export_comparison_list');
  };

  const handleExportScenarioRow = (row: ScenarioRunHeader) => {
    const csv = toCSV([{
      ScenarioRunID: row.ScenarioRunID,
      RunName: row.RunName,
      Region: row.Region,
      Status: row.Status,
      ScenarioType: row.ScenarioType,
      TotalCost: row.TotalCost,
      AvgDeliveryDays: row.AvgDeliveryDays,
      SLABreachPct: row.SLABreachPct,
      MaxUtilPct: row.MaxUtilPct,
      LastUpdatedAt: row.LastUpdatedAt,
      CreatedBy: row.CreatedBy,
    }]);
    downloadBlob(csv, `${row.ScenarioRunID}_scenario.csv`, 'text/csv;charset=utf-8;');
    triggerAction(`scenario_export_${row.ScenarioRunID}`);
  };

  const handleExportComparisonRow = (row: ComparisonHeader) => {
    const csv = toCSV([{
      ComparisonID: row.ComparisonID,
      ComparisonName: row.ComparisonName,
      ScenarioRunID_A: row.ScenarioRunID_A,
      ScenarioRunID_B: row.ScenarioRunID_B,
      CostDelta: row.CostDelta,
      CostDeltaPct: row.CostDeltaPct,
      AvgDaysDelta: row.AvgDaysDelta,
      SLABreachDelta: row.SLABreachDelta,
      Status: row.Status,
      CreatedAt: row.CreatedAt,
      CreatedBy: row.CreatedBy,
    }]);
    downloadBlob(csv, `${row.ComparisonID}_comparison.csv`, 'text/csv;charset=utf-8;');
    triggerAction(`comparison_export_${row.ComparisonID}`);
  };

  const scenarioColumns = createScenarioColumns({
    entityLabels,
    isActionActive,
    triggerAction,
    onDuplicateScenario,
    onArchiveScenario,
    onUnarchiveScenario,
    onDeleteScenario: requestDeleteScenario,
    onExportScenarioRow: handleExportScenarioRow,
    canDeleteScenario: (row) => String(row.CreatedBy || '').trim() !== 'NA',
  });

  const comparisonColumns = createComparisonColumns({
    scenarioRunHeaders,
    currentUserDisplayName,
    isActionActive,
    triggerAction,
    onDuplicateComparison,
    onArchiveComparison,
    onUnarchiveComparison,
    onDeleteComparison: requestDeleteComparison,
    onExportComparisonRow: handleExportComparisonRow,
  });

  return (
    <AppPage
      header={
        <HomeHeader
          workspace={workspace}
          onWorkspaceChange={onWorkspaceChange}
          currentUserDisplayName={currentUserDisplayName}
          currentUserEmail={currentUserEmail}
          notificationCount={notificationCount}
          onOpenNotifications={onOpenNotifications}
          onExportScenarioList={handleExportScenarioList}
          onExportComparisonList={handleExportComparisonList}
          onNewScenario={onNewScenario}
            onNewComparison={() => onNewComparison()}
          hasComparisons={hasComparisons}
          exportScenarioActive={isActionActive('export_scenario_list')}
          exportComparisonActive={isActionActive('export_comparison_list')}
        />
      }
    >
      <HomeKpiRow aggregateKPIs={aggregateKPIs} />

      <HomeScenarioRunsSection
        scenarioColumns={scenarioColumns}
        filteredScenarios={filteredScenarios}
        selectedScenarios={selectedScenarios}
        onSelectScenario={handleSelectScenario}
        onOpenScenario={handleOpenScenarioFromRow}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onlyAlerts={onlyAlerts}
        onOnlyAlertsChange={setOnlyAlerts}
        onlyPublished={onlyPublished}
        onOnlyPublishedChange={setOnlyPublished}
        showCompareSelected={selectedScenarios.size === 2}
        onCompareSelected={handleCompareSelected}
        canCompare={selectedScenarios.size === 2}
        onRunSelected={handleRunSelected}
        canRun={canRunSelected}
        onRefresh={handleRefresh}
        refreshActive={isActionActive('refresh_data')}
      />

      <HomeComparisonsSection
        comparisonColumns={comparisonColumns}
        filteredComparisons={filteredComparisons}
        onOpenComparison={onOpenComparison}
        emptyStateMessage={comparisonEmptyStateMessage}
        onRefresh={handleRefreshComparisons}
        refreshActive={comparisonsRefreshActive}
      />

      {false && (
        <HomeAlertsSection
          alertCounts={alertCounts}
          dataHealthSnapshot={dataHealthSnapshot}
        />
      )}

      <Modal
        isOpen={Boolean(pendingDeleteScenario)}
        onClose={cancelDeleteScenario}
        title="Delete scenario?"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={cancelDeleteScenario}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteScenario}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            This will permanently delete{' '}
            <span className="font-semibold text-slate-900">
              {pendingDeleteScenario?.RunName || 'this scenario'}
            </span>
            .
          </p>
          <p className="text-slate-500">
            Only custom scenarios can be deleted. Original ETL scenarios stay protected.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(pendingDeleteComparison)}
        onClose={() => setPendingDeleteComparison(null)}
        title="Delete comparison?"
        size="small"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDeleteComparison(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteComparison}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            This will permanently delete{' '}
            <span className="font-semibold text-slate-900">
              {pendingDeleteComparison?.ComparisonName || 'this comparison'}
            </span>
            .
          </p>
          <p className="text-slate-500">
            The AppDB record and its comparison details will be removed.
          </p>
        </div>
      </Modal>

      {/* <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Email Test</h2>
            <p className="text-sm text-slate-600">
              Send a direct test notification to {currentUserEmail || 'the current user'} without running ETL.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={onSendTestEmail}
            disabled={!currentUserEmail || !!testEmailActive}
          >
            {testEmailActive ? 'Sending...' : 'Send Test Email'}
          </Button>
        </div>
      </div> */}

      <Modal
        isOpen={!!scenarioToRun}
        onClose={() => setScenarioToRun(null)}
        title="Run Scenario"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScenarioToRun(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmRun}>Run Scenario</Button>
          </>
        }
      >
        <p className="text-slate-600">
          Are you sure you want to run the ETL dataflow for this scenario? This process may take several minutes to complete.
        </p>
      </Modal>

      <Modal
        isOpen={!!scenarioMonitorId}
        onClose={() => setScenarioMonitorId(null)}
        title="Scenario Execution Status"
        size="small"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScenarioMonitorId(null)}>
              Close
            </Button>
            {monitoredScenario && monitoredScenario.Status !== 'Running' && (
              <Button
                variant="primary"
                onClick={() => {
                  const id = monitoredScenario.ScenarioRunID;
                  setScenarioMonitorId(null);
                  onOpenScenario(id);
                }}
              >
                Open Scenario Details
              </Button>
            )}
          </>
        }
      >
        {monitoredScenario ? (
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              {monitoredScenario.Status === 'Running'
                ? runningIcons[runningIconIndex]
                : <CheckCircle2 className="w-8 h-8 text-emerald-600" />}
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900">{monitoredScenario.RunName}</p>
                <p className={`text-sm ${monitoredScenario.Status === 'Running' ? 'text-blue-700' : 'text-emerald-700'}`}>
                  {monitoredScenario.Status === 'Running' ? 'Running...' : `Status: ${monitoredScenario.Status}`}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-1 break-words">
              <p className="break-words"><span className="font-medium">Scenario ID:</span> {monitoredScenario.ScenarioRunID}</p>
              <p className="break-words"><span className="font-medium">Dataflow ID:</span> {monitoredScenario.DataflowID || 'NA'}</p>
              <p className="break-words"><span className="font-medium">Last Run By:</span> {monitoredScenario.LastRunBy || monitoredScenario.CreatedBy || 'NA'}</p>
              <p className="break-words"><span className="font-medium">Last Updated:</span> {new Date(monitoredScenario.LastUpdatedAt).toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-600">Scenario status is unavailable right now.</p>
        )}
      </Modal>
    </AppPage>
  );
};
