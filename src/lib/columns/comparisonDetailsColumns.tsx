import { Column } from '@/components/ui';
import { ComparisonDetailDC, ComparisonDetailLane } from '@/data';

export const createComparisonDcColumns = (): Column<ComparisonDetailDC>[] => [
  { key: 'DCName', header: 'DC Name', sortable: true },
  {
    key: 'Cost_A',
    header: 'Cost A',
    sortable: true,
    render: (row) => `$${row.Cost_A.toLocaleString()}`,
  },
  {
    key: 'Cost_B',
    header: 'Cost B',
    sortable: true,
    render: (row) => `$${row.Cost_B.toLocaleString()}`,
  },
  {
    key: 'Cost_Delta',
    header: 'Cost Delta',
    sortable: true,
    render: (row) => (
      <span className={row.Cost_Delta > 0 ? 'text-red-600 font-medium' : row.Cost_Delta < 0 ? 'text-green-600 font-medium' : ''}>
        {row.Cost_Delta > 0 ? '+' : ''}${row.Cost_Delta.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'Util_A',
    header: 'Util A',
    sortable: true,
    render: (row) => `${row.Util_A.toFixed(2)}%`,
  },
  {
    key: 'Util_B',
    header: 'Util B',
    sortable: true,
    render: (row) => `${row.Util_B.toFixed(2)}%`,
  },
  {
    key: 'Util_Delta',
    header: 'Util Delta',
    sortable: true,
    render: (row) => (
      <span className={row.Util_Delta > 0 ? 'text-amber-600' : row.Util_Delta < 0 ? 'text-green-600' : ''}>
        {row.Util_Delta > 0 ? '+' : ''}{row.Util_Delta.toFixed(2)}%
      </span>
    ),
  },
  { key: 'SLABreach_A', header: 'SLA A', sortable: true },
  { key: 'SLABreach_B', header: 'SLA B', sortable: true },
];

export const createComparisonLaneColumns = (): Column<ComparisonDetailLane>[] => [
  { key: 'Dest3Zip', header: '3-Zip', width: '80px', sortable: true },
  { key: 'Channel', header: 'Channel', width: '80px', sortable: true },
  { key: 'Terms', header: 'Terms', width: '80px', sortable: true },
  { key: 'CustomerGroup', header: 'Customer', width: '120px', sortable: true },
  {
    key: 'DC_A',
    header: 'DC A',
    width: '100px',
    render: (row) => (
      <span className={row.DC_A !== row.DC_B ? 'font-medium text-blue-600' : ''}>
        {row.DC_A}
      </span>
    ),
  },
  {
    key: 'DC_B',
    header: 'DC B',
    width: '100px',
    render: (row) => (
      <span className={row.DC_A !== row.DC_B ? 'font-medium text-blue-600' : ''}>
        {row.DC_B}
      </span>
    ),
  },
  {
    key: 'Cost_Delta',
    header: 'Cost Delta',
    width: '100px',
    sortable: true,
    render: (row) => (
      <span className={row.Cost_Delta > 0 ? 'text-red-600' : row.Cost_Delta < 0 ? 'text-green-600' : ''}>
        ${row.Cost_Delta.toFixed(2)}
      </span>
    ),
  },
  {
    key: 'Days_Delta',
    header: 'Days Delta',
    width: '100px',
    sortable: true,
    render: (row) => (
      <span className={row.Days_Delta > 0 ? 'text-red-600' : row.Days_Delta < 0 ? 'text-green-600' : ''}>
        {row.Days_Delta > 0 ? '+' : ''}{row.Days_Delta}
      </span>
    ),
  },
  {
    key: 'Flags',
    header: 'Flags',
    width: '150px',
    render: (row) => (
      <div className="flex gap-1 flex-wrap">
        {row.Flags.split(',').map((flag, idx) => (
          flag && <span key={idx} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{flag}</span>
        ))}
      </div>
    ),
  },
];
