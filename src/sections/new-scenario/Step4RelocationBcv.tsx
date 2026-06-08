import React from 'react';
import { Tooltip, Select } from '@/components/ui';
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
  const collectPolicyLabel = scenarioPolicy.collectPolicy === 'relocatable' ? 'Collect: Relocatable' : 'Collect: Fixed';
  return (
    <div className="surface-panel space-y-6 p-5">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">
            Allow Relocation
          </label>
          <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
            {collectPolicyLabel}
          </span>
        </div>
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
                <div className="flex items-center gap-2 cursor-not-allowed opacity-70">
                  <input
                    type="checkbox"
                    checked={formData.allowRelocationPrepaid}
                    onChange={(e) => onFormDataChange({ ...formData, allowRelocationPrepaid: e.target.checked })}
                    className="rounded"
                    disabled={true}
                  />
                  <span className="text-sm font-medium text-slate-700">Prepaid</span>
                </div>
              </div>
            )}

            {showCollect && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 cursor-not-allowed opacity-70">
                  <input
                    type="checkbox"
                    checked={formData.allowRelocationCollect}
                    onChange={(e) => onFormDataChange({ ...formData, allowRelocationCollect: e.target.checked })}
                    className="rounded"
                    disabled={true}
                  />
                  <span className="text-sm font-medium text-slate-700">Collect</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {scenarioPolicy.supports.bcvMapping && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-slate-700">
              BCV Relocation Mapping
            </label>
            <Tooltip content="Business Critical Volume routing rules for network changes" />
          </div>
          <Select
            value={formData.bcvRuleSet}
            onChange={(val) => onFormDataChange({ ...formData, bcvRuleSet: val })}
            disabled={datasetOptions.bcvRuleSets.length === 0 || scenarioPolicy.locks.bcvRuleSet}
            options={datasetOptions.bcvRuleSets.length === 0 ? [] : datasetOptions.bcvRuleSets.map((rule) => ({ value: rule, label: rule }))}
            placeholder="NA"
          />
          {datasetOptions.bcvRuleSets.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">No BCV mapping data available.</p>
          )}
        </div>
      )}

    </div>
  );
};
