import React, { useEffect } from 'react';
import { ChevronDown, Lock } from 'lucide-react';
import { compactSelectBaseClass } from '@/components/ui/formStyles';
import { Select } from '@/components/ui';
import { DatasetOptionSets } from '@/services';
import { ScenarioTemplateOption } from '@/services/scenario';
import {
  getScenarioTypeSortRank,
  getScenarioTypeAllowedDcsForRegion,
  getScenarioTypeHelpText,
  normalizeScenarioTypeSpecificInput,
  resolveStep1ScenarioDefaults,
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
  scenarioTypeOverride?: string,
): NewScenarioFormData => {
  const resolvedScenarioType = scenarioTypeOverride || template?.scenarioType || '';
  const step1Defaults = resolveStep1ScenarioDefaults(resolvedScenarioType);
  const resolvedEntityScope = String(template?.entityScope || '').trim();
  const resolvedChannelScopes = template?.channelScopes || [];
  const resolvedTermsScope = String(template?.termsScopes?.[0] || '').trim();
  const isMeaningfulValue = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'na';
  };
  const fallbackTermsScopes = fallbackDatasetOptions.termsScopes.filter(isMeaningfulValue);
  return normalizeScenarioTypeSpecificInput({
    region: template?.region || step1Defaults.region || fallbackRegion,
    baselineScenarioId: template?.cloneFromScenarioId || template?.scenarioId || '',
    baselineDataflowId: template?.dataflowId || '',
    scenarioType: template?.scenarioType || '',
    entityScope: isMeaningfulValue(resolvedEntityScope) ? resolvedEntityScope : step1Defaults.entityScope || 'NA',
    channelScope: resolvedChannelScopes.some(isMeaningfulValue)
      ? [...resolvedChannelScopes.filter(isMeaningfulValue)]
      : [...step1Defaults.channelScope.filter(isMeaningfulValue)],
    termsScope:
      isMeaningfulValue(resolvedTermsScope)
        ? resolvedTermsScope
        : step1Defaults.termsScope || fallbackTermsScopes[0] || '',
    runName: '',
    tags: template ? [...template.tags] : [],
    notes: '',
    activeDCs: new Set(
      getScenarioTypeAllowedDcsForRegion(template?.scenarioType || '', template?.region || fallbackRegion).length > 0
        ? getScenarioTypeAllowedDcsForRegion(template?.scenarioType || '', template?.region || fallbackRegion)
        : template?.availableDcs || [],
    ),
    suppressedDCs: new Set<string>(),
    footprintMode: template?.footprintMode || fallbackDatasetOptions.footprintModes[0] || 'NA',
    utilCap: template?.utilCap ?? fallbackDatasetOptions.utilCaps[0] ?? 0,
    levelLoad: template?.levelLoad ?? fallbackDatasetOptions.levelLoadModes.includes('On'),
    leadTimeCap: template?.leadTimeCap ?? fallbackDatasetOptions.leadTimeCaps[0] ?? 0,
    excludeBeyondCap: template?.excludeBeyondCap ?? fallbackDatasetOptions.excludeBeyondCap.includes(true),
    costVsService: 0, // Default to Cost Priority
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
  resolveScenarioTypePolicy(scenarioType).allocationMode === 'baseline';
const isExactScenarioType = (scenarioType: string, candidate: ScenarioTemplateOption): boolean =>
  resolveScenarioTypePolicy(candidate.scenarioType).scenarioType === scenarioType;

const findExactBaselineTemplate = (
  templates: ScenarioTemplateOption[],
  region?: 'US' | 'Canada',
): ScenarioTemplateOption | null =>
  templates.find((template) =>
    isExactBaselineScenario(template.scenarioType) && (!region || template.region === region)
  ) || null;

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
  const selectedStep1Defaults = resolveStep1ScenarioDefaults(selectedScenarioType || baselineOptions[0]?.scenarioType || '');
  const scenarioTypeOptions = Array.from(
    new Set(regionTemplates.map((option) => option.scenarioType).filter(Boolean))
  ).sort((a, b) => {
    const rankDelta = scenarioTypeSortRank(a) - scenarioTypeSortRank(b);
    if (rankDelta !== 0) return rankDelta;
    return String(a || '').trim().toLowerCase().localeCompare(String(b || '').trim().toLowerCase());
  });
  const baselineScenarioOptions = baselineOptions.filter((item) =>
    isExactBaselineScenario(item.scenarioType)
  );
  const exactBaselineScenario = findExactBaselineTemplate(baselineScenarioOptions, formData.region as 'US' | 'Canada')
    || baselineScenarioOptions[0]
    || null;
  const selectedBaseScenario =
    (selectedScenarioPolicy.allocationMode === 'baseline' ? exactBaselineScenario : null)
    || baselineOptions.find((item) => isExactScenarioType(selectedScenarioType, item))
    || baselineOptions.find((item) => item.scenarioId === formData.baselineScenarioId)
    || baselineOptions.find((item) => scenarioTypeMatches(item.scenarioType, selectedScenarioType))
    || baselineOptions[0]
    || null;
  const renderedEntityScopes = entityScopes.length > 0
    ? entityScopes
    : [selectedStep1Defaults.entityScope || 'NA'];
  const meaningfulChannelScopes = datasetOptions.channelScopes.filter((channel) => {
    const normalized = String(channel || '').trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'na';
  });
  const renderedChannelScopes = meaningfulChannelScopes.length > 0
    ? meaningfulChannelScopes
    : selectedStep1Defaults.channelScope;
  const meaningfulTermsScopes = datasetOptions.termsScopes.filter((term) => {
    const normalized = String(term || '').trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'na';
  });
  const renderedTermsScopes = meaningfulTermsScopes.length > 0
    ? meaningfulTermsScopes
    : [selectedStep1Defaults.termsScope];
  const scopeLocked = true;

  useEffect(() => {
    console.groupCollapsed('[Step 1] baseline selection');
    console.log({
      scenarioType: formData.scenarioType || 'NA',
      selectedBaselineScenarioId:
        (selectedScenarioPolicy.allocationMode === 'baseline'
          ? exactBaselineScenario?.scenarioId
          : formData.baselineScenarioId) || 'NA',
      selectedBaselineScenarioName: selectedBaseScenario?.scenarioName || 'NA',
    });
    console.groupEnd();
  }, [exactBaselineScenario?.scenarioId, formData.baselineScenarioId, formData.scenarioType, selectedScenarioPolicy.allocationMode, selectedBaseScenario?.scenarioName]);

  // useEffect(() => {
  //   console.groupCollapsed('[Step 1] scope resolution');
  //   console.log({
  //     scenarioType: selectedScenarioType || 'NA',
  //     scenarioPolicy: {
  //       scenarioType: selectedScenarioPolicy.scenarioType,
  //       familyKey: selectedScenarioPolicy.familyKey,
  //       allocationMode: selectedScenarioPolicy.allocationMode,
  //     },
  //     selectedStep1Defaults,
  //     renderedEntityScopes,
  //     renderedChannelScopes,
  //     renderedTermsScopes,
  //     formDataScopeValues: {
  //       entityScope: formData.entityScope || 'NA',
  //       channelScope: formData.channelScope,
  //       termsScope: formData.termsScope || 'NA',
  //     },
  //     datasetOptions: {
  //       channelScopes: datasetOptions.channelScopes,
  //       termsScopes: datasetOptions.termsScopes,
  //     },
  //     selectedBaseScenario: selectedBaseScenario
  //       ? {
  //           scenarioId: selectedBaseScenario.scenarioId,
  //           scenarioName: selectedBaseScenario.scenarioName,
  //           scenarioType: selectedBaseScenario.scenarioType,
  //           entityScope: selectedBaseScenario.entityScope || 'NA',
  //         }
  //       : null,
  //   });
  //   console.groupEnd();
  // }, [
  //   datasetOptions.channelScopes,
  //   datasetOptions.termsScopes,
  //   formData.channelScope,
  //   formData.entityScope,
  //   formData.scenarioType,
  //   formData.termsScope,
  //   renderedChannelScopes,
  //   renderedEntityScopes,
  //   renderedTermsScopes,
  //   selectedBaseScenario,
  //   selectedScenarioPolicy.allocationMode,
  //   selectedScenarioPolicy.familyKey,
  //   selectedScenarioPolicy.scenarioType,
  //   selectedStep1Defaults,
  //   selectedScenarioType,
  // ]);

  return (
    <div className="surface-panel space-y-6 p-5">
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
          {/* <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Base Scenario</div>
            <div className="text-sm font-semibold text-slate-900">
              {selectedBaseScenario?.scenarioName || 'Select scenario type'}
            </div>
          </div> */}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Region
          </label>
          <div className="relative max-w-sm">
            <Select
              value={formData.region}
              onChange={(val) => {
                const nextRegion = val as 'All' | 'US' | 'Canada';
                if (nextRegion === 'All') return;
                const nextRegionTemplates = templatesByRegion[nextRegion] || baselineOptions;
                const nextType = nextRegionTemplates[0]?.scenarioType || '';
                const nextTemplate = nextType
                  ? (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline'
                    ? findExactBaselineTemplate(nextRegionTemplates, nextRegion)
                      || nextRegionTemplates[0]
                      || null
                    : nextRegionTemplates.find((item) => scenarioTypeMatches(item.scenarioType, nextType))
                      || nextRegionTemplates[0]
                      || null)
                  : nextRegionTemplates[0] || null;
                const nextFormData = {
                  ...buildFormDataFromTemplate(nextTemplate, nextRegion, datasetOptions, nextType),
                  region: nextRegion,
                  scenarioType: nextType,
                  runName: formData.runName,
                  notes: formData.notes,
                } as NewScenarioFormData;
                if (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline') {
                  const regionBaseline = findExactBaselineTemplate(nextRegionTemplates, nextRegion) || nextTemplate;
                  if (regionBaseline) {
                    nextFormData.baselineScenarioId = regionBaseline.scenarioId;
                    nextFormData.baselineDataflowId = String(regionBaseline.dataflowId || '');
                    nextFormData.scenarioType = regionBaseline.scenarioType;
                  }
                }
                onFormDataChange(nextFormData);
              }}
              options={availableRegions.map(r => ({
                value: r,
                label: r === 'All' ? 'All Workspaces' : r,
                disabled: r === 'All'
              }))}
            />
            <p className="mt-1 text-xs text-slate-500">Choose US or Canada to switch the template family.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Scenario Type
          </label>
          <Select
            value={selectedScenarioType}
            onChange={(val) => {
              const nextType = val;
              const matchingOptions = nextType
                ? (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline'
                  ? baselineScenarioOptions
                  : regionTemplates.filter((item) => scenarioTypeMatches(item.scenarioType, nextType)))
                : regionTemplates;
              const nextScenario = resolveScenarioTypePolicy(nextType).allocationMode === 'baseline'
                ? exactBaselineScenario
                : matchingOptions.find((item) => isExactScenarioType(nextType, item))
                  || matchingOptions[0]
                  || null;
              const nextFormData = {
                ...buildFormDataFromTemplate(nextScenario, formData.region as 'US' | 'Canada', datasetOptions, nextType),
                scenarioType: nextType,
                runName: formData.runName,
                notes: formData.notes,
              } as NewScenarioFormData;
              if (resolveScenarioTypePolicy(nextType).allocationMode === 'baseline' && exactBaselineScenario) {
                nextFormData.baselineScenarioId = exactBaselineScenario.scenarioId;
                nextFormData.baselineDataflowId = String(exactBaselineScenario.dataflowId || '');
                nextFormData.scenarioType = exactBaselineScenario.scenarioType;
              }
              onFormDataChange(nextFormData);
            }}
            options={scenarioTypeOptions.map(t => ({ value: t, label: t }))}
            placeholder="Select a scenario type"
          />
          <p className="text-xs text-slate-500 mt-1">Choose one scenario type. The base scenario will be picked automatically from the original scenarios in that type.</p>
          {getScenarioTypeHelpText(selectedScenarioType || baselineOptions[0]?.scenarioType, formData.region).length > 0 && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {getScenarioTypeHelpText(selectedScenarioType || baselineOptions[0]?.scenarioType, formData.region).map((line) => (
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
        <div className="mb-2 flex items-center gap-2">
          <label className="block text-sm font-medium text-slate-700">
            Entity Scope
          </label>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            <Lock className="mr-1 h-3 w-3" />
            Locked
          </span>
        </div>
        <div className="flex gap-4">
          {renderedEntityScopes.map((scope) => (
            <label key={scope} className={`flex items-center gap-2 ${scopeLocked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="entityScope"
                value={scope}
                checked={formData.entityScope === scope}
                onChange={(e) => onFormDataChange({ ...formData, entityScope: e.target.value })}
                disabled={scopeLocked}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{scope}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <label className="block text-sm font-medium text-slate-700">
            Channel Scope
          </label>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            <Lock className="mr-1 h-3 w-3" />
            Locked
          </span>
        </div>
        {renderedChannelScopes.length === 0 ? (
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
            {renderedChannelScopes.map((channel) => (
              <label key={channel} className="flex items-center gap-2 cursor-not-allowed opacity-80">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={formData.channelScope.includes(channel)}
                  onChange={() => onChannelToggle(channel)}
                  disabled={scopeLocked}
                />
                <span className="text-sm text-slate-700">{channel}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <label className="block text-sm font-medium text-slate-700">
            Terms Scope
          </label>
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
            <Lock className="mr-1 h-3 w-3" />
            Locked
          </span>
        </div>
        <Select
          value={formData.termsScope}
          onChange={(val) => onFormDataChange({ ...formData, termsScope: val })}
          disabled={scopeLocked || renderedTermsScopes.length === 0}
          options={renderedTermsScopes.length === 0 ? [] : renderedTermsScopes.map(t => ({ value: t, label: t }))}
          placeholder="NA"
        />
        {renderedTermsScopes.length === 0 && (
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

      {/* <div>
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
      </div> */}

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
