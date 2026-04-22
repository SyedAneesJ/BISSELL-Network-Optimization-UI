import { Column } from '@/components/ui';
import { ScenarioRunResultsDC, ScenarioRunResultsLane } from '@/data';
import { formatCurrencyOrNA, formatDecimalOrNA, formatNumberOrNA, formatPercentOrNA, formatTextOrNA } from '@/utils';

export const createScenarioDcColumns = (): Column<ScenarioRunResultsDC>[] => [
  { key: 'DCName', header: 'DC Name', sortable: true },
  {
    key: 'TotalCost',
    header: 'Cost',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.TotalCost),
  },
  {
    key: 'VolumeUnits',
    header: 'Volume',
    sortable: true,
    render: (row) => formatNumberOrNA(row.VolumeUnits),
  },
  {
    key: 'AvgDays',
    header: 'Avg Days',
    sortable: true,
    render: (row) => formatDecimalOrNA(row.AvgDays, 2),
  },
  {
    key: 'UtilPct',
    header: 'Util %',
    sortable: true,
    render: (row) => (
      <span className={row.UtilPct > 85 ? 'text-amber-600 font-medium' : ''}>
        {formatPercentOrNA(row.UtilPct, 2)}
      </span>
    ),
  },
  {
    key: 'SpaceRequired',
    header: 'Space Req',
    sortable: true,
    render: (row) => formatNumberOrNA(row.SpaceRequired),
  },
  {
    key: 'SLABreachCount',
    header: 'SLA Breaches',
    sortable: true,
    render: (row) => (
      <span className={row.SLABreachCount > 5 ? 'text-red-600 font-medium' : ''}>
        {formatNumberOrNA(row.SLABreachCount)}
      </span>
    ),
  },
  {
    key: 'RankOverall',
    header: 'Rank',
    sortable: true,
    render: (row) => `#${row.RankOverall}`,
  },
];

export const createScenarioLaneColumns = (): Column<ScenarioRunResultsLane>[] => [
  { key: 'Dest3Zip', header: '3-Zip', width: '80px', sortable: true },
  { key: 'DestState', header: 'State', width: '60px', sortable: true },
  { key: 'Channel', header: 'Channel', width: '80px', sortable: true },
  { key: 'Terms', header: 'Terms', width: '80px', sortable: true },
  { key: 'CustomerGroup', header: 'Customer', width: '120px', sortable: true },
  { key: 'AssignedDC', header: 'Assigned DC', width: '120px', sortable: true },
  {
    key: 'LaneCost',
    header: 'Cost',
    width: '90px',
    sortable: true,
    render: (row) => formatCurrencyOrNA(row.LaneCost, 2),
  },
  {
    key: 'CostDeltaVsBest',
    header: 'Delta vs Best',
    width: '100px',
    sortable: true,
    render: (row) => (
      <span className={row.CostDeltaVsBest > 0 ? 'text-amber-600' : 'text-green-600'}>
        {formatCurrencyOrNA(row.CostDeltaVsBest, 2)}
      </span>
    ),
  },
  {
    key: 'DeliveryDays',
    header: 'Days',
    width: '70px',
    sortable: true,
    render: (row) => formatDecimalOrNA(row.DeliveryDays, 1),
  },
  {
    key: 'SLABreachFlag',
    header: 'SLA',
    width: '60px',
    sortable: true,
    render: (row) => (
      row.SLABreachFlag === 'Y' ? <span className="text-red-600 font-medium">Breach</span> : '-'
    ),
  },
  {
    key: 'OverrideAppliedFlag',
    header: 'Override',
    width: '80px',
    render: (row) => (
      row.OverrideAppliedFlag === 'Y' ? (
        <span className="text-blue-600 text-xs">{row.OverrideVersion}</span>
      ) : '-'
    ),
  },
];

export const createScenarioRankedOptionsColumns = (): Column<ScenarioRunResultsLane>[] => [
  { key: 'Dest3Zip', header: '3-Zip', width: '80px', sortable: true },
  { key: 'Channel', header: 'Channel', width: '80px', sortable: true },
  { key: 'Terms', header: 'Terms', width: '80px', sortable: true },
  { key: 'CustomerGroup', header: 'Customer', width: '120px', sortable: true },
  {
    key: 'RankedOption1DC',
    header: 'Option #1',
    width: '200px',
    render: (row) => (
      <div className="text-xs">
        <div className="font-medium">{row.RankedOption1DC}</div>
        <div className="text-slate-600">{formatCurrencyOrNA(row.RankedOption1Cost, 2)} | {formatTextOrNA(row.RankedOption1Days)}d</div>
      </div>
    ),
  },
  {
    key: 'RankedOption2DC',
    header: 'Option #2',
    width: '200px',
    render: (row) => (
      <div className="text-xs">
        <div className="font-medium">{row.RankedOption2DC}</div>
        <div className="text-slate-600">{formatCurrencyOrNA(row.RankedOption2Cost, 2)} | {formatTextOrNA(row.RankedOption2Days)}d</div>
      </div>
    ),
  },
  {
    key: 'RankedOption3DC',
    header: 'Option #3',
    width: '200px',
    render: (row) => (
      <div className="text-xs">
        <div className="font-medium">{row.RankedOption3DC}</div>
        <div className="text-slate-600">{formatCurrencyOrNA(row.RankedOption3Cost, 2)} | {formatTextOrNA(row.RankedOption3Days)}d</div>
      </div>
    ),
  },
  {
    key: 'AssignedDC',
    header: 'Selected',
    width: '120px',
    render: (row) => (
      <div className="font-medium text-blue-600">{row.AssignedDC}</div>
    ),
  },
  {
    key: 'ChosenRank',
    header: 'Rank',
    width: '80px',
    sortable: true,
    render: (row) => `#${row.ChosenRank}`,
  },
  {
    key: 'CostDeltaVsBest',
    header: 'Delta',
    width: '90px',
    sortable: true,
    render: (row) => (
      <span className={row.CostDeltaVsBest > 0 ? 'text-amber-600' : 'text-green-600'}>
        {formatCurrencyOrNA(row.CostDeltaVsBest, 2)}
      </span>
    ),
  },
];
