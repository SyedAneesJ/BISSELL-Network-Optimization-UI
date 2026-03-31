import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Button, Modal } from '../ui';
import { DataHealthSnapshot } from '@/data';
import { DatasetOptionSets } from '@/services';
import {
  Step1TemplateScope,
  Step2NetworkCapacity,
  Step3ServiceCost,
  Step4RelocationBcv,
  Step5ValidateRun,
  NewScenarioFormData,
} from '@/sections/new-scenario';

export interface NewScenarioInput {
  region: 'US' | 'Canada';
  scenarioType: string;
  entityScope: string;
  channelScope: string[];
  termsScope: string;
  runName: string;
  tags: string[];
  notes: string;
  activeDCs: string[];
  suppressedDCs: string[];
  footprintMode: string;
  utilCap: number;
  levelLoad: boolean;
  leadTimeCap: number;
  excludeBeyondCap: boolean;
  costVsService: number;
  fuelSurchargeMode: string;
  fuelSurchargeOverride: number | null;
  accessorials: {
    residential: boolean;
    liftgate: boolean;
    insideDelivery: boolean;
  };
  allowRelocationPrepaid: boolean;
  allowRelocationCollect: boolean;
  bcvRuleSet: string;
  allowManualOverride: boolean;
}

export interface NewScenarioSubmit {
  action: 'run' | 'draft';
  input: NewScenarioInput;
}

interface NewScenarioWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (payload: NewScenarioSubmit) => void;
  dataHealthSnapshot: DataHealthSnapshot;
  availableRegions: Array<'US' | 'Canada'>;
  availableEntities: string[];
  availableDcsByRegion: Record<string, string[]>;
  availableDcCapacity: Record<string, number>;
  missingDataReasons: string[];
  availableScenarioTypes: string[];
  datasetOptions: DatasetOptionSets;
}

export const NewScenarioWizard: React.FC<NewScenarioWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  dataHealthSnapshot,
  availableRegions,
  availableEntities,
  availableDcsByRegion,
  availableDcCapacity,
  missingDataReasons,
  availableScenarioTypes,
  datasetOptions,
}) => {
  const [step, setStep] = useState(1);
  const initialRegion = availableRegions[0] || 'US';
  const entityScopes = Array.from(
    new Set(
      availableEntities.length > 1
        ? [...availableEntities, availableEntities.join('/')]
        : availableEntities.length > 0
          ? availableEntities
          : ['Unknown']
    )
  );
  const initialEntities = entityScopes[0] || 'Unknown';
  const initialScenarioType = availableScenarioTypes[0] || '';
  const initialChannelScope = datasetOptions.channelScopes.length > 0 ? datasetOptions.channelScopes : [];
  const initialTermsScope = datasetOptions.termsScopes[0] || '';
  const initialFootprintMode = datasetOptions.footprintModes[0] || 'Fixed';
  const initialUtilCap = datasetOptions.utilCaps[0] ?? 80;
  const initialLevelLoad = datasetOptions.levelLoadModes.length > 0
    ? datasetOptions.levelLoadModes.includes('On')
    : false;
  const initialLeadTimeCap = datasetOptions.leadTimeCaps[0] ?? 0;
  const initialExcludeBeyondCap = datasetOptions.excludeBeyondCap.length > 0
    ? datasetOptions.excludeBeyondCap.includes(true)
    : false;
  const initialCostVsService = datasetOptions.costVsServiceWeights[0] ?? 50;
  const initialFuelSurchargeMode = datasetOptions.fuelSurchargeModes[0] || 'FromRates';
  const initialAccessorials = {
    residential: datasetOptions.accessorialFlags.includes('Residential'),
    liftgate: datasetOptions.accessorialFlags.includes('Liftgate'),
    insideDelivery: datasetOptions.accessorialFlags.includes('InsideDelivery'),
  };
  const initialAllowRelocationPrepaid = datasetOptions.allowRelocationPrepaid.includes(true);
  const initialAllowRelocationCollect = datasetOptions.allowRelocationCollect.includes(true);
  const initialBcvRuleSet = datasetOptions.bcvRuleSets[0] || 'Default';
  const initialAllowManualOverride = datasetOptions.allowManualOverride.includes(true);
  const buildInitialFormData = (): NewScenarioFormData => ({
    region: initialRegion,
    scenarioType: initialScenarioType,
    entityScope: initialEntities,
    channelScope: initialChannelScope,
    termsScope: initialTermsScope,
    runName: '',
    tags: [] as string[],
    notes: '',
    activeDCs: new Set(availableDcsByRegion[initialRegion] || []),
    suppressedDCs: new Set<string>(),
    footprintMode: initialFootprintMode,
    utilCap: initialUtilCap,
    levelLoad: initialLevelLoad,
    leadTimeCap: initialLeadTimeCap,
    excludeBeyondCap: initialExcludeBeyondCap,
    costVsService: initialCostVsService,
    fuelSurchargeMode: initialFuelSurchargeMode,
    fuelSurchargeOverride: null as number | null,
    accessorials: initialAccessorials,
    allowRelocationPrepaid: initialAllowRelocationPrepaid,
    allowRelocationCollect: initialAllowRelocationCollect,
    bcvRuleSet: initialBcvRuleSet,
    allowManualOverride: initialAllowManualOverride,
  });
  const [formData, setFormData] = useState<NewScenarioFormData>(buildInitialFormData);
  const prevIsOpenRef = useRef(isOpen);
  const utilCapMin = datasetOptions.utilCaps.length > 0
    ? Math.min(60, ...datasetOptions.utilCaps)
    : 30;
  const utilCapMax = 100;

  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    if (!wasOpen && isOpen) {
      setStep(1);
      setFormData(buildInitialFormData());
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const dcsForRegion = availableDcsByRegion[formData.region] || [];
    setFormData((prev) => ({
      ...prev,
      activeDCs: new Set(dcsForRegion),
      suppressedDCs: new Set<string>(),
    }));
  }, [formData.region, availableDcsByRegion]);

  const totalSteps = 5;
  const isStep1Valid =
    Boolean(formData.region) &&
    Boolean(formData.scenarioType) &&
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
    if (next.has(channel)) {
      next.delete(channel);
    } else {
      next.add(channel);
    }
    setFormData({ ...formData, channelScope: Array.from(next) });
  };

  const handleTagToggle = (tag: string) => {
    const next = new Set(formData.tags);
    if (next.has(tag)) {
      next.delete(tag);
    } else {
      next.add(tag);
    }
    setFormData({ ...formData, tags: Array.from(next) });
  };

  const buildInput = (): NewScenarioInput => ({
    region: formData.region as 'US' | 'Canada',
    scenarioType: formData.scenarioType,
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

  const handleRun = () => {
    onComplete({ action: 'run', input: buildInput() });
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
            availableScenarioTypes={availableScenarioTypes}
            entityScopes={entityScopes}
            datasetOptions={datasetOptions}
            onChannelToggle={handleChannelToggle}
            onTagToggle={handleTagToggle}
          />
        );
      case 2:
        return (
          <Step2NetworkCapacity
            formData={formData}
            onFormDataChange={setFormData}
            datasetOptions={datasetOptions}
            availableDcsByRegion={availableDcsByRegion}
            availableDcCapacity={availableDcCapacity}
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
            datasetOptions={datasetOptions}
          />
        );
      case 4:
        return (
          <Step4RelocationBcv
            formData={formData}
            onFormDataChange={setFormData}
            datasetOptions={datasetOptions}
          />
        );
      case 5:
        return (
          <Step5ValidateRun
            formData={formData}
            datasetOptions={datasetOptions}
            dataHealthSnapshot={dataHealthSnapshot}
            availableDcsByRegion={availableDcsByRegion}
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
              <Button onClick={handleRun} variant="primary" icon={<Play className="w-4 h-4" />}>
                Run Scenario
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
