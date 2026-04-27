import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string>;
  onSelectRow?: (rowId: string) => void;
  getRowId?: (row: T) => string;
  emptyMessage?: string;
  maxHeight?: string;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  selectedRows,
  onSelectRow,
  getRowId,
  emptyMessage = 'No data available',
  maxHeight = 'none',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];

      if (aVal === bVal) return 0;

      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white/70 min-w-0" style={{ maxHeight }}>
      <table className="min-w-max w-full">
        <thead className="bg-white/80 backdrop-blur sticky top-0 z-10 border-b border-slate-200">
          <tr>
            {selectedRows && onSelectRow && (
              <th className="px-4 py-3 text-left w-12">
                {/* <input type="checkbox" className="rounded border-slate-300" /> */}
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap ${column.sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && sortKey === column.key && (
                    <span>
                      {sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {sortedData.map((row, idx) => {
            const rowId = getRowId ? getRowId(row) : idx.toString();
            const isSelected = selectedRows?.has(rowId);

            return (
              <tr
                key={rowId}
                className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-blue-50' : idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} hover:bg-slate-50`}
                onClick={() => onRowClick?.(row)}
              >
                {selectedRows && onSelectRow && (
                  <td
                    className="px-4 py-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRow(rowId);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-slate-300"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                    {column.render ? column.render(row) : String((row as any)[column.key] || '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
