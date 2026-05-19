import React, { useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { DatasetOptionSets } from '@/services';
import { ScenarioTemplateOption } from '@/services/scenario';
import {
  getScenarioTypeSortRank,
  normalizeScenarioTypeSpecificInput,
  resolveScenarioTypePolicy,
  scenarioTypeMatches,
} from '@/services/scenario/scenarioTypeRules';
import { NewScenarioFormData } from './types';

interface Step1TemplateScopeProps {
  formData: NewScenarioFormData;
  onFormDataChange: (next: NewScenarioFormData) => void;
  availableRegions: Array<'All' | 'US' | 'Canada'>;
  baselineOptions: ScenarioTemplateOption[];
  templatesByRegion: Record<'US' | 'Canada', ScenarioTemplateOption[]>;
  entityScopes: string[];
  datasetOptions: DatasetOptionSets;
  onChannelToggle: (channel: string) => void;
  onTagToggle: (tag: string) => void;
}

const buildFormDataFromTemplate = (
  template: ScenarioTemplateOption | null,
  fallbackRegion: 'US' | 'Canada',
  fallbackDatasetOptions: DatasetOptionSets,
): NewScenarioFormData => {
  const policy = resolveScenarioTypePolicy(template?.scenarioType || '');
  return normalizeScenarioTypeSpecificInput({
    region: template?.region || fallbackRegion,
    baselineScenarioId: template?.scenarioId || '',
    baselineDataflowId: template?.dataflowId || '',
    scenarioType: template?.scenarioType || '',
    entityScope: template?.entityScope || 'NA',
    channelScope: template ? [...template.channelScopes] : [...fallbackDatasetOptions.channelScopes],
    termsScope: template?.termsScopes[0] || fallbackDatasetOptions.termsScopes[0] || '',
    runName: '',
    tags: template ? [...template.tags] : [],
    notes: '',
    activeDCs: new Set(policy.allowedDcs.length > 0 ? policy.allowedDcs : template?.availableDcs || []),
    suppressedDCs: new Set<string>(),
    footprintMode: template?.footprintMode || fallbackDatasetOptions.footprintModes[0] || 'NA',
    utilCap: template?.utilCap ?? fallbackDatasetOptions.utilCaps[0] ?? 0,
    levelLoad: template?.levelLoad ?? fallbackDatasetOptions.levelLoadModes.includes('On'),
    leadTimeCap: template?.leadTimeCap ?? fallbackDatasetOptions.leadTimeCaps[0] ?? 0,
    excludeBeyondCap: template?.excludeBeyondCap ?? fallbackDatasetOptions.excludeBeyondCap.includes(true),
    costVsService: template?.costVsService ?? fallbackDatasetOptions.costVsServiceWeights[0] ?? 0,
    fuelSurchargeMode: template?.fuelSurchargeMode || fallbackDatasetOptions.fuelSurchargeModes[0] || 'NA',
    fuelSurchargeOverride: template?.fuelSurchargeOverride ?? null,
    accessorials: {
      residential: template ? template.accessorialFlags.includes('Residential') : fallbackDatasetOptions.accessorialFlags.includes('Residential'),
      liftgate: template ? template.accessorialFlags.includes('Liftgate') : fallbackDatasetOptions.accessorialFlags.includes('Liftgate'),
      insideDelivery: template ? template.accessorialFlags.includes('InsideDelivery') : fallbackDatasetOptions.accessorialFlags.includes('InsideDelivery'),
    },
    allowRelocationPrepaid: template?.allowRelocationPrepaid ?? fallbackDatasetOptions.allowRelocationPrepaid.includes(true),
    allowRelocationCollect: template?.allowRelocationCollect ?? fallbackDatasetOptions.allowRelocationCollect.includes(true),
    bcvRuleSet: template?.bcvRuleSet || fallbackDatasetOptions.bcvRuleSets[0] || 'NA',
    allowManualOverride: template?.allowManualOverride ?? fallbackDatasetOptions.allowManualOverride.includes(true),
  });
};

const scenarioTypeSortRank = (value: string): number => getScenarioTypeSortRank(value);
const isExactBaselineScenario = (scenarioType: unknown): boolean =>
  resolveScenarioTypePolicy(scenarioType).scenarioType === 'US Baseline';
const isExactUsBaselineTemplate = (template: ScenarioTemplateOption | null): boolean =>
  Boolean(template)
  && isExactBaselineScenario(template?.scenarioType)
  && String(template?.dataflowId || '').trim() === '3267';

const findExactUsBaselineTemplate = (templates: ScenarioTemplateOption[]): ScenarioTemplateOption | null =>
  templates.find((template) => isExactUsBaselineTemplate(template)) || null;

export const Step1TemplateScope: React.FC<Step1TemplateScopeProps> = ({
  formData,
  onFormDataChange,
  availableRegions,
  baselineOptions,
  templatesByRegion,
  entityScopes,
  datasetOptions,
  onChannelToggle,
  onTagToggle,
}) => {
  const regionTemplates = templatesByRegion[formData.region] || baselineOptions;
  const selectedScenarioType = formData.scenarioType || '';
  const selectedScenarioPolicy = resolveScenarioTypePolicy(selectedScenarioType || baselineOptions[0]?.scenarioType || '');
  const scenarioTypeOptions = Array.from(
    new Set(regionTemplates.map((option) => option.scenarioType).filter(Boolean))
  ).sort((a, b) => {
    const rankDelta = scenarioTypeSortRank(a) - scenarioTypeSortRank(b);
    if (rankDelta !== 0) return rankDelta;
    return String(a || '').trim().toLowerCase().localeCompare(String(b || '').trim().toLowerCase());
  });
  const baselineScenarioOptions = baselineOptions.filter((item) =>
    isExactUsBaselineTemplate(item)
  );
  const exactUsBaselineScenario = baselineScenarioOptions[0] || null;
  const selectedBaseScenario =
    (selectedScenarioPolicy.allocationMode === 'baseline' ? exactUsBaselineScenario : null)
    || baselineOptions.find((item) => item.scenarioId === formData.baselineScenarioId)
    || baselineOptions.find((item) => scenarioTypeMatches(item.scenarioType, selectedScenarioType))
    || baselineOptions[0]
    || null;

  useEffect(() => {
    console.groupCollapsed('[Step 1] baseline selection');
    console.log({
      scenarioType: formData.scenarioType || 'NA',
      selectedBaselineScenarioId:
        (selectedScenarioPolicy.allocationMode === 'baseline'
          ? exactUsBaselineScenario?.scenarioId
          : formData.baselineScenarioId) || 'NA',
      selectedBaselineScenarioName: selectedBaseScenario?.scenarioName || 'NA',
    });
    console.groupEnd();
  }, [exactUsBaselineScenario?.scenarioId, formData.baselineScenarioId, formData.scenarioType, selectedScenarioPolicy.allocationMode, selectedBaseScenario?.scenarioName]);

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
            <div className="text-xs uppercase tracking-wide text-slate-500">Base Scenario</div>
            <div className="text-sm font-semibold text-slate-900">
              {selectedBaseScenario?.scenarioName || 'Select scenario type'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Region
          </label>
          <div className="relative group max-w-sm">
            <select
              value="US"
              onChange={(e) => {
              const nextRegion = e.target.value as 'All' | 'US' | 'Canada';
              if (nextRegion !== 'US') return;
              const nextRegionTemplates = templatesByRegion.US || baselineOptions;
              const nextType = nextRegionTemplates[0]?.scenarioType || '';
              const nextTemplate = nextType
                ? (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline'
                  ? findExactUsBaselineTemplate(nextRegionTemplates)
                    || nextRegionTemplates[0]
                    || null
                  : nextRegionTemplates.find((item) => scenarioTypeMatches(item.scenarioType, nextType))
                    || nextRegionTemplates[0]
                    || null)
                : nextRegionTemplates[0] || null;
                const nextFormData = {
                  ...buildFormDataFromTemplate(nextTemplate, 'US', datasetOptions),
                  region: 'US',
                  scenarioType: nextType,
                  runName: formData.runName,
                  notes: formData.notes,
                } as NewScenarioFormData;
                if (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline' && exactUsBaselineScenario) {
                  nextFormData.baselineScenarioId = exactUsBaselineScenario.scenarioId;
                  nextFormData.baselineDataflowId = String(exactUsBaselineScenario.dataflowId || '3267');
                  nextFormData.scenarioType = exactUsBaselineScenario.scenarioType;
                }
                onFormDataChange(nextFormData);
              }}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              title="Only US is selectable for now"
            >
              {availableRegions.map((region) => (
                <option key={region} value={region} disabled={region !== 'US'}>
                  {region === 'All' ? 'All Workspaces' : region}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <span className="pointer-events-none absolute right-9 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm transition group-hover:flex">
              <Lock className="h-3 w-3" />
              Disabled
            </span>
            <p className="mt-1 text-xs text-slate-500">All Workspaces and Canada are visible but disabled.</p>
          </div>
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
                ? (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline'
                  ? baselineScenarioOptions
                  : regionTemplates.filter((item) => scenarioTypeMatches(item.scenarioType, nextType)))
                : regionTemplates;
              const nextScenario = resolveScenarioTypePolicy(nextType).allocationMode === 'baseline'
                ? exactUsBaselineScenario
                : matchingOptions[0] || null;
              const nextFormData = {
                ...buildFormDataFromTemplate(nextScenario, formData.region as 'US' | 'Canada', datasetOptions),
                scenarioType: nextType,
                runName: formData.runName,
                notes: formData.notes,
              } as NewScenarioFormData;
              if (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline' && exactUsBaselineScenario) {
                nextFormData.baselineScenarioId = exactUsBaselineScenario.scenarioId;
                nextFormData.baselineDataflowId = String(exactUsBaselineScenario.dataflowId || '3267');
                nextFormData.scenarioType = exactUsBaselineScenario.scenarioType;
              }
              onFormDataChange(nextFormData);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a scenario type</option>
            {scenarioTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Choose one scenario type. The base scenario will be picked automatically from the original scenarios in that type.</p>
          {selectedScenarioPolicy.helpText.length > 0 && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {selectedScenarioPolicy.helpText.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          {baselineOptions.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">No scenario data available for this region.</p>
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
