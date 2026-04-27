import React from 'react';
import { Button } from '@/components/ui';

interface ScenarioNetworkTabProps {
  networkView: 'current' | 'baseline' | 'difference';
  onToggleBaseline: () => void;
  onToggleDifference: () => void;
  canShowBaseline: boolean;
  canShowDifference: boolean;
  networkLaneEntries: Array<{ dc: string; count: number }>;
  networkDcVolumeRowsDiff: Array<{ dcName: string; delta: number }>;
  networkDcVolumeRowsBase: Array<{ dcName: string; value: number }>;
  networkAvgDaysRowsDiff: Array<{ dcName: string; delta: number }>;
  networkAvgDaysRowsBase: Array<{ dcName: string; value: number }>;
}

export const ScenarioNetworkTab: React.FC<ScenarioNetworkTabProps> = ({
  networkView,
  onToggleBaseline,
  onToggleDifference,
  canShowBaseline,
  canShowDifference,
  networkLaneEntries,
  networkDcVolumeRowsDiff,
  networkDcVolumeRowsBase,
  networkAvgDaysRowsDiff,
  networkAvgDaysRowsBase,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Network Map</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="small"
              disabled={!canShowBaseline}
              onClick={onToggleBaseline}
              className={networkView === 'baseline' ? 'bg-amber-100 text-amber-800' : ''}
            >
              {networkView === 'baseline' ? 'Showing Baseline' : 'Show Baseline'}
            </Button>
            <Button
              variant="secondary"
              size="small"
              disabled={!canShowDifference}
              onClick={onToggleDifference}
              className={networkView === 'difference' ? 'bg-amber-100 text-amber-800' : ''}
            >
              {networkView === 'difference' ? 'Showing Difference' : 'Show Difference'}
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {networkLaneEntries.map((entry) => (
              <div key={entry.dc} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                <span className="text-slate-700">{entry.dc}</span>
                {networkView === 'difference' ? (
                  <span className={`font-semibold ${entry.count >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.count >= 0 ? '+' : ''}{entry.count} lanes
                  </span>
                ) : (
                  <span className="font-semibold text-slate-900">{entry.count} lanes</span>
                )}
              </div>
            ))}
            {networkLaneEntries.length === 0 && (
              <div className="text-slate-500">No lane assignments available for this scenario.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">DC Volume Share</h3>
          <div className="space-y-3">
            {networkView === 'difference' ? (() => {
              const maxAbs = Math.max(1, ...networkDcVolumeRowsDiff.map((row) => Math.abs(row.delta)));
              return networkDcVolumeRowsDiff.map((row) => (
                <div key={row.dcName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{row.dcName}</span>
                    <span className={`font-medium ${row.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.delta >= 0 ? '+' : ''}{row.delta.toLocaleString()} units
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${row.delta >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ width: `${(Math.abs(row.delta) / maxAbs) * 100}%` }}
                    />
                  </div>
                </div>
              ));
            })() : (
              (() => {
                const total = Math.max(1, networkDcVolumeRowsBase.reduce((sum, row) => sum + (row.value || 0), 0));
                return networkDcVolumeRowsBase.map((row) => (
                  <div key={row.dcName}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{row.dcName}</span>
                      <span className="font-medium">{(row.value || 0).toLocaleString()} units</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${((row.value || 0) / total) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Avg Days by DC</h3>
          <div className="space-y-3">
            {networkView === 'difference' ? (() => {
              const maxAbs = Math.max(1, ...networkAvgDaysRowsDiff.map((row) => Math.abs(row.delta)));
              return networkAvgDaysRowsDiff.map((row) => (
                <div key={row.dcName}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{row.dcName}</span>
                    <span className={`font-medium ${row.delta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {row.delta >= 0 ? '+' : ''}{row.delta.toFixed(1)} days
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${row.delta >= 0 ? 'bg-red-600' : 'bg-green-600'}`}
                      style={{ width: `${(Math.abs(row.delta) / maxAbs) * 100}%` }}
                    />
                  </div>
                </div>
              ));
            })() : (
              (() => {
                const maxDays = Math.max(10, ...networkAvgDaysRowsBase.map((row) => row.value || 0));
                return networkAvgDaysRowsBase.map((row) => (
                  <div key={row.dcName}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700">{row.dcName}</span>
                      <span className="font-medium">{(row.value || 0).toFixed(1)} days</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${((row.value || 0) / maxDays) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
