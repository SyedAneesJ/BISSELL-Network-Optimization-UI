import React from 'react';
import { ReactNode } from 'react';
import { Select } from '@/components/ui';

interface ScenarioLaneFiltersProps {
  laneZipSearch: string;
  onLaneZipSearchChange: (value: string) => void;
  channelOptions: string[];
  termsOptions: string[];
  laneChannelFilter: string;
  onLaneChannelFilterChange: (value: string) => void;
  laneTermsFilter: string;
  onLaneTermsFilterChange: (value: string) => void;
  laneFlagFilter?: string;
  onLaneFlagFilterChange?: (value: string) => void;
  showFlagFilter?: boolean;
  rightActions?: ReactNode;
}

export const ScenarioLaneFilters: React.FC<ScenarioLaneFiltersProps> = ({
  laneZipSearch,
  onLaneZipSearchChange,
  channelOptions,
  termsOptions,
  laneChannelFilter,
  onLaneChannelFilterChange,
  laneTermsFilter,
  onLaneTermsFilterChange,
  rightActions,
}) => {
  const channelSelectOptions = [
    { value: 'All', label: 'All Channels' },
    ...channelOptions.map((c) => ({ value: c, label: c })),
  ];

  const termsSelectOptions = [
    { value: 'All', label: 'All Terms' },
    ...termsOptions.map((t) => ({ value: t, label: t })),
  ];

  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]"
          value={laneZipSearch}
          onChange={(e) => onLaneZipSearchChange(e.target.value)}
          placeholder="Search ZIP"
        />

        <Select
          value={laneChannelFilter}
          onChange={onLaneChannelFilterChange}
          options={channelSelectOptions}
          className="w-40"
        />

        <Select
          value={laneTermsFilter}
          onChange={onLaneTermsFilterChange}
          options={termsSelectOptions}
          className="w-40"
        />

        {/* {showFlagFilter && laneFlagFilter && onLaneFlagFilterChange && (
        <select
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          value={laneFlagFilter}
          onChange={(e) => onLaneFlagFilterChange(e.target.value)}
        >
          <option value="All">All Lanes</option>
          <option value="SLA Breaches Only">SLA Breaches Only</option>
          <option value="Excluded by SLA">Excluded by SLA</option>
          <option value="Overrides Only">Overrides Only</option>
          <option value="Flagged Lanes">Flagged Lanes</option>
        </select>
        )} */}
      </div>

      {rightActions && <div className="flex flex-wrap gap-2">{rightActions}</div>}
    </div>
  );
};
