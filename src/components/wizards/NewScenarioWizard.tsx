import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Button, Modal } from '../ui';
import { DataHealthSnapshot } from '@/data';
import { DatasetOptionSets } from '@/services';
import { ScenarioTemplateOption, ScenarioWizardInput, ScenarioSubmit } from '@/services/scenario';
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
  availableRegions: Array<'US' | 'Canada'>;
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
): NewScenarioFormData => ({
  region: template?.region || fallbackRegion,
  baselineScenarioId: template?.scenarioId || '',
  baselineDataflowId: template?.dataflowId || '',
  scenarioType: '',
  entityScope: template?.entityScope || 'NA',
  channelScope: template ? [...template.channelScopes] : [...fallbackDatasetOptions.channelScopes],
  termsScope: template?.termsScopes[0] || fallbackDatasetOptions.termsScopes[0] || '',
  runName: template ? `${template.scenarioName} - Copy` : '',
  tags: template ? [...template.tags] : [],
  notes: '',
  activeDCs: new Set(template?.availableDcs || []),
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
  const initialRegion = availableRegions[0] || 'US';
  const getTemplatesForRegion = (region: 'US' | 'Canada') => scenarioTemplatesByRegion[region] || [];
  const initialTemplate = getTemplatesForRegion(initialRegion)[0] || null;
  const [formData, setFormData] = useState<NewScenarioFormData>(() => templateToFormData(initialTemplate, initialRegion, datasetOptions));
  const prevIsOpenRef = useRef(isOpen);

  const sortedTemplatesForRegion = useMemo(() => {
    const templates = getTemplatesForRegion(formData.region);
    const filteredByType = formData.scenarioType
      ? templates.filter((template) => template.scenarioType === formData.scenarioType)
      : templates;
    return [...filteredByType].sort((a, b) => {
      const dataflowDiff = Number(a.dataflowId || Number.MAX_SAFE_INTEGER) - Number(b.dataflowId || Number.MAX_SAFE_INTEGER);
      if (dataflowDiff !== 0) return dataflowDiff;
      return a.scenarioName.localeCompare(b.scenarioName);
    });
  }, [formData.region, formData.scenarioType, scenarioTemplatesByRegion]);

  const selectedTemplate = useMemo(() => {
    const templates = sortedTemplatesForRegion;
    return templates.find((template) => template.scenarioId === formData.baselineScenarioId) || templates[0] || null;
  }, [formData.baselineScenarioId, sortedTemplatesForRegion]);

  const effectiveDatasetOptions = useMemo(() => templateToDatasetOptions(selectedTemplate), [selectedTemplate]);
  const regionDcs = selectedTemplate?.availableDcs || [];
  const regionDcCapacity = selectedTemplate?.availableDcCapacity || {};
  const entityScopes = selectedTemplate ? [selectedTemplate.entityScope] : ['NA'];
  const utilCapMin = selectedTemplate ? Math.min(50, selectedTemplate.utilCap) : 30;
  const utilCapMax = 100;

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    if (!wasOpen && isOpen) {
      setStep(1);
      setFormData(templateToFormData(getTemplatesForRegion(initialRegion)[0] || null, initialRegion, datasetOptions));
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialRegion, datasetOptions]);

  useEffect(() => {
    const templates = getTemplatesForRegion(formData.region);
    if (templates.length === 0) return;
    const filtered = formData.scenarioType
      ? templates.filter((template) => template.scenarioType === formData.scenarioType)
      : templates;
    const current = filtered.find((template) => template.scenarioId === formData.baselineScenarioId);
    const nextTemplate = current || filtered[0];
    if (!nextTemplate) return;
    if (current && formData.baselineDataflowId === nextTemplate.dataflowId) return;
    setFormData((prev) => ({
      ...templateToFormData(nextTemplate, formData.region, datasetOptions),
      scenarioType: prev.scenarioType || nextTemplate.scenarioType || '',
      runName: prev.runName || `${nextTemplate.scenarioName} - Copy`,
      notes: prev.notes,
    }));
  }, [formData.region, formData.baselineScenarioId, formData.baselineDataflowId, formData.scenarioType, datasetOptions, scenarioTemplatesByRegion]);

  const totalSteps = 5;
  const isStep1Valid =
    Boolean(formData.region) &&
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

    setFormData({ ...formData, activeDCs: newActive, suppressedDCs: newSuppressed });
  };

  const handleChannelToggle = (channel: string) => {
    const next = new Set(formData.channelScope);
    if (next.has(channel)) next.delete(channel);
    else next.add(channel);
    setFormData({ ...formData, channelScope: Array.from(next) });
  };

  const handleTagToggle = (tag: string) => {
    const next = new Set(formData.tags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setFormData({ ...formData, tags: Array.from(next) });
  };

  const buildInput = (): NewScenarioInput => ({
    region: formData.region as 'US' | 'Canada',
    baselineScenarioId: formData.baselineScenarioId,
    baselineDataflowId: formData.baselineDataflowId,
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
    allowManualOverride: formData.allowManualOverride,
  });

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
            onFormDataChange={setFormData}
            availableRegions={availableRegions}
            baselineOptions={sortedTemplatesForRegion}
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
            onFormDataChange={setFormData}
            datasetOptions={effectiveDatasetOptions}
            availableDcsByRegion={{ [formData.region]: regionDcs }}
            availableDcCapacity={regionDcCapacity}
            onDCToggle={handleDCToggle}
            utilCapMin={utilCapMin}
            utilCapMax={utilCapMax}
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
            onFormDataChange={setFormData}
            datasetOptions={effectiveDatasetOptions}
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
      {missingDataReasons.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          Missing data: {missingDataReasons.join(', ')}. These sections will be unavailable after scenario creation.
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{stepTitles[step - 1]}</h3>
      </div>

      {renderStepContent()}
    </Modal>
  );
};
