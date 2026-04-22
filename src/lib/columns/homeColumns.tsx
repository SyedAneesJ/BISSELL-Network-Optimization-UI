import { AlertTriangle, Clock, FileText, Copy, Archive, RotateCcw, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Tooltip } from '@/components/ui';
import { StatusBadge } from '@/components/ui';
import { Column } from '@/components/ui';
import { ComparisonHeader, ScenarioRunHeader } from '@/data';
import { formatCurrencyOrNA, formatDecimalOrNA, formatNumberOrNA, formatPercentOrNA, formatTextOrNA } from '@/utils';

interface ScenarioColumnsParams {
  entityLabels: { first: string; second: string };
  isActionActive: (key: string) => boolean;
  triggerAction: (key: string) => void;
  onDuplicateScenario: (scenarioId: string) => void;
  onArchiveScenario: (scenarioId: string) => void;
  onUnarchiveScenario: (scenarioId: string) => void;
  onExportScenarioRow: (row: ScenarioRunHeader) => void;
}

export const createScenarioColumns = ({
  entityLabels,
  isActionActive,
  triggerAction,
  onDuplicateScenario,
  onArchiveScenario,
  onUnarchiveScenario,
  onExportScenarioRow,
}: ScenarioColumnsParams): Column<ScenarioRunHeader>[] => [
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
    render: (row) => formatCurrencyOrNA(row.TotalCost),
  },
  {
    key: 'CostPerUnit',
    header: 'Cost/Unit',
    width: '100px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.CostPerUnit, 2),
  },
  {
    key: 'AvgDeliveryDays',
    header: 'Avg Days',
    width: '90px',
    sortable: true,
    render: (row) => formatDecimalOrNA(row.AvgDeliveryDays, 2),
  },
  {
    key: 'AvgTransitDays',
    header: 'Transit Days',
    width: '110px',
    sortable: true,
    render: (row) => formatDecimalOrNA(row.AvgTransitDays, 2),
  },
  {
    key: 'TotalCount',
    header: 'Total Count',
    width: '110px',
    sortable: true,
    render: (row) => formatNumberOrNA(row.TotalCount),
  },
  {
    key: 'SLABreachPct',
    header: 'SLA Breach %',
    width: '110px',
    sortable: true,
    render: (row) => (
      <span className={row.SLABreachPct > 5 ? 'text-red-600 font-medium' : ''}>
        {formatPercentOrNA(row.SLABreachPct, 2)}
      </span>
    ),
  },
  {
    key: 'ExcludedBySLACount',
    header: 'Excluded SLA',
    width: '110px',
    sortable: true,
      render: (row) => formatNumberOrNA(row.ExcludedBySLACount),
  },
  {
    key: 'MaxUtilPct',
    header: 'Max Util %',
    width: '100px',
    sortable: true,
    render: (row) => (
      <span className={row.MaxUtilPct > 85 ? 'text-amber-600 font-medium' : ''}>
        {formatPercentOrNA(row.MaxUtilPct, 2)}
      </span>
    ),
  },
  {
    key: 'TotalSpaceRequired',
    header: 'Total Space Required',
    width: '110px',
    sortable: true,
    render: (row) => formatNumberOrNA(row.TotalSpaceRequired),
  },
  {
    key: 'SpaceCore',
    header: `Space ${entityLabels.first}`,
    width: '110px',
    sortable: true,
    render: (row) => formatNumberOrNA(row.SpaceCore),
  },
  {
    key: 'SpaceBCV',
    header: `Space ${entityLabels.second}`,
    width: '110px',
    sortable: true,
    render: (row) => formatNumberOrNA(row.SpaceBCV),
  },
  {
    key: 'FootprintMode',
    header: 'Footprint',
    width: '110px',
    sortable: true,
    render: (row) => formatTextOrNA(row.FootprintMode),
  },
  {
    key: 'LevelLoad',
    header: 'Level Load',
    width: '100px',
    sortable: true,
    render: (row) => formatTextOrNA(row.LevelLoad),
  },
  {
    key: 'UtilizationCap',
    header: 'Util Cap',
    width: '100px',
    sortable: true,
    render: (row) => formatTextOrNA(row.UtilizationCap),
  },
  {
    key: 'CollectTreatment',
    header: 'Collect Tx',
    width: '100px',
    sortable: true,
    render: (row) => formatTextOrNA(row.CollectTreatment),
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
  {
    key: 'LastRunBy',
    header: 'Last Run By',
    width: '140px',
    sortable: true,
    render: (row) => formatTextOrNA(row.LastRunBy),
  },
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
            onExportScenarioRow(row);
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

interface ComparisonColumnsParams {
  scenarioRunHeaders: ScenarioRunHeader[];
  currentUserDisplayName: string;
  isActionActive: (key: string) => boolean;
  triggerAction: (key: string) => void;
  onDuplicateComparison: (comparisonId: string) => void;
  onArchiveComparison: (comparisonId: string) => void;
  onUnarchiveComparison: (comparisonId: string) => void;
  onExportComparisonRow: (row: ComparisonHeader) => void;
}

export const createComparisonColumns = ({
  scenarioRunHeaders,
  currentUserDisplayName,
  isActionActive,
  triggerAction,
  onDuplicateComparison,
  onArchiveComparison,
  onUnarchiveComparison,
  onExportComparisonRow,
}: ComparisonColumnsParams): Column<ComparisonHeader>[] => [
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
  {
    key: 'CreatedBy',
    header: 'Owner',
    width: '120px',
    sortable: true,
    render: (row) => (
      <span>{row.CreatedBy === 'You' ? currentUserDisplayName : row.CreatedBy}</span>
    ),
  },
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
            onExportComparisonRow(row);
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
