import React from 'react';
import { Tooltip } from '@/components/ui';
import { DatasetOptionSets } from '@/services';
import type { ScenarioTypePolicy } from '@/services/scenario/scenarioTypeRules';
import { NewScenarioFormData } from './types';

interface Step4RelocationBcvProps {
  formData: NewScenarioFormData;
  onFormDataChange: (next: NewScenarioFormData) => void;
  datasetOptions: DatasetOptionSets;
  scenarioPolicy: ScenarioTypePolicy;
}

export const Step4RelocationBcv: React.FC<Step4RelocationBcvProps> = ({
  formData,
  onFormDataChange,
  datasetOptions,
  scenarioPolicy,
}) => {
  const showPrepaid = scenarioPolicy.supports.relocationPrepaid && datasetOptions.allowRelocationPrepaid.length > 0;
  const showCollect = scenarioPolicy.supports.relocationCollect && datasetOptions.allowRelocationCollect.length > 0;
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-3 block">
          Allow Relocation
        </label>
        {!showPrepaid && !showCollect ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="rounded" />
                  <span className="text-sm font-medium text-slate-500">Prepaid</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="rounded" />
                  <span className="text-sm font-medium text-slate-500">Collect</span>
                  <Tooltip content="No relocation data available" />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">No relocation data available.</p>
          </>
        ) : (
          <div className="space-y-3">
            {showPrepaid && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowRelocationPrepaid}
                    onChange={(e) => onFormDataChange({ ...formData, allowRelocationPrepaid: e.target.checked })}
                    className="rounded"
                    disabled={scenarioPolicy.locks.allowRelocationPrepaid}
                  />
                  <span className="text-sm font-medium text-slate-700">Prepaid</span>
                </div>
              </div>
            )}

            {showCollect && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowRelocationCollect}
                    onChange={(e) => onFormDataChange({ ...formData, allowRelocationCollect: e.target.checked })}
                    className="rounded"
                    disabled={scenarioPolicy.locks.allowRelocationCollect}
                  />
                  <span className="text-sm font-medium text-slate-700">Collect</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700">
            BCV Relocation Mapping
          </label>
          <Tooltip content="Business Critical Volume routing rules for network changes" />
        </div>
        <select
          value={formData.bcvRuleSet}
          onChange={(e) => onFormDataChange({ ...formData, bcvRuleSet: e.target.value })}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            datasetOptions.bcvRuleSets.length === 0 ? 'bg-slate-100' : ''
          }`}
          disabled={datasetOptions.bcvRuleSets.length === 0 || scenarioPolicy.locks.bcvRuleSet}
        >
          {datasetOptions.bcvRuleSets.length === 0 ? (
            <option value="">NA</option>
          ) : (
            datasetOptions.bcvRuleSets.map((rule) => (
              <option key={rule} value={rule}>{rule}</option>
            ))
          )}
        </select>
        {datasetOptions.bcvRuleSets.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No BCV mapping data available.</p>
        )}
      </div>

    </div>
  );
};
