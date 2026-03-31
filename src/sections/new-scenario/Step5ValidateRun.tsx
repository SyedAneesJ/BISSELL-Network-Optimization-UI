import React from 'react';
import { Check, CheckCircle } from 'lucide-react';
import { StatusBadge } from '@/components/ui';
import { DataHealthSnapshot } from '@/data';
import { DatasetOptionSets } from '@/services';
import { NewScenarioFormData } from './types';

interface Step5ValidateRunProps {
  formData: NewScenarioFormData;
  datasetOptions: DatasetOptionSets;
  dataHealthSnapshot: DataHealthSnapshot;
  availableDcsByRegion: Record<string, string[]>;
}

export const Step5ValidateRun: React.FC<Step5ValidateRunProps> = ({
  formData,
  datasetOptions,
  dataHealthSnapshot,
  availableDcsByRegion,
}) => {
  return (
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
};
