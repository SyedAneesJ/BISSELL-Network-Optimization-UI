import React from 'react';
import { Lock } from 'lucide-react';
import { Tooltip, Select } from '@/components/ui';
import { compactSelectBaseClass } from '@/components/ui/formStyles';
import { DatasetOptionSets } from '@/services';
import { NewScenarioFormData } from './types';

interface Step3ServiceCostProps {
  formData: NewScenarioFormData;
  onFormDataChange: (next: NewScenarioFormData) => void;
  datasetOptions: DatasetOptionSets;
}

export const Step3ServiceCost: React.FC<Step3ServiceCostProps> = ({
  formData,
  onFormDataChange,
  datasetOptions,
}) => {
  const isServiceFocused = Number(formData.costVsService || 0) >= 50;
  const setCostVsServicePreset = (preset: 'cost' | 'service') => {
    onFormDataChange({
      ...formData,
      costVsService: preset === 'service' ? 100 : 0,
    });
  };

  return (
    <div className="surface-panel space-y-6 p-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            Cost vs Service Priority
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </label>
          <Tooltip content="Toggle between cost focus and service focus. The scenario math still uses the underlying 0-100 value." />
        </div>
        <div className="inline-flex rounded-xl border border-white/70 bg-white/80 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md opacity-50 cursor-not-allowed">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              !isServiceFocused
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setCostVsServicePreset('cost')}
            disabled={true}
          >
            Cost
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              isServiceFocused
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setCostVsServicePreset('service')}
            disabled={true}
          >
            Service
          </button>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Cost focus</span>
          <span className="font-medium text-slate-700">
            {datasetOptions.costVsServiceWeights.length === 0 ? 'NA' : (isServiceFocused ? 'Service' : 'Cost')}
          </span>
          <span>Service focus</span>
        </div>
        {datasetOptions.costVsServiceWeights.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No cost vs service data available.</p>
        )}
      </div>
    </div>
  );
};
