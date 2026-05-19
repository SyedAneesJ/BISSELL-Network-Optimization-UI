import React from 'react';
import { Tooltip } from '@/components/ui';
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700">
            Lead Time Cap (Days)
          </label>
          <Tooltip content="Maximum acceptable delivery time. Lanes exceeding this will be flagged or excluded based on settings." />
        </div>
        <select
          value={formData.leadTimeCap}
          onChange={(e) => onFormDataChange({ ...formData, leadTimeCap: Number(e.target.value) })}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            datasetOptions.leadTimeCaps.length === 0 ? 'bg-slate-100' : ''
          }`}
          disabled={datasetOptions.leadTimeCaps.length === 0}
        >
          {datasetOptions.leadTimeCaps.length === 0 ? (
            <option value={0}>NA</option>
          ) : (
            datasetOptions.leadTimeCaps.map((cap) => (
              <option key={cap} value={cap}>{cap}</option>
            ))
          )}
        </select>
        {datasetOptions.leadTimeCaps.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No lead time cap data available.</p>
        )}
      </div>

      <div>
        {datasetOptions.excludeBeyondCap.length === 0 ? (
          <>
            <label className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm font-medium text-slate-500">Exclude lanes beyond lead time cap</span>
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">
              No exclusion data available
            </p>
          </>
        ) : (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.excludeBeyondCap}
              onChange={(e) => onFormDataChange({ ...formData, excludeBeyondCap: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium text-slate-700">Exclude lanes beyond lead time cap</span>
          </label>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700">
            Cost vs Service Priority
          </label>
          <Tooltip content="Toggle between cost focus and service focus. The scenario math still uses the underlying 0-100 value." />
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              !isServiceFocused
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setCostVsServicePreset('cost')}
            disabled={datasetOptions.costVsServiceWeights.length === 0}
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
            disabled={datasetOptions.costVsServiceWeights.length === 0}
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

      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Advanced: Fuel Surcharge</h4>

        <div className="space-y-3">
          {datasetOptions.fuelSurchargeModes.length === 0 ? (
            <>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
                  <input type="radio" disabled className="text-blue-600" />
                  <span className="text-sm">NA</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-1">No fuel surcharge data available.</p>
            </>
          ) : (
            <div className="flex gap-4">
              {datasetOptions.fuelSurchargeModes.map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="fuelSurchargeMode"
                    value={mode}
                    checked={formData.fuelSurchargeMode === mode}
                    onChange={(e) => onFormDataChange({ ...formData, fuelSurchargeMode: e.target.value })}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700">{mode}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Accessorials
        </label>
        <div className="space-y-2">
          {datasetOptions.accessorialFlags.length === 0 ? (
            <label className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm">NA</span>
            </label>
          ) : (
            <>
              {['Residential', 'Liftgate', 'InsideDelivery']
                .filter((flag) => datasetOptions.accessorialFlags.includes(flag))
                .map((flag) => {
                const key = flag === 'InsideDelivery' ? 'insideDelivery' : flag.toLowerCase();
                const checked = (formData.accessorials as any)[key] as boolean;
                return (
                  <label key={flag} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onFormDataChange({
                          ...formData,
                          accessorials: {
                            ...formData.accessorials,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">{flag}</span>
                  </label>
                );
              })}
            </>
          )}
        </div>
        {datasetOptions.accessorialFlags.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No accessorial data available.</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Excluded by SLA preview:</strong> NA (no lane data available).
        </p>
      </div>
    </div>
  );
};
