import React from 'react';
import { DatasetOptionSets } from '@/services';
import { NewScenarioFormData } from './types';

interface Step1TemplateScopeProps {
  formData: NewScenarioFormData;
  onFormDataChange: (next: NewScenarioFormData) => void;
  availableRegions: Array<'US' | 'Canada'>;
  availableScenarioTypes: string[];
  entityScopes: string[];
  datasetOptions: DatasetOptionSets;
  onChannelToggle: (channel: string) => void;
  onTagToggle: (tag: string) => void;
}

export const Step1TemplateScope: React.FC<Step1TemplateScopeProps> = ({
  formData,
  onFormDataChange,
  availableRegions,
  availableScenarioTypes,
  entityScopes,
  datasetOptions,
  onChannelToggle,
  onTagToggle,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Region
          </label>
          <select
            value={formData.region}
            onChange={(e) => onFormDataChange({ ...formData, region: e.target.value as 'US' | 'Canada' })}
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
            value={formData.scenarioType}
            onChange={(e) => onFormDataChange({ ...formData, scenarioType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={availableScenarioTypes.length === 0}
          >
            {availableScenarioTypes.length === 0 ? (
              <option value="">NA</option>
            ) : (
              availableScenarioTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))
            )}
          </select>
          {availableScenarioTypes.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">No scenario type data available.</p>
          )}
        </div>
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
