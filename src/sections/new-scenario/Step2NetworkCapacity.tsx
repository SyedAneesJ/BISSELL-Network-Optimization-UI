import React from 'react';
import { Tooltip } from '@/components/ui';
import { DatasetOptionSets } from '@/services';
import { NewScenarioFormData } from './types';

interface Step2NetworkCapacityProps {
  formData: NewScenarioFormData;
  onFormDataChange: (next: NewScenarioFormData) => void;
  datasetOptions: DatasetOptionSets;
  availableDcsByRegion: Record<string, string[]>;
  availableDcCapacity: Record<string, number>;
  onDCToggle: (dc: string) => void;
  utilCapMin: number;
  utilCapMax: number;
}

export const Step2NetworkCapacity: React.FC<Step2NetworkCapacityProps> = ({
  formData,
  onFormDataChange,
  datasetOptions,
  availableDcsByRegion,
  availableDcCapacity,
  onDCToggle,
  utilCapMin,
  utilCapMax,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm font-medium text-slate-700">
            Distribution Centers
          </label>
          <Tooltip content="Select which DCs are active in this scenario. Suppressed DCs will not be considered for lane assignments." />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(availableDcsByRegion[formData.region] || []).map((dc) => {
            const isActive = formData.activeDCs.has(dc);
            const capacity = availableDcCapacity[dc];

            return (
              <div
                key={dc}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-slate-50'
                }`}
                onClick={() => onDCToggle(dc)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{dc}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isActive ? 'Active' : 'Suppressed'}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Capacity: {capacity === undefined ? 'NA' : capacity.toLocaleString()}
                </div>
                {capacity === undefined && (
                  <div className="text-xs text-slate-500 mt-1">No capacity data</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-slate-700">
              Footprint Mode
            </label>
            <Tooltip content="Fixed: Use existing DC capacities. Unconstrained: Allow capacity expansion in optimization." />
          </div>
          {datasetOptions.footprintModes.length === 0 ? (
            <>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
                  <input type="radio" disabled className="text-blue-600" />
                  <span className="text-sm">NA</span>
                </label>
              </div>
              <p className="text-xs text-slate-500 mt-1">No footprint mode data available.</p>
            </>
          ) : (
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="footprintMode"
                  value=""
                  checked={formData.footprintMode === ''}
                  onChange={() => onFormDataChange({ ...formData, footprintMode: '' })}
                  className="text-blue-600"
                />
                <span className="text-sm text-slate-700">Use baseline default</span>
              </label>
              {datasetOptions.footprintModes.map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="footprintMode"
                    value={mode}
                    checked={formData.footprintMode === mode}
                    onChange={(e) => onFormDataChange({ ...formData, footprintMode: e.target.value })}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-slate-700">{mode}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          {datasetOptions.levelLoadModes.length === 0 ? (
            <label className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm font-medium text-slate-500">Enable Level-Load</span>
              <Tooltip content="No level-load data available" />
            </label>
          ) : (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.levelLoad}
                onChange={(e) => onFormDataChange({ ...formData, levelLoad: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-slate-700">Enable Level-Load</span>
            </label>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700">
            Utilization Cap{datasetOptions.utilCaps.length === 0 ? ': NA' : `: ${formData.utilCap}%`}
          </label>
          <Tooltip content="Maximum DC utilization percentage allowed. Lanes that would exceed this will be assigned to alternate DCs." />
        </div>
        <input
          type="range"
          min={utilCapMin}
          max={utilCapMax}
          value={formData.utilCap}
          onChange={(e) => onFormDataChange({ ...formData, utilCap: Number(e.target.value) })}
          className="w-full"
          disabled={datasetOptions.utilCaps.length === 0}
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{utilCapMin}%</span>
          <span className="font-medium text-slate-700">{formData.utilCap}%</span>
          <span>{utilCapMax}%</span>
        </div>
        {datasetOptions.utilCaps.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No utilization cap data available.</p>
        )}
      </div>
    </div>
  );
};
