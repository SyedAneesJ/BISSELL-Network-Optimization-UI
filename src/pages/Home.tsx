import React, { useState, useMemo } from 'react';
import {
  Plus, Search, Download, AlertTriangle, CheckCircle, Clock, FileText,
  Copy, Archive, Play, TrendingUp, TrendingDown, Minus, RotateCcw, RefreshCw
} from 'lucide-react';
import { StatusBadge, Button, KPICard, DataTable, Tooltip, Column } from '../components';
import { downloadBlob, toCSV } from '../utils/export';
import { useActionFeedback } from '../utils/actionFeedback';
import {
  ScenarioRunHeader,
  ComparisonHeader,
  DataHealthSnapshot,
  ScenarioRunResultsDC,
} from '../data/mockData';

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

  const scenarioColumns: Column<ScenarioRunHeader>[] = [
    {
      key: 'RunName',
      header: 'Run Name',
      width: '200px',
      sortable: true,
      render: (row) => (
        <div className="font-medium text-blue-600 hover:text-blue-800">
          {row.RunName}
        </div>
      ),
    },
    { key: 'Region', header: 'Region', width: '80px', sortable: true },
    { key: 'ScenarioType', header: 'Scenario Type', width: '180px', sortable: true },
    { key: 'EntityScope', header: 'Entity', width: '100px', sortable: true },
    {
      key: 'Status',
      header: 'Status',
      width: '120px',
      sortable: true,
      render: (row) => <StatusBadge status={row.Status} size="small" />,
    },
    {
      key: 'TotalCost',
      header: 'Total Cost',
      width: '120px',
      sortable: true,
      render: (row) => `$${row.TotalCost.toLocaleString()}`,
    },
    {
      key: 'CostPerUnit',
      header: 'Cost/Unit',
      width: '100px',
      sortable: true,
      render: (row) => row.CostPerUnit > 0 ? `$${row.CostPerUnit.toFixed(2)}` : 'NA',
    },
    {
      key: 'AvgDeliveryDays',
      header: 'Avg Days',
      width: '90px',
      sortable: true,
      render: (row) => row.AvgDeliveryDays > 0 ? row.AvgDeliveryDays.toFixed(2) : 'NA',
    },
    {
      key: 'SLABreachPct',
      header: 'SLA Breach %',
      width: '110px',
      sortable: true,
      render: (row) => (
        <span className={row.SLABreachPct > 5 ? 'text-red-600 font-medium' : ''}>
          {Number.isFinite(row.SLABreachPct) ? `${row.SLABreachPct.toFixed(2)}%` : 'NA'}
        </span>
      ),
    },
    {
      key: 'ExcludedBySLACount',
      header: 'Excluded SLA',
      width: '110px',
      sortable: true,
      render: (row) => row.ExcludedBySLACount,
    },
    {
      key: 'MaxUtilPct',
      header: 'Max Util %',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.MaxUtilPct > 85 ? 'text-amber-600 font-medium' : ''}>
          {row.MaxUtilPct > 0 ? `${row.MaxUtilPct.toFixed(2)}%` : 'NA'}
        </span>
      ),
    },
    {
      key: 'TotalSpaceRequired',
      header: 'Total Space Required',
      width: '110px',
      sortable: true,
      render: (row) => row.TotalSpaceRequired.toLocaleString(),
    },
    {
      key: 'SpaceCore',
      header: `Space ${entityLabels.first}`,
      width: '110px',
      sortable: true,
      render: (row) => row.SpaceCore.toLocaleString(),
    },
    {
      key: 'SpaceBCV',
      header: `Space ${entityLabels.second}`,
      width: '110px',
      sortable: true,
      render: (row) => row.SpaceBCV.toLocaleString(),
    },
    {
      key: 'OverrideCount',
      header: 'Overrides',
      width: '90px',
      sortable: true,
      render: (row) => row.OverrideCount || '-',
    },
    {
      key: 'LastUpdatedAt',
      header: 'Last Updated',
      width: '140px',
      sortable: true,
      render: (row) => new Date(row.LastUpdatedAt).toLocaleDateString(),
    },
    // { key: 'CreatedBy', header: 'Owner', width: '120px', sortable: true },
    {
      key: 'LatestComment',
      header: 'Latest Comment',
      width: '200px',
      render: (row) => (
        <div className="text-sm text-slate-600 truncate max-w-[200px]" title={row.LatestComment}>
          {row.LatestComment}
        </div>
      ),
    },
    {
      key: 'AlertFlags',
      header: 'Alerts',
      width: '120px',
      render: (row) => (
        <div className="flex gap-1">
          {row.AlertFlags?.includes('OverCap') && (
            <Tooltip content="Over capacity detected">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </Tooltip>
          )}
          {row.AlertFlags?.includes('SLA') && (
            <Tooltip content="SLA breaches detected">
              <Clock className="w-4 h-4 text-amber-500" />
            </Tooltip>
          )}
          {row.AlertFlags?.includes('MissingRates') && (
            <Tooltip content="Missing rate data">
              <FileText className="w-4 h-4 text-slate-400" />
            </Tooltip>
          )}
          {row.AssumptionsSummary?.includes('assumed') && (
            <Tooltip content={row.AssumptionsSummary}>
              <AlertTriangle className="w-4 h-4 text-blue-500" />
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'Actions',
      header: 'Actions',
      width: '80px',
      render: (row) => (
        <div className="flex gap-1">
          <button
            className={`p-1 hover:bg-slate-100 rounded ${isActionActive(`scenario_dup_${row.ScenarioRunID}`) ? 'bg-amber-50' : ''}`}
            title={isActionActive(`scenario_dup_${row.ScenarioRunID}`) ? 'Duplicated' : 'Duplicate'}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateScenario(row.ScenarioRunID);
              triggerAction(`scenario_dup_${row.ScenarioRunID}`);
            }}
          >
            <Copy className={`w-4 h-4 ${isActionActive(`scenario_dup_${row.ScenarioRunID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
          </button>
          <button
            className={`p-1 hover:bg-slate-100 rounded ${isActionActive(`scenario_export_${row.ScenarioRunID}`) ? 'bg-amber-50' : ''}`}
            title={isActionActive(`scenario_export_${row.ScenarioRunID}`) ? 'Exported' : 'Export'}
            onClick={(e) => {
              e.stopPropagation();
              handleExportScenarioRow(row);
            }}
          >
            <Download className={`w-4 h-4 ${isActionActive(`scenario_export_${row.ScenarioRunID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
          </button>
          <button
            className={`p-1 hover:bg-slate-100 rounded ${isActionActive(`scenario_archive_${row.ScenarioRunID}`) ? 'bg-amber-50' : ''}`}
            title={row.Status === 'Archived' ? 'Unarchive' : 'Archive'}
            onClick={(e) => {
              e.stopPropagation();
              if (row.Status === 'Archived') {
                onUnarchiveScenario(row.ScenarioRunID);
              } else {
                onArchiveScenario(row.ScenarioRunID);
              }
              triggerAction(`scenario_archive_${row.ScenarioRunID}`);
            }}
          >
            {row.Status === 'Archived' ? (
              <RotateCcw className={`w-4 h-4 ${isActionActive(`scenario_archive_${row.ScenarioRunID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
            ) : (
              <Archive className={`w-4 h-4 ${isActionActive(`scenario_archive_${row.ScenarioRunID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
            )}
          </button>
        </div>
      ),
    },
  ];

  const comparisonColumns: Column<ComparisonHeader>[] = [
    {
      key: 'ComparisonName',
      header: 'Comparison Name',
      width: '220px',
      sortable: true,
      render: (row) => (
        <div className="font-medium text-blue-600 hover:text-blue-800">
          {row.ComparisonName}
        </div>
      ),
    },
    {
      key: 'ScenarioRunID_A',
      header: 'Run A',
      width: '180px',
      render: (row) => {
        const runA = scenarioRunHeaders.find(s => s.ScenarioRunID === row.ScenarioRunID_A);
        return <div className="text-sm">{runA?.RunName || row.ScenarioRunID_A}</div>;
      },
    },
    {
      key: 'ScenarioRunID_B',
      header: 'Run B',
      width: '180px',
      render: (row) => {
        const runB = scenarioRunHeaders.find(s => s.ScenarioRunID === row.ScenarioRunID_B);
        return <div className="text-sm">{runB?.RunName || row.ScenarioRunID_B}</div>;
      },
    },
    {
      key: 'CostDelta',
      header: 'Cost Delta',
      width: '120px',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.CostDelta > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : row.CostDelta < 0 ? <TrendingDown className="w-4 h-4 text-green-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
          <span className={row.CostDelta > 0 ? 'text-red-600' : row.CostDelta < 0 ? 'text-green-600' : ''}>
            ${Math.abs(row.CostDelta).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'CostDeltaPct',
      header: 'Cost Delta %',
      width: '110px',
      sortable: true,
      render: (row) => (
        <span className={row.CostDeltaPct > 0 ? 'text-red-600' : row.CostDeltaPct < 0 ? 'text-green-600' : ''}>
          {row.CostDeltaPct > 0 ? '+' : ''}{row.CostDeltaPct.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'AvgDaysDelta',
      header: 'Days Delta',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.AvgDaysDelta > 0 ? 'text-red-600' : row.AvgDaysDelta < 0 ? 'text-green-600' : ''}>
          {row.AvgDaysDelta > 0 ? '+' : ''}{row.AvgDaysDelta.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'SLABreachDelta',
      header: 'SLA Delta',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.SLABreachDelta > 0 ? 'text-red-600' : row.SLABreachDelta < 0 ? 'text-green-600' : ''}>
          {row.SLABreachDelta > 0 ? '+' : ''}{row.SLABreachDelta.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'MaxUtilDelta',
      header: 'Util Delta',
      width: '100px',
      sortable: true,
      render: (row) => (
        <span className={row.MaxUtilDelta > 0 ? 'text-amber-600' : ''}>
          {row.MaxUtilDelta > 0 ? '+' : ''}{row.MaxUtilDelta}%
        </span>
      ),
    },
    {
      key: 'SpaceDelta',
      header: 'Space Delta',
      width: '110px',
      sortable: true,
      render: (row) => (
        <span className={row.SpaceDelta > 0 ? 'text-amber-600' : ''}>
          {row.SpaceDelta > 0 ? '+' : ''}{row.SpaceDelta.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'CreatedAt',
      header: 'Created At',
      width: '120px',
      sortable: true,
      render: (row) => new Date(row.CreatedAt).toLocaleDateString(),
    },
    { key: 'CreatedBy', header: 'Owner', width: '120px', sortable: true },
    {
      key: 'Notes',
      header: 'Notes',
      width: '180px',
      render: (row) => (
        <div className="text-sm text-slate-600 truncate max-w-[180px]" title={row.Notes}>
          {row.Notes}
        </div>
      ),
    },
    {
      key: 'DecisionVerdict',
      header: 'Decision',
      width: '150px',
      render: (row) => row.DecisionVerdict ? (
        <span className="text-sm font-medium text-green-700">{row.DecisionVerdict}</span>
      ) : (
        <span className="text-sm text-slate-400">Pending</span>
      ),
    },
    {
      key: 'Status',
      header: 'Status',
      width: '110px',
      sortable: true,
      render: (row) => <StatusBadge status={row.Status} size="small" />,
    },
    {
      key: 'Actions',
      header: 'Actions',
      width: '80px',
      render: (row) => (
        <div className="flex gap-1">
          <button
            className={`p-1 hover:bg-slate-100 rounded ${isActionActive(`comparison_dup_${row.ComparisonID}`) ? 'bg-amber-50' : ''}`}
            title={isActionActive(`comparison_dup_${row.ComparisonID}`) ? 'Duplicated' : 'Duplicate'}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateComparison(row.ComparisonID);
              triggerAction(`comparison_dup_${row.ComparisonID}`);
            }}
          >
            <Copy className={`w-4 h-4 ${isActionActive(`comparison_dup_${row.ComparisonID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
          </button>
          <button
            className={`p-1 hover:bg-slate-100 rounded ${isActionActive(`comparison_export_${row.ComparisonID}`) ? 'bg-amber-50' : ''}`}
            title={isActionActive(`comparison_export_${row.ComparisonID}`) ? 'Exported' : 'Export'}
            onClick={(e) => {
              e.stopPropagation();
              handleExportComparisonRow(row);
            }}
          >
            <Download className={`w-4 h-4 ${isActionActive(`comparison_export_${row.ComparisonID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
          </button>
          <button
            className={`p-1 hover:bg-slate-100 rounded ${isActionActive(`comparison_archive_${row.ComparisonID}`) ? 'bg-amber-50' : ''}`}
            title={row.Status === 'Archived' ? 'Unarchive' : 'Archive'}
            onClick={(e) => {
              e.stopPropagation();
              if (row.Status === 'Archived') {
                onUnarchiveComparison(row.ComparisonID);
              } else {
                onArchiveComparison(row.ComparisonID);
              }
              triggerAction(`comparison_archive_${row.ComparisonID}`);
            }}
          >
            {row.Status === 'Archived' ? (
              <RotateCcw className={`w-4 h-4 ${isActionActive(`comparison_archive_${row.ComparisonID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
            ) : (
              <Archive className={`w-4 h-4 ${isActionActive(`comparison_archive_${row.ComparisonID}`) ? 'text-amber-700' : 'text-slate-600'}`} />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 mx-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                BISSELL Network Optimization
              </h1>
              <select
                value={workspace}
                onChange={(e) => onWorkspaceChange(e.target.value as 'All' | 'US' | 'Canada')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Workspaces</option>
                <option value="US">US</option>
                <option value="Canada">Canada</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search runs and comparisons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button onClick={onDataHealth} variant="secondary" size="small">
                Data Health
              </Button>

              <div className="relative group">
                <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
                  Export
                </Button>
                <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${isActionActive('export_scenario_list') ? 'bg-amber-50 text-amber-800' : ''}`}
                    onClick={handleExportScenarioList}
                  >
                    {isActionActive('export_scenario_list') ? 'Exporting Scenario List...' : 'Export Scenario List CSV'}
                  </button>
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${!hasComparisons ? 'text-slate-400 cursor-not-allowed' : ''} ${isActionActive('export_comparison_list') ? 'bg-amber-50 text-amber-800' : ''}`}
                    onClick={handleExportComparisonList}
                    disabled={!hasComparisons}
                  >
                    {isActionActive('export_comparison_list') ? 'Exporting Comparison List...' : 'Export Comparison List CSV'}
                  </button>
                </div>
              </div>

              <Button onClick={onNewComparison} variant="secondary" size="small" icon={<Plus className="w-4 h-4" />} disabled={!hasComparisons}>
                New Comparison
              </Button>

              <Button onClick={onNewScenario} variant="primary" size="small" icon={<Plus className="w-4 h-4" />}>
                New Scenario
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="mb-6 grid grid-cols-5 gap-4">
          <KPICard
            label="Total Cost"
            value={aggregateKPIs.totalCost}
            format="currency"
            size="small"
            tooltip="Total network cost across filtered scenarios"
          />
          <KPICard
            label="Avg Delivery Days"
            value={aggregateKPIs.avgDeliveryDays}
            format="decimal"
            size="small"
            tooltip="Average delivery time across filtered scenarios"
          />
          <KPICard
            label="Max Utilization"
            value={aggregateKPIs.maxUtilPct}
            format="percent"
            size="small"
            tooltip="Highest DC utilization across filtered scenarios"
          />
          <KPICard
            label="Total Space Required"
            value={aggregateKPIs.totalSpaceRequired}
            format="number"
            size="small"
            tooltip="Total warehouse space required across filtered scenarios (in sq.ft)"
          />
          <KPICard
            label="SLA Breach %"
            value={aggregateKPIs.slaBreachPct}
            format="decimal"
            size="small"
            tooltip="Average SLA breach percentage across filtered scenarios"
          />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Scenario Runs</h2>
            <div className="flex gap-2">
              {selectedScenarios.size === 2 && (
                <Button onClick={handleCompareSelected} variant="primary" size="small" disabled={!hasComparisons} icon={<Play className="w-4 h-4" />}>
                  Compare Selected
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Status:</label>
              <select
                value={statusFilter}
                className="px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Draft">Draft</option>
                <option value="Running">Running</option>
                <option value="Completed">Completed</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <label className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAlerts}
                onChange={(e) => setOnlyAlerts(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Only Runs with Alerts</span>
            </label>

            <label className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={onlyPublished}
                onChange={(e) => setOnlyPublished(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-slate-700">Only Published</span>
            </label>

            <Button
              onClick={() => {
                onRefresh();
                triggerAction('refresh_data');
              }}
              variant="secondary"
              size="small"
              icon={<RefreshCw className={`w-4 h-4 ${isActionActive('refresh_data') ? 'animate-spin' : ''}`} />}
              className={isActionActive('refresh_data') ? 'bg-amber-100 text-amber-800' : ''}
            >
              {isActionActive('refresh_data') ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <DataTable
            columns={scenarioColumns}
            data={filteredScenarios}
            onRowClick={(row) => onOpenScenario(row.ScenarioRunID)}
            selectedRows={selectedScenarios}
            onSelectRow={handleSelectScenario}
            getRowId={(row) => row.ScenarioRunID}
            maxHeight="600px"
          />
        </div>

        {comparisonHeaders.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-6 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Comparisons</h2>
            </div>

            <DataTable
              columns={comparisonColumns}
              data={filteredComparisons}
              onRowClick={(row) => onOpenComparison(row.ComparisonID)}
              getRowId={(row) => row.ComparisonID}
              maxHeight="400px"
            />
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Alerts & Data Health</h2>

          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Over-Capacity</h3>
              </div>
              <p className="text-2xl font-bold text-red-700">{alertCounts.overCap}</p>
              <p className="text-sm text-red-600 mt-1">Runs with capacity issues</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">SLA Breaches</h3>
              </div>
              <p className="text-2xl font-bold text-amber-700">{alertCounts.sla}</p>
              <p className="text-sm text-amber-600 mt-1">Runs with SLA issues</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Missing Rates</h3>
              </div>
              <p className="text-2xl font-bold text-slate-700">{alertCounts.missingRates}</p>
              <p className="text-sm text-slate-600 mt-1">Runs with data gaps</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Assumptions Used</h3>
              </div>
              <p className="text-2xl font-bold text-blue-700">{alertCounts.assumptions}</p>
              <p className="text-sm text-blue-600 mt-1">Runs with assumptions</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900">Data Snapshot</h3>
                  <StatusBadge status={dataHealthSnapshot.ForecastFreshness} size="small" />
                </div>
                <p className="text-sm text-slate-600">
                  Version: {dataHealthSnapshot.SnapshotTime} |
                  Rates Coverage: {dataHealthSnapshot.RatesCoveragePct}% |
                  BCV Dims: {dataHealthSnapshot.BCVDimsAvailability}
                </p>
              </div>
              <Button onClick={onDataHealth} variant="secondary" size="small">
                View Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
