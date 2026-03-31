import React, { useState, useMemo } from 'react';
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
  onDuplicateComparison: (comparisonId: string) => void;
  onArchiveComparison: (comparisonId: string) => void;
  onUnarchiveComparison: (comparisonId: string) => void;
  onRefresh: () => void;
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
  onDuplicateComparison,
  onArchiveComparison,
  onUnarchiveComparison,
  onRefresh,
}) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const hasComparisons = comparisonHeaders.length > 0;

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [scenarioTypeFilter, setScenarioTypeFilter] = useState<string[]>([]);
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [onlyPublished, setOnlyPublished] = useState(false);
  const entityLabels = useMemo(() => {
    const entities = new Set<string>();
    scenarioRunHeaders.forEach((s) => {
      s.EntityScope?.split('/').forEach((e) => {
        const trimmed = e.trim();
        if (trimmed) entities.add(trimmed);
      });
    });
    const list = Array.from(entities);
    return {
      first: list[0] || 'Entity A',
      second: list[1] || 'Entity B',
    };
  }, [scenarioRunHeaders]);
  const filteredScenarios = useMemo(() => {
    return scenarioRunHeaders.filter(scenario => {
      if (workspace !== 'All' && scenario.Region !== workspace) return false;
      if (searchTerm && !scenario.RunName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (statusFilter !== 'All' && scenario.Status !== statusFilter) return false;
      if (scenarioTypeFilter.length > 0 && !scenarioTypeFilter.includes(scenario.ScenarioType)) return false;
      if (onlyAlerts && !scenario.AlertFlags) return false;
      if (onlyPublished && scenario.Status !== 'Published') return false;
      return true;
    });
  }, [scenarioRunHeaders, workspace, searchTerm, statusFilter, scenarioTypeFilter, onlyAlerts, onlyPublished]);

  const filteredComparisons = useMemo(() => {
    return comparisonHeaders.filter(comp => {
      const scenarioA = scenarioRunHeaders.find(s => s.ScenarioRunID === comp.ScenarioRunID_A);
      const scenarioB = scenarioRunHeaders.find(s => s.ScenarioRunID === comp.ScenarioRunID_B);

      if (workspace !== 'All') {
        if (!scenarioA || !scenarioB) return false;
        if (scenarioA.Region !== workspace || scenarioB.Region !== workspace) return false;
      }

      if (searchTerm && !comp.ComparisonName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [comparisonHeaders, scenarioRunHeaders, searchTerm, workspace]);

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

  const alertCounts = useMemo(() => {
    const overCap = filteredScenarios.filter(s => s.AlertFlags?.includes('OverCap')).length;
    const sla = filteredScenarios.filter(s => s.AlertFlags?.includes('SLA')).length;
    const missingRates = filteredScenarios.filter(s => s.AlertFlags?.includes('MissingRates')).length;
    const assumptions = filteredScenarios.filter(s => s.AlertFlags?.includes('Assumed')).length;

    return { overCap, sla, missingRates, assumptions };
  }, [filteredScenarios]);

  const aggregateKPIs = useMemo(() => {
    if (filteredScenarios.length === 0) {
      return {
        totalCost: 0,
        avgDeliveryDays: 0,
        maxUtilPct: 0,
        totalSpaceRequired: 0,
        slaBreachPct: 0,
      };
    }

    const visibleScenarioIds = new Set(filteredScenarios.map((s) => s.ScenarioRunID));
    const dcRows = scenarioRunResultsDC.filter((row) => visibleScenarioIds.has(row.ScenarioRunID));

    const totalCost = dcRows.reduce((sum, r) => sum + r.TotalCost, 0);
    const totalSpaceRequired = dcRows.reduce((sum, r) => sum + r.SpaceRequired, 0);
    const maxUtilPct = dcRows.length > 0 ? Math.max(...dcRows.map((r) => r.UtilPct)) : 0;

    let avgDaysNumerator = 0;
    let avgDaysWeight = 0;
    dcRows.forEach((r) => {
      if (r.AvgDays <= 0) return;
      const weight = r.VolumeUnits > 0 ? r.VolumeUnits : 1;
      avgDaysNumerator += r.AvgDays * weight;
      avgDaysWeight += weight;
    });
    const avgDeliveryDays = avgDaysWeight > 0 ? avgDaysNumerator / avgDaysWeight : 0;

    let slaNumerator = 0;
    let slaWeight = 0;
    filteredScenarios.forEach((s) => {
      const count = scenarioRunResultsDC.filter((r) => r.ScenarioRunID === s.ScenarioRunID).length;
      if (count === 0) return;
      slaNumerator += s.SLABreachPct * count;
      slaWeight += count;
    });
    const slaBreachPct = slaWeight > 0 ? slaNumerator / slaWeight : 0;

    return {
      totalCost,
      avgDeliveryDays,
      maxUtilPct,
      totalSpaceRequired,
      slaBreachPct,
    };
  }, [filteredScenarios, scenarioRunResultsDC]);

  const handleExportScenarioList = () => {
    const rows = filteredScenarios.map((s) => ({
      ScenarioRunID: s.ScenarioRunID,
      RunName: s.RunName,
      Region: s.Region,
      Status: s.Status,
      ScenarioType: s.ScenarioType,
      TotalCost: s.TotalCost,
      AvgDeliveryDays: s.AvgDeliveryDays,
      SLABreachPct: s.SLABreachPct,
      MaxUtilPct: s.MaxUtilPct,
      LastUpdatedAt: s.LastUpdatedAt,
      CreatedBy: s.CreatedBy,
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
    onExportScenarioRow: handleExportScenarioRow,
  });

  const comparisonColumns = createComparisonColumns({
    scenarioRunHeaders,
    isActionActive,
    triggerAction,
    onDuplicateComparison,
    onArchiveComparison,
    onUnarchiveComparison,
    onExportComparisonRow: handleExportComparisonRow,
  });

  return (
    <AppPage
      header={
        <HomeHeader
          workspace={workspace}
          onWorkspaceChange={onWorkspaceChange}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onDataHealth={onDataHealth}
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
        onOpenScenario={onOpenScenario}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onlyAlerts={onlyAlerts}
        onOnlyAlertsChange={setOnlyAlerts}
        onlyPublished={onlyPublished}
        onOnlyPublishedChange={setOnlyPublished}
        showCompareSelected={selectedScenarios.size === 2}
        onCompareSelected={handleCompareSelected}
        canCompare={hasComparisons}
        onRefresh={() => {
          onRefresh();
          triggerAction('refresh_data');
        }}
        refreshActive={isActionActive('refresh_data')}
      />

      <HomeComparisonsSection
        comparisonColumns={comparisonColumns}
        filteredComparisons={filteredComparisons}
        onOpenComparison={onOpenComparison}
      />

      <HomeAlertsSection
        alertCounts={alertCounts}
        dataHealthSnapshot={dataHealthSnapshot}
        onDataHealth={onDataHealth}
      />
    </AppPage>
  );
};
