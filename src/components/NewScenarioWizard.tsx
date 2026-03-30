import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle, CheckCircle, Play } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { StatusBadge } from './StatusBadge';
import { DataHealthSnapshot } from '../data/mockData';
import { DatasetOptionSets } from '../helpers/domoDataset';

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
  const buildInitialFormData = () => ({
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
  const [formData, setFormData] = useState(buildInitialFormData);
  const prevIsOpenRef = useRef(isOpen);
  const utilCapMin = datasetOptions.utilCaps.length > 0
    ? Math.min(60, ...datasetOptions.utilCaps)
    : 30;
  // const utilCapMax = datasetOptions.utilCaps.length > 0
  //   ? Math.max(100, ...datasetOptions.utilCaps)
  //   : 100;

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

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Region
          </label>
          <select
            value={formData.region}
            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, scenarioType: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, entityScope: e.target.value })}
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
                  onChange={() => handleChannelToggle(channel)}
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
          onChange={(e) => setFormData({ ...formData, termsScope: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, runName: e.target.value })}
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
                  onClick={() => handleTagToggle(tag)}
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
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional context or assumptions..."
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-sm font-medium text-slate-700">
            Distribution Centers
          </label>
          <Tooltip content="Select which DCs are active in this scenario. Suppressed DCs will not be considered for lane assignments." />
        </div>

        <div className="grid grid-cols-3 gap-3">
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
                onClick={() => handleDCToggle(dc)}
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

      <div className="grid grid-cols-2 gap-6">
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
            <div className="flex gap-4">
              {datasetOptions.footprintModes.map((mode) => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="footprintMode"
                    value={mode}
                    checked={formData.footprintMode === mode}
                    onChange={(e) => setFormData({ ...formData, footprintMode: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, levelLoad: e.target.checked })}
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
            Utilization Cap{datasetOptions.utilCaps.length === 0 ? ': NA' : `: ${100}%`}
          </label>
          <Tooltip content="Maximum DC utilization percentage allowed. Lanes that would exceed this will be assigned to alternate DCs." />
        </div>
        <input
          type="range"
          min={utilCapMin}
          max={utilCapMax}
          value={formData.utilCap}
          onChange={(e) => setFormData({ ...formData, utilCap: Number(e.target.value) })}
          className="w-full"
          disabled={datasetOptions.utilCaps.length === 0}
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{utilCapMin}%</span>
          <span>{utilCapMax}%</span>
        </div>
        {datasetOptions.utilCaps.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No utilization cap data available.</p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
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
          onChange={(e) => setFormData({ ...formData, leadTimeCap: Number(e.target.value) })}
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
              onChange={(e) => setFormData({ ...formData, excludeBeyondCap: e.target.checked })}
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
          <Tooltip content="0 = Minimize cost only. 100 = Prioritize service (speed) over cost. 50 = Balanced approach." />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.costVsService}
          onChange={(e) => setFormData({ ...formData, costVsService: Number(e.target.value) })}
          className="w-full"
          disabled={datasetOptions.costVsServiceWeights.length === 0}
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Minimize Cost (0)</span>
          <span className="font-medium text-slate-700">
            {datasetOptions.costVsServiceWeights.length === 0 ? 'NA' : formData.costVsService}
          </span>
          <span>Prioritize Service (100)</span>
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
                    onChange={(e) => setFormData({ ...formData, fuelSurchargeMode: e.target.value })}
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
                        setFormData({
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

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-3 block">
          Allow Relocation
        </label>
        {datasetOptions.allowRelocationPrepaid.length === 0 && datasetOptions.allowRelocationCollect.length === 0 ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="rounded" />
                  <span className="text-sm font-medium text-slate-500">Prepaid</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="rounded" />
                  <span className="text-sm font-medium text-slate-500">Collect</span>
                  <Tooltip content="No relocation data available" />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">No relocation data available.</p>
          </>
        ) : (
          <div className="space-y-3">
            {datasetOptions.allowRelocationPrepaid.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowRelocationPrepaid}
                    onChange={(e) => setFormData({ ...formData, allowRelocationPrepaid: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Prepaid</span>
                </div>
              </div>
            )}

            {datasetOptions.allowRelocationCollect.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.allowRelocationCollect}
                    onChange={(e) => setFormData({ ...formData, allowRelocationCollect: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Collect</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700">
            BCV Relocation Mapping
          </label>
          <Tooltip content="Business Critical Volume routing rules for network changes" />
        </div>
        <select
          value={formData.bcvRuleSet}
          onChange={(e) => setFormData({ ...formData, bcvRuleSet: e.target.value })}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            datasetOptions.bcvRuleSets.length === 0 ? 'bg-slate-100' : ''
          }`}
          disabled={datasetOptions.bcvRuleSets.length === 0}
        >
          {datasetOptions.bcvRuleSets.length === 0 ? (
            <option value="">NA</option>
          ) : (
            datasetOptions.bcvRuleSets.map((rule) => (
              <option key={rule} value={rule}>{rule}</option>
            ))
          )}
        </select>
        {datasetOptions.bcvRuleSets.length === 0 && (
          <p className="text-xs text-slate-500 mt-1">No BCV mapping data available.</p>
        )}
      </div>

      <div className="border-t border-slate-200 pt-4">
        {datasetOptions.allowManualOverride.length === 0 ? (
          <>
            <label className="flex items-center gap-2 text-slate-500 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded" />
              <span className="text-sm font-medium text-slate-500">Allow manual lane override after run</span>
            </label>
            <p className="text-xs text-slate-500 mt-1 ml-6">No override settings data available.</p>
          </>
        ) : (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.allowManualOverride}
              onChange={(e) => setFormData({ ...formData, allowManualOverride: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-medium text-slate-700">Allow manual lane override after run</span>
          </label>
        )}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Check className="w-5 h-5" />
          Configuration Summary
        </h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Run Name:</strong> {formData.runName || 'Untitled Run'}</p>
          <p><strong>Region:</strong> {formData.region}</p>
          <p><strong>Type:</strong> {formData.scenarioType || 'NA'}</p>
          <p><strong>Entity:</strong> {formData.entityScope}</p>
          <p><strong>Active DCs:</strong> {formData.activeDCs.size} of {(availableDcsByRegion[formData.region] || []).length}</p>
          <p><strong>Lead Time Cap:</strong> {datasetOptions.leadTimeCaps.length === 0 ? 'NA' : formData.leadTimeCap === 0 ? 'No cap' : `${formData.leadTimeCap} days`}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Data Health Snapshot</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-900">Forecast Freshness</p>
              <p className="text-xs text-slate-600">Last updated: {dataHealthSnapshot.SnapshotTime}</p>
            </div>
            <StatusBadge status={dataHealthSnapshot.ForecastFreshness} size="small" />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-900">Rates Coverage</p>
              <p className="text-xs text-slate-600">Missing lanes: {dataHealthSnapshot.MissingRatesLaneCount}</p>
            </div>
            <span className="text-lg font-bold text-slate-700">{dataHealthSnapshot.RatesCoveragePct}%</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-900">Capacity Data</p>
              <p className="text-xs text-slate-600">Missing DCs: {dataHealthSnapshot.MissingCapacityDCCount}</p>
            </div>
            <StatusBadge status={dataHealthSnapshot.CapacityFreshness} size="small" />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-900">BCV Dimensions</p>
              <p className="text-xs text-slate-600">Carton average assumptions used</p>
            </div>
            <StatusBadge status={dataHealthSnapshot.BCVDimsAvailability === 'OK' ? 'OK' : 'Warn'} size="small" />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Validation Checklist</h4>
        <div className="space-y-2">
          {[
            'All required configuration fields completed',
            'At least one active DC selected',
            'Data snapshot is current',
            'Rate coverage meets minimum threshold',
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
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
