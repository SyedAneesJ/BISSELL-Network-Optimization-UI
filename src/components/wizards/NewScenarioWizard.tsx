import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Button, Modal } from '../ui';
import { DataHealthSnapshot } from '@/data';
import { DatasetOptionSets } from '@/services';
import { ScenarioTemplateOption, ScenarioWizardInput, ScenarioSubmit } from '@/services/scenario';
import {
  getScenarioTypeAllowedDcs,
  normalizeScenarioTypeSpecificInput,
  resolveScenarioTypePolicy,
  scenarioTypeMatches,
} from '@/services/scenario/scenarioTypeRules';
import {
  Step1TemplateScope,
  Step2NetworkCapacity,
  Step3ServiceCost,
  Step4RelocationBcv,
  Step5ValidateRun,
} from '@/sections/new-scenario';
import { NewScenarioFormData } from '@/sections/new-scenario';

export type NewScenarioInput = ScenarioWizardInput;
export type NewScenarioSubmit = ScenarioSubmit;

interface NewScenarioWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload: NewScenarioSubmit) => void;
  dataHealthSnapshot: DataHealthSnapshot;
  availableRegions: Array<'All' | 'US' | 'Canada'>;
  missingDataReasons: string[];
  scenarioTemplatesByRegion: Record<'US' | 'Canada', ScenarioTemplateOption[]>;
  datasetOptions: DatasetOptionSets;
}

const emptyDatasetOptions: DatasetOptionSets = {
  scenarioTypes: [],
  channelScopes: [],
  termsScopes: [],
  tags: [],
  footprintModes: [],
  utilCaps: [],
  levelLoadModes: [],
  leadTimeCaps: [],
  excludeBeyondCap: [],
  costVsServiceWeights: [],
  fuelSurchargeModes: [],
  accessorialFlags: [],
  allowRelocationPrepaid: [],
  allowRelocationCollect: [],
  bcvRuleSets: [],
  allowManualOverride: [],
};

const templateToDatasetOptions = (template?: ScenarioTemplateOption | null): DatasetOptionSets =>
    template
    ? {
        scenarioTypes: [template.scenarioType],
        channelScopes: template.channelScopes,
        termsScopes: template.termsScopes,
        tags: template.tags,
        footprintModes: [template.footprintMode],
        utilCaps: [template.utilCap],
        levelLoadModes: [template.levelLoad ? 'On' : 'Off'],
        leadTimeCaps: [template.leadTimeCap],
        excludeBeyondCap: [template.excludeBeyondCap],
        costVsServiceWeights: [template.costVsService],
        fuelSurchargeModes: [template.fuelSurchargeMode],
        accessorialFlags: template.accessorialFlags,
        allowRelocationPrepaid: [template.allowRelocationPrepaid],
        allowRelocationCollect: [template.allowRelocationCollect],
        bcvRuleSets: [template.bcvRuleSet],
        allowManualOverride: [template.allowManualOverride],
      }
    : emptyDatasetOptions;

const templateToFormData = (
  template: ScenarioTemplateOption | null,
  fallbackRegion: 'US' | 'Canada',
  fallbackDatasetOptions: DatasetOptionSets,
): NewScenarioFormData => {
  const policy = resolveScenarioTypePolicy(template?.scenarioType || '');
  return normalizeScenarioTypeSpecificInput({
    region: template?.region || fallbackRegion,
    baselineScenarioId: template?.baselineScenarioId || template?.scenarioId || '',
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
    levelLoad: template?.levelLoad ?? (fallbackDatasetOptions.levelLoadModes.includes('On')),
    leadTimeCap: template?.leadTimeCap ?? fallbackDatasetOptions.leadTimeCaps[0] ?? 0,
    excludeBeyondCap: template?.excludeBeyondCap ?? (fallbackDatasetOptions.excludeBeyondCap.includes(true)),
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

const isExactBaselineScenario = (scenarioType: unknown): boolean =>
  resolveScenarioTypePolicy(scenarioType).scenarioType === 'US Baseline';

const isExactUsBaselineTemplate = (template: ScenarioTemplateOption | null): boolean =>
  Boolean(template)
  && isExactBaselineScenario(template?.scenarioType)
  && String(template?.dataflowId || '').trim() === '3267';

const findExactUsBaselineTemplate = (templates: ScenarioTemplateOption[]): ScenarioTemplateOption | null =>
  templates.find((template) => isExactUsBaselineTemplate(template)) || null;

export const NewScenarioWizard: React.FC<NewScenarioWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  dataHealthSnapshot,
  availableRegions,
  missingDataReasons,
  scenarioTemplatesByRegion,
  datasetOptions,
}) => {
  const [step, setStep] = useState(1);
  const initialRegion: 'US' = 'US';
  const getTemplatesForRegion = (region: 'US' | 'Canada') => scenarioTemplatesByRegion[region] || [];
  const initialRegionTemplates = getTemplatesForRegion(initialRegion);
  const initialTemplate =
    findExactUsBaselineTemplate(initialRegionTemplates)
    || initialRegionTemplates[0]
    || null;
  const [formData, setFormData] = useState<NewScenarioFormData>(() => templateToFormData(initialTemplate, initialRegion, datasetOptions));
  const prevIsOpenRef = useRef(isOpen);
  const activePolicy = useMemo(
    () => resolveScenarioTypePolicy(formData.scenarioType || initialTemplate?.scenarioType || ''),
    [formData.scenarioType, initialTemplate?.scenarioType],
  );
  const handleFormDataChange = useCallback((next: NewScenarioFormData) => {
    setFormData(normalizeScenarioTypeSpecificInput(next));
  }, []);

  const sortedTemplatesForRegion = useMemo(() => {
    const templates = getTemplatesForRegion(formData.region);
    const filteredByType = formData.scenarioType
      ? templates.filter((template) => scenarioTypeMatches(template.scenarioType, formData.scenarioType))
      : templates;
    return [...filteredByType].sort((a, b) => {
      const dataflowDiff = Number(a.dataflowId || Number.MAX_SAFE_INTEGER) - Number(b.dataflowId || Number.MAX_SAFE_INTEGER);
      if (dataflowDiff !== 0) return dataflowDiff;
      return a.scenarioName.localeCompare(b.scenarioName);
    });
  }, [formData.region, formData.scenarioType, scenarioTemplatesByRegion]);

  const selectedTemplate = useMemo(() => {
    const templates = sortedTemplatesForRegion;
    const selectedPolicy = resolveScenarioTypePolicy(formData.scenarioType || initialTemplate?.scenarioType || '');
    if (selectedPolicy.allocationMode === 'baseline') {
      return findExactUsBaselineTemplate(templates) || templates[0] || null;
    }
    return (
      templates.find((template) => String(template.scenarioType || '').trim() === String(formData.scenarioType || '').trim())
      || templates.find((template) =>
        template.scenarioId === formData.baselineScenarioId
        || template.baselineScenarioId === formData.baselineScenarioId
      )
      || templates[0]
      || null
    );
  }, [formData.baselineScenarioId, formData.scenarioType, initialTemplate?.scenarioType, sortedTemplatesForRegion]);

  const effectiveDatasetOptions = useMemo(() => templateToDatasetOptions(selectedTemplate), [selectedTemplate]);
  const regionDcs = getScenarioTypeAllowedDcs(selectedTemplate?.scenarioType || formData.scenarioType || '');
  const regionDcCapacity = selectedTemplate?.availableDcCapacity || {};
  const entityScopes = selectedTemplate ? [selectedTemplate.entityScope] : ['NA'];
  const utilCapMin = 0;
  const utilCapMax = 100;

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    if (!wasOpen && isOpen) {
      setStep(1);
      handleFormDataChange(templateToFormData(initialTemplate, initialRegion, datasetOptions));
    }
    prevIsOpenRef.current = isOpen;
  }, [handleFormDataChange, isOpen, initialRegion, datasetOptions, initialTemplate]);

  const totalSteps = 5;
  const visibleMissingDataReasons = missingDataReasons.filter((reason) => {
    const normalized = String(reason || '').trim().toLowerCase();
    return normalized !== 'overrides';
  });
  const isStep1Valid =
    Boolean(formData.region) &&
    Boolean(formData.scenarioType) &&
    Boolean(formData.baselineScenarioId) &&
    Boolean(formData.entityScope) &&
    formData.runName.trim().length > 0;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleDCToggle = (dc: string) => {
    const newActive = new Set(formData.activeDCs);
    const newSuppressed = new Set(formData.suppressedDCs);

    if (newActive.has(dc)) {
      newActive.delete(dc);
      newSuppressed.add(dc);
    } else {
      newActive.add(dc);
      newSuppressed.delete(dc);
    }

    handleFormDataChange({ ...formData, activeDCs: newActive, suppressedDCs: newSuppressed });
  };

  const handleChannelToggle = (channel: string) => {
    const next = new Set(formData.channelScope);
    if (next.has(channel)) next.delete(channel);
    else next.add(channel);
    handleFormDataChange({ ...formData, channelScope: Array.from(next) });
  };

  const handleTagToggle = (tag: string) => {
    const next = new Set(formData.tags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    handleFormDataChange({ ...formData, tags: Array.from(next) });
  };

  const buildInput = (): NewScenarioInput => normalizeScenarioTypeSpecificInput({
    region: formData.region as 'US' | 'Canada',
    scenarioType: formData.scenarioType || selectedTemplate?.scenarioType || '',
    entityScope: formData.entityScope,
    channelScope: [...formData.channelScope],
    termsScope: formData.termsScope,
    runName: formData.runName,
    tags: [...formData.tags],
    notes: formData.notes,
    activeDCs: Array.from(formData.activeDCs),
    suppressedDCs: Array.from(formData.suppressedDCs),
    footprintMode: formData.footprintMode,
    utilCap: formData.utilCap,
    levelLoad: formData.levelLoad,
    leadTimeCap: formData.leadTimeCap,
    excludeBeyondCap: formData.excludeBeyondCap,
    costVsService: formData.costVsService,
    fuelSurchargeMode: formData.fuelSurchargeMode,
    fuelSurchargeOverride: formData.fuelSurchargeOverride,
    accessorials: { ...formData.accessorials },
    allowRelocationPrepaid: formData.allowRelocationPrepaid,
    allowRelocationCollect: formData.allowRelocationCollect,
    bcvRuleSet: formData.bcvRuleSet,
    allowManualOverride: false,
    baselineScenarioId: resolveScenarioTypePolicy(formData.scenarioType || selectedTemplate?.scenarioType || '').allocationMode === 'baseline'
      ? (findExactUsBaselineTemplate(sortedTemplatesForRegion)?.scenarioId || initialTemplate?.scenarioId || formData.baselineScenarioId)
      : formData.baselineScenarioId,
    baselineDataflowId: resolveScenarioTypePolicy(formData.scenarioType || selectedTemplate?.scenarioType || '').allocationMode === 'baseline'
      ? (findExactUsBaselineTemplate(sortedTemplatesForRegion)?.dataflowId || initialTemplate?.dataflowId || '3267')
      : formData.baselineDataflowId,
  }) as NewScenarioInput;

  const handleCreate = () => {
    onComplete({ action: 'draft', input: buildInput() });
    onClose();
  };

  const handleSaveDraft = () => {
    onComplete({ action: 'draft', input: buildInput() });
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Step1TemplateScope
            formData={formData}
            onFormDataChange={handleFormDataChange}
            availableRegions={availableRegions}
            baselineOptions={sortedTemplatesForRegion}
            templatesByRegion={scenarioTemplatesByRegion}
            entityScopes={entityScopes}
            datasetOptions={effectiveDatasetOptions}
            onChannelToggle={handleChannelToggle}
            onTagToggle={handleTagToggle}
          />
        );
      case 2:
        return (
          <Step2NetworkCapacity
            formData={formData}
            onFormDataChange={handleFormDataChange}
            datasetOptions={effectiveDatasetOptions}
            availableDcsByRegion={{ [formData.region]: regionDcs }}
            availableDcCapacity={regionDcCapacity}
            onDCToggle={handleDCToggle}
            utilCapMin={utilCapMin}
            utilCapMax={utilCapMax}
            scenarioPolicy={activePolicy}
          />
        );
      case 3:
        return (
          <Step3ServiceCost
            formData={formData}
            onFormDataChange={setFormData}
            datasetOptions={effectiveDatasetOptions}
          />
        );
      case 4:
        return (
          <Step4RelocationBcv
            formData={formData}
            onFormDataChange={handleFormDataChange}
            datasetOptions={effectiveDatasetOptions}
            scenarioPolicy={activePolicy}
          />
        );
      case 5:
        return (
          <Step5ValidateRun
            formData={formData}
            datasetOptions={effectiveDatasetOptions}
            dataHealthSnapshot={dataHealthSnapshot}
            availableDcsByRegion={{ [formData.region]: regionDcs }}
          />
        );
      default:
        return null;
    }
  };

  const stepTitles = [
    'Template & Scope',
    'Network & Capacity Controls',
    'Service & Cost Controls',
    'Relocation & BCV Rules',
    'Validate & Run',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`New Scenario - Step ${step} of ${totalSteps}`}
      size="xlarge"
      footer={
        <>
          <div className="flex-1 flex items-center gap-2">
            {stepTitles.map((title, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  idx + 1 === step ? 'bg-blue-600' : idx + 1 < step ? 'bg-green-500' : 'bg-slate-200'
                }`}
                title={title}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 1 && (
              <Button onClick={handleBack} variant="secondary" icon={<ChevronLeft className="w-4 h-4" />}>
                Back
              </Button>
            )}

            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>

            {step === totalSteps && (
              <Button variant="secondary" onClick={handleSaveDraft}>
                Save Draft
              </Button>
            )}

            {step < totalSteps ? (
              <Button
                onClick={handleNext}
                variant="primary"
                icon={<ChevronRight className="w-4 h-4" />}
                disabled={step === 1 && !isStep1Valid}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleCreate} variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                Create Scenario
              </Button>
            )}
          </div>
        </>
      }
    >
      {visibleMissingDataReasons.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          Missing data: {visibleMissingDataReasons.join(', ')}. These sections will be unavailable after scenario creation.
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{stepTitles[step - 1]}</h3>
      </div>

      {renderStepContent()}
    </Modal>
  );
};
