import React from 'react';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { Button, StatusBadge } from '@/components/ui';
import { DataHealthSnapshot } from '@/data';

interface HomeAlertsSectionProps {
  alertCounts: {
    overCap: number;
    sla: number;
    missingRates: number;
    assumptions: number;
  };
  dataHealthSnapshot: DataHealthSnapshot;
  onDataHealth: () => void;
}

export const HomeAlertsSection: React.FC<HomeAlertsSectionProps> = ({
  alertCounts,
  dataHealthSnapshot,
  onDataHealth,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Alerts & Data Health</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Over-Capacity</h3>
          </div>
          <p className="text-2xl font-bold text-red-700">{alertCounts.overCap}</p>
          <p className="text-sm text-red-600 mt-1">Runs with capacity issues</p>
        </div>

        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">SLA Breaches</h3>
          </div>
          <p className="text-2xl font-bold text-amber-700">{alertCounts.sla}</p>
          <p className="text-sm text-amber-600 mt-1">Runs with SLA issues</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-900">Missing Rates</h3>
          </div>
          <p className="text-2xl font-bold text-slate-700">{alertCounts.missingRates}</p>
          <p className="text-sm text-slate-600 mt-1">Runs with data gaps</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Assumptions Used</h3>
          </div>
          <p className="text-2xl font-bold text-blue-700">{alertCounts.assumptions}</p>
          <p className="text-sm text-blue-600 mt-1">Runs with assumptions</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900">Data Snapshot</h3>
              <StatusBadge status={dataHealthSnapshot.ForecastFreshness} size="small" />
            </div>
            <p className="text-sm text-slate-600 break-words">
              Version: {dataHealthSnapshot.SnapshotTime} |
              Rates Coverage: {dataHealthSnapshot.RatesCoveragePct}% |
              BCV Dims: {dataHealthSnapshot.BCVDimsAvailability}
            </p>
          </div>
          <Button onClick={onDataHealth} variant="secondary" size="small">
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
};
