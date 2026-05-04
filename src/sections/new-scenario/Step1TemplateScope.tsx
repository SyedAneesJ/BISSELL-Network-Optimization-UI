import React from 'react';
import { DatasetOptionSets } from '@/services';
import { ScenarioTemplateOption } from '@/services/scenario';
import { NewScenarioFormData } from './types';

interface Step1TemplateScopeProps {
  formData: NewScenarioFormData;
  onFormDataChange: (next: NewScenarioFormData) => void;
  availableRegions: Array<'US' | 'Canada'>;
  baselineOptions: ScenarioTemplateOption[];
  entityScopes: string[];
  datasetOptions: DatasetOptionSets;
  onChannelToggle: (channel: string) => void;
  onTagToggle: (tag: string) => void;
}

export const Step1TemplateScope: React.FC<Step1TemplateScopeProps> = ({
  formData,
  onFormDataChange,
  availableRegions,
  baselineOptions,
  entityScopes,
  datasetOptions,
  onChannelToggle,
  onTagToggle,
}) => {
  const selectedScenarioType = formData.scenarioType || '';
  const visibleOptions = selectedScenarioType
    ? baselineOptions.filter((option) => option.scenarioType === selectedScenarioType)
    : baselineOptions;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Region</div>
            <div className="text-sm font-semibold text-slate-900">{formData.region || 'NA'}</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Scenario Type</div>
            <div className="text-sm font-semibold text-slate-900">{formData.scenarioType || 'NA'}</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Baseline</div>
            <div className="text-sm font-semibold text-slate-900">
              {baselineOptions.find((item) => item.scenarioId === formData.baselineScenarioId)?.scenarioName || 'Select baseline'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Region
          </label>
          <select
            value={formData.region}
            onChange={(e) => {
              onFormDataChange({
                ...formData,
                region: e.target.value as 'US' | 'Canada',
                scenarioType: '',
                baselineScenarioId: '',
                baselineDataflowId: '',
              });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableRegions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Scenario Type
          </label>
          <select
            value={selectedScenarioType}
            onChange={(e) => {
              const nextType = e.target.value;
              const matchingOptions = nextType
                ? baselineOptions.filter((item) => item.scenarioType === nextType)
                : baselineOptions;
              const nextScenario = matchingOptions.find((item) => item.scenarioId === formData.baselineScenarioId) || matchingOptions[0] || null;
              onFormDataChange({
                ...formData,
                scenarioType: nextType,
                baselineScenarioId: nextScenario?.scenarioId || '',
                baselineDataflowId: nextScenario?.dataflowId || '',
              });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All scenario types</option>
            {Array.from(new Set(baselineOptions.map((option) => option.scenarioType).filter(Boolean))).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Optional filter. Leave empty to show all scenarios in the selected region.</p>
          {baselineOptions.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">No scenario data available for this region.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Scenario List
          </label>
          <span className="text-xs text-slate-500">
            Sorted by Dataflow ID ascending
          </span>
        </div>
        {baselineOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No scenarios for the selected region.
          </div>
        ) : visibleOptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No scenarios match the selected scenario type.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleOptions.map((scenario) => {
              const selected = formData.baselineScenarioId === scenario.scenarioId;
              return (
                <button
                  key={scenario.scenarioId}
                  type="button"
                  onClick={() => onFormDataChange({
                    ...formData,
                    baselineScenarioId: scenario.scenarioId,
                    baselineDataflowId: scenario.dataflowId,
                    scenarioType: scenario.scenarioType,
                  })}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                    selected
                      ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {scenario.scenarioName}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          Type: {scenario.scenarioType}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          Dataflow ID: {scenario.dataflowId}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          Entity: {scenario.entityScope}
                        </span>
                      </div>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {selected ? 'Selected' : 'Select'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Entity Scope
        </label>
        <div className="flex gap-4">
          {entityScopes.map((scope) => (
            <label key={scope} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="entityScope"
                value={scope}
                checked={formData.entityScope === scope}
                onChange={(e) => onFormDataChange({ ...formData, entityScope: e.target.value })}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{scope}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Channel Scope
        </label>
        {datasetOptions.channelScopes.length === 0 ? (
          <>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-not-allowed text-slate-500">
                <input type="checkbox" disabled className="rounded" />
                <span className="text-sm">NA</span>
              </label>
            </div>
            <p className="text-xs text-slate-500 mt-1">No channel scope data available.</p>
          </>
        ) : (
          <div className="flex gap-4 flex-wrap">
            {datasetOptions.channelScopes.map((channel) => (
              <label key={channel} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={formData.channelScope.includes(channel)}
                  onChange={() => onChannelToggle(channel)}
                />
                <span className="text-sm text-slate-700">{channel}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Terms Scope
        </label>
        <select
          value={formData.termsScope}
          onChange={(e) => onFormDataChange({ ...formData, termsScope: e.target.value })}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            datasetOptions.termsScopes.length === 0 ? 'bg-slate-100' : ''
          }`}
          disabled={datasetOptions.termsScopes.length === 0}
        >
          {datasetOptions.termsScopes.length === 0 ? (
            <option value="">NA</option>
          ) : (
            datasetOptions.termsScopes.map((term) => (
              <option key={term} value={term}>{term}</option>
            ))
          )}
        </select>
        {datasetOptions.termsScopes.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No terms scope data available.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Run Name
        </label>
        <input
          type="text"
          value={formData.runName}
          onChange={(e) => onFormDataChange({ ...formData, runName: e.target.value })}
          placeholder="e.g., Q1 2026 Baseline US"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {formData.runName.trim().length === 0 && (
          <p className="text-xs text-amber-600 mt-1">Run name is required to continue.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Tags
        </label>
        {datasetOptions.tags.length === 0 ? (
          <>
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-slate-500">NA</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">No tag data available.</p>
          </>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {datasetOptions.tags.map((tag) => {
              const active = formData.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional context or assumptions..."
        />
      </div>
    </div>
  );
};
