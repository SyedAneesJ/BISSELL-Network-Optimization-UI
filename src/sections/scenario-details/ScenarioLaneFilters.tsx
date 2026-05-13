import React from 'react';

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
  laneFlagFilter,
  onLaneFlagFilterChange,
  showFlagFilter = false,
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <input
        type="search"
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[180px]"
        value={laneZipSearch}
        onChange={(e) => onLaneZipSearchChange(e.target.value)}
        placeholder="Search ZIP"
      />

      <select
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        value={laneChannelFilter}
        onChange={(e) => onLaneChannelFilterChange(e.target.value)}
      >
        <option value="All">All Channels</option>
        {channelOptions.map((channel) => (
          <option key={channel} value={channel}>{channel}</option>
        ))}
      </select>

      <select
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        value={laneTermsFilter}
        onChange={(e) => onLaneTermsFilterChange(e.target.value)}
      >
        <option value="All">All Terms</option>
        {termsOptions.map((term) => (
          <option key={term} value={term}>{term}</option>
        ))}
      </select>

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
  );
};
