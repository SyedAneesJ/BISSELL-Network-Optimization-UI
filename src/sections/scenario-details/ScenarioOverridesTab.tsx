import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui';
import { ScenarioOverride, ScenarioRunHeader, ScenarioRunResultsLane } from '@/data';

interface ScenarioOverridesTabProps {
  overrides: ScenarioOverride[];
  scenario: ScenarioRunHeader;
  laneResults: ScenarioRunResultsLane[];
  onOpenOverrideModal: () => void;
}

export const ScenarioOverridesTab: React.FC<ScenarioOverridesTabProps> = ({
  overrides,
  scenario,
  laneResults,
  onOpenOverrideModal,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Override Summary:</strong> {scenario.OverrideCount} override(s) applied to this scenario.
          Overrides allow manual adjustments to the optimized lane assignments.
        </p>
      </div>

      {overrides.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Applied Overrides</h3>
          <div className="space-y-3">
            {overrides.map((override, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-slate-900">
                      {override.Dest3Zip} | {override.Channel} | {override.Terms} | {override.CustomerGroup}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="text-red-600">{override.OldDC}</span>
                      {' -> '}
                      <span className="text-green-600">{override.NewDC}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {override.OverrideVersion}
                  </span>
                </div>
                <div className="text-sm text-slate-700 mb-1">
                  <strong>Reason:</strong> {override.ReasonCode}
                </div>
                <div className="text-sm text-slate-600">
                  {override.Comment}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  By {override.UpdatedBy} on {new Date(override.UpdatedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <Settings className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No override data available for this scenario</p>
          {laneResults.length > 0 && (
            <Button onClick={onOpenOverrideModal} variant="secondary" size="small" className="mt-4">
              Apply Override
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
