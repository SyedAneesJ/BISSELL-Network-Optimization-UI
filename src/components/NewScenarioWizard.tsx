import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle, CheckCircle, Play } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { StatusBadge } from './StatusBadge';
import { dcList, dcCapacityReference, DataHealthSnapshot } from '../data/mockData';

export interface NewScenarioInput {
  region: 'US' | 'Canada';
  scenarioType: string;
  entityScope: 'Core' | 'BCV' | 'Core+BCV';
  channelScope: string[];
  termsScope: 'Collect' | 'Prepaid' | 'Collect+Prepaid';
  runName: string;
  tags: string[];
  notes: string;
  activeDCs: string[];
  suppressedDCs: string[];
  footprintMode: 'Fixed' | 'Unconstrained';
  utilCap: number;
  levelLoad: boolean;
  leadTimeCap: number;
  excludeBeyondCap: boolean;
  costVsService: number;
  fuelSurchargeMode: 'FromRates' | 'Override';
  fuelSurchargeOverride: number | null;
  accessorials: {
    residential: boolean;
    liftgate: boolean;
    insideDelivery: boolean;
  };
  allowRelocationPrepaid: boolean;
  allowRelocationCollect: boolean;
  bcvRuleSet: 'Default' | 'Custom';
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
}

export const NewScenarioWizard: React.FC<NewScenarioWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  dataHealthSnapshot,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    region: 'US',
    scenarioType: 'Baseline',
    entityScope: 'Core+BCV',
    channelScope: ['B2C', 'B2B', 'D2C'],
    termsScope: 'Collect+Prepaid',
    runName: '',
    tags: [] as string[],
    notes: '',
    activeDCs: new Set(dcList),
    suppressedDCs: new Set<string>(),
    footprintMode: 'Fixed',
    utilCap: 80,
    levelLoad: true,
    leadTimeCap: 7,
    excludeBeyondCap: true,
    costVsService: 50,
    fuelSurchargeMode: 'FromRates',
    fuelSurchargeOverride: null as number | null,
    accessorials: {
      residential: true,
      liftgate: true,
      insideDelivery: false,
    },
    allowRelocationPrepaid: true,
    allowRelocationCollect: false,
    bcvRuleSet: 'Default',
    allowManualOverride: true,
  });

  const totalSteps = 5;

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

  const buildInput = (): NewScenarioInput => ({
    region: formData.region as 'US' | 'Canada',
    scenarioType: formData.scenarioType,
    entityScope: formData.entityScope as 'Core' | 'BCV' | 'Core+BCV',
    channelScope: [...formData.channelScope],
    termsScope: formData.termsScope as 'Collect' | 'Prepaid' | 'Collect+Prepaid',
    runName: formData.runName,
    tags: [...formData.tags],
    notes: formData.notes,
    activeDCs: Array.from(formData.activeDCs),
    suppressedDCs: Array.from(formData.suppressedDCs),
    footprintMode: formData.footprintMode as 'Fixed' | 'Unconstrained',
    utilCap: formData.utilCap,
    levelLoad: formData.levelLoad,
    leadTimeCap: formData.leadTimeCap,
    excludeBeyondCap: formData.excludeBeyondCap,
    costVsService: formData.costVsService,
    fuelSurchargeMode: formData.fuelSurchargeMode as 'FromRates' | 'Override',
    fuelSurchargeOverride: formData.fuelSurchargeOverride,
    accessorials: { ...formData.accessorials },
    allowRelocationPrepaid: formData.allowRelocationPrepaid,
    allowRelocationCollect: formData.allowRelocationCollect,
    bcvRuleSet: formData.bcvRuleSet as 'Default' | 'Custom',
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
            <option value="US">US</option>
            <option value="Canada">Canada</option>
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
          >
            <option value="Baseline">Baseline</option>
            <option value="Tactical Fixed Footprint">Tactical Pro Forma (Fixed Footprint)</option>
            <option value="Strategic Unconstrained Footprint">Strategic Pro Forma (Unconstrained Footprint)</option>
            <option value="Consolidation Tactical">Consolidation (Tactical)</option>
            <option value="Consolidation Strategic">Consolidation (Strategic)</option>
            <option value="BCV Ingestion Only">BCV Ingestion Only</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Entity Scope
        </label>
        <div className="flex gap-4">
          {['Core', 'BCV', 'Core+BCV'].map((scope) => (
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
        <div className="flex gap-4">
          {[
            { value: 'B2C', label: 'B2C Home Delivery' },
            { value: 'B2B', label: 'B2B Retailer' },
            { value: 'D2C', label: 'D2C/eCom' },
          ].map((channel) => (
            <label key={channel.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.channelScope.includes(channel.value)}
                onChange={(e) => {
                  const newChannels = e.target.checked
                    ? [...formData.channelScope, channel.value]
                    : formData.channelScope.filter(c => c !== channel.value);
                  setFormData({ ...formData, channelScope: newChannels });
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{channel.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Terms Scope
        </label>
        <select
          value={formData.termsScope}
          onChange={(e) => setFormData({ ...formData, termsScope: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Collect">Collect</option>
          <option value="Prepaid">Prepaid</option>
          <option value="Collect+Prepaid">Collect+Prepaid</option>
        </select>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Tags
        </label>
        <div className="flex gap-2 flex-wrap">
          {['Peak', 'RateChange', 'Quarterly', 'Audit', 'BCV', 'Pilot'].map((tag) => (
            <label
              key={tag}
              className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                formData.tags.includes(tag)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.tags.includes(tag)}
                onChange={(e) => {
                  const newTags = e.target.checked
                    ? [...formData.tags, tag]
                    : formData.tags.filter(t => t !== tag);
                  setFormData({ ...formData, tags: newTags });
                }}
                className="hidden"
              />
              {tag}
            </label>
          ))}
        </div>
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
          {dcList.map((dc) => {
            const isActive = formData.activeDCs.has(dc);
            const dcInfo = dcCapacityReference.find(d => d.DCName === dc);

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
                  Capacity: {dcInfo?.CurrentCapacity.toLocaleString()} sq ft
                </div>
                <div className="text-xs text-slate-500 mt-1">{dcInfo?.Notes}</div>
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
          <div className="flex gap-4">
            {[
              { value: 'Fixed', label: 'Fixed capacity' },
              { value: 'Unconstrained', label: 'Unconstrained footprint' },
            ].map((mode) => (
              <label key={mode.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="footprintMode"
                  value={mode.value}
                  checked={formData.footprintMode === mode.value}
                  onChange={(e) => setFormData({ ...formData, footprintMode: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{mode.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.levelLoad}
              onChange={(e) => setFormData({ ...formData, levelLoad: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Enable Level-Load</span>
            <Tooltip content="Balance volume across DCs to avoid over-concentration" />
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700">
            Utilization Cap: {formData.utilCap}%
          </label>
          <Tooltip content="Maximum DC utilization percentage allowed. Lanes that would exceed this will be assigned to alternate DCs." />
        </div>
        <input
          type="range"
          min="60"
          max="100"
          value={formData.utilCap}
          onChange={(e) => setFormData({ ...formData, utilCap: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>60%</span>
          <span>100%</span>
        </div>
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
          onChange={(e) => setFormData({ ...formData, leadTimeCap: parseInt(e.target.value) })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>No cap</option>
          <option value={3}>≤ 3 days</option>
          <option value={5}>≤ 5 days</option>
          <option value={7}>≤ 7 days (default)</option>
          <option value={10}>≤ 10 days</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.excludeBeyondCap}
            onChange={(e) => setFormData({ ...formData, excludeBeyondCap: e.target.checked })}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Exclude lanes beyond lead time cap</span>
        </label>
        <p className="text-xs text-slate-500 mt-1 ml-6">
          When enabled, lanes exceeding the lead time will be excluded from the solution
        </p>
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
          onChange={(e) => setFormData({ ...formData, costVsService: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Minimize Cost (0)</span>
          <span className="font-medium text-slate-700">{formData.costVsService}</span>
          <span>Prioritize Service (100)</span>
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Advanced: Fuel Surcharge</h4>

        <div className="space-y-3">
          <div className="flex gap-4">
            {[
              { value: 'FromRates', label: 'Use from rate table' },
              { value: 'Override', label: 'Override %' },
            ].map((mode) => (
              <label key={mode.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fuelSurchargeMode"
                  value={mode.value}
                  checked={formData.fuelSurchargeMode === mode.value}
                  onChange={(e) => setFormData({ ...formData, fuelSurchargeMode: e.target.value })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">{mode.label}</span>
              </label>
            ))}
          </div>

          {formData.fuelSurchargeMode === 'Override' && (
            <input
              type="number"
              value={formData.fuelSurchargeOverride || ''}
              onChange={(e) => setFormData({ ...formData, fuelSurchargeOverride: parseFloat(e.target.value) })}
              placeholder="Enter percentage (e.g., 12.5)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">
          Accessorials
        </label>
        <div className="space-y-2">
          {[
            { key: 'residential', label: 'Residential surcharge' },
            { key: 'liftgate', label: 'Liftgate' },
            { key: 'insideDelivery', label: 'Inside delivery' },
          ].map((acc) => (
            <label key={acc.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.accessorials[acc.key as keyof typeof formData.accessorials]}
                onChange={(e) => setFormData({
                  ...formData,
                  accessorials: { ...formData.accessorials, [acc.key]: e.target.checked },
                })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{acc.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>Excluded by SLA preview:</strong> Approximately 12-18 lanes may be excluded based on current settings.
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
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allowRelocationPrepaid}
                onChange={(e) => setFormData({ ...formData, allowRelocationPrepaid: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Prepaid</span>
              <span className="text-xs text-green-600 font-medium">(default ON)</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.allowRelocationCollect}
                onChange={(e) => setFormData({ ...formData, allowRelocationCollect: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">Collect</span>
              <Tooltip content="Collect relocation may require customer notification and contract review" />
            </div>
            {formData.allowRelocationCollect && (
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Review required
              </span>
            )}
          </div>
        </div>
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
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Default">Default (Acceptance Criteria)</option>
          <option value="Custom">Custom mapping</option>
        </select>
      </div>

      {formData.bcvRuleSet === 'Custom' && (
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 mb-2">Custom BCV Mapping Editor</p>
          <div className="text-xs text-slate-500">
            Custom mapping configuration would appear here in the full implementation
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.allowManualOverride}
            onChange={(e) => setFormData({ ...formData, allowManualOverride: e.target.checked })}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">Allow manual lane override after run</span>
        </label>
        <p className="text-xs text-slate-500 mt-1 ml-6">
          Enables post-optimization manual adjustments in the Overrides tab
        </p>
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
          <p><strong>Type:</strong> {formData.scenarioType}</p>
          <p><strong>Entity:</strong> {formData.entityScope}</p>
          <p><strong>Active DCs:</strong> {formData.activeDCs.size} of {dcList.length}</p>
          <p><strong>Lead Time Cap:</strong> {formData.leadTimeCap === 0 ? 'No cap' : `${formData.leadTimeCap} days`}</p>
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
              <Button onClick={handleNext} variant="primary" icon={<ChevronRight className="w-4 h-4" />}>
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
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{stepTitles[step - 1]}</h3>
      </div>

      {renderStepContent()}
    </Modal>
  );
};
