import React from 'react';
import { Download, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import { Tooltip } from './Tooltip';
import { DataHealthSnapshot, ScenarioRunResultsLane } from '../data/mockData';
import { createDataHealthPdf, downloadBlob, toCSV } from '../utils/export';
import { useActionFeedback } from '../utils/actionFeedback';

interface DataHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataHealthSnapshot: DataHealthSnapshot;
  missingLanes: ScenarioRunResultsLane[];
}

export const DataHealthModal: React.FC<DataHealthModalProps> = ({
  isOpen,
  onClose,
  dataHealthSnapshot,
  missingLanes,
}) => {
  const { trigger: triggerAction, isActive: isActionActive } = useActionFeedback();
  const handleExportDataHealthPDF = () => {
    const pdfContent = createDataHealthPdf(
      dataHealthSnapshot,
      missingLanes.map((lane) => ({
        Dest3Zip: lane.Dest3Zip,
        DestState: lane.DestState,
        Channel: lane.Channel,
        Terms: lane.Terms,
        CustomerGroup: lane.CustomerGroup,
        AssignedDC: lane.AssignedDC,
        SLABreachFlag: lane.SLABreachFlag,
      }))
    );
    downloadBlob(pdfContent, 'data_health_report.pdf', 'application/pdf');
    triggerAction('data_health_pdf');
  };

  const handleExportMissingLanesCSV = () => {
    const rows = missingLanes.map((lane) => ({
      Dest3Zip: lane.Dest3Zip,
      DestState: lane.DestState,
      Channel: lane.Channel,
      Terms: lane.Terms,
      CustomerGroup: lane.CustomerGroup,
      AssignedDC: lane.AssignedDC,
      SLABreachFlag: lane.SLABreachFlag,
      NotesFlag: lane.NotesFlag,
    }));
    const csv = toCSV(rows);
    downloadBlob(csv, 'missing_lanes.csv', 'text/csv;charset=utf-8;');
    triggerAction('missing_lanes_csv');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Health Snapshot"
      size="large"
      footer={
        <>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportDataHealthPDF}
            className={isActionActive('data_health_pdf') ? 'bg-amber-100 text-amber-800' : ''}
          >
            {isActionActive('data_health_pdf') ? 'Exporting Data Health...' : 'Export Data Health PDF'}
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportMissingLanesCSV}
            className={isActionActive('missing_lanes_csv') ? 'bg-amber-100 text-amber-800' : ''}
            disabled={missingLanes.length === 0}
          >
            {isActionActive('missing_lanes_csv') ? 'Exporting Missing Lanes...' : 'Export Missing Lanes CSV'}
          </Button>
          <Button onClick={onClose} variant="primary">
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Snapshot Information</h3>
          </div>
          <p className="text-sm text-blue-800">
            Last updated: <strong>{new Date(dataHealthSnapshot.SnapshotTime).toLocaleString()}</strong>
          </p>
          <p className="text-sm text-blue-700 mt-1">
            {dataHealthSnapshot.Notes}
          </p>
        </div>

        <div className="space-y-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Forecast Freshness</h3>
                <Tooltip content="Indicates whether demand forecast data is current. Forecasts are updated daily from planning systems." />
              </div>
              <StatusBadge status={dataHealthSnapshot.ForecastFreshness} />
            </div>

            <div className="bg-slate-50 p-3 rounded">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Status</span>
                <span className="font-medium text-slate-900">
                  {dataHealthSnapshot.ForecastFreshness === 'OK' ? 'Current - Updated Daily' :
                   dataHealthSnapshot.ForecastFreshness === 'Warn' ? 'Slightly Stale - Review Recommended' :
                   'Outdated - Update Required'}
                </span>
              </div>
            </div>

            {dataHealthSnapshot.ForecastFreshness === 'OK' && (
              <div className="flex items-center gap-2 mt-3 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                Forecast data is current and ready for scenario runs
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Rates Coverage</h3>
                <Tooltip content="Percentage of lanes with complete carrier rate data. Missing rates will use fallback assumptions or exclude lanes." />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {dataHealthSnapshot.RatesCoveragePct}%
                </span>
                {dataHealthSnapshot.RatesCoveragePct >= 95 ? (
                  <StatusBadge status="OK" size="small" />
                ) : dataHealthSnapshot.RatesCoveragePct >= 85 ? (
                  <StatusBadge status="Warn" size="small" />
                ) : (
                  <StatusBadge status="Error" size="small" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-50 p-3 rounded">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Missing Rates (Lanes)</span>
                  <span className="font-medium text-slate-900">{dataHealthSnapshot.MissingRatesLaneCount}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded">
                <div className="text-xs text-slate-600 mb-1">Coverage Breakdown</div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      dataHealthSnapshot.RatesCoveragePct >= 95 ? 'bg-green-500' :
                      dataHealthSnapshot.RatesCoveragePct >= 85 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${dataHealthSnapshot.RatesCoveragePct}%` }}
                  />
                </div>
              </div>
            </div>

            {dataHealthSnapshot.MissingRatesLaneCount > 0 && (
              <div className="flex items-center gap-2 mt-3 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                Missing rates primarily in new 3-digit zones (rural areas)
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">Capacity Data</h3>
                <Tooltip content="DC capacity and utilization data freshness. Updated from WMS systems." />
              </div>
              <StatusBadge status={dataHealthSnapshot.CapacityFreshness} />
            </div>

            <div className="bg-slate-50 p-3 rounded">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Missing Capacity Data (DCs)</span>
                <span className="font-medium text-slate-900">{dataHealthSnapshot.MissingCapacityDCCount}</span>
              </div>
            </div>

            {dataHealthSnapshot.MissingCapacityDCCount === 0 && (
              <div className="flex items-center gap-2 mt-3 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                All DC capacity data is complete and current
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">BCV Dimensions Availability</h3>
                <Tooltip content="Business Critical Volume package dimensions. When missing, carton average assumptions are used for space calculations." />
              </div>
              <StatusBadge status={dataHealthSnapshot.BCVDimsAvailability === 'OK' ? 'OK' : 'Warn'} />
            </div>

            <div className="bg-slate-50 p-3 rounded">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Data Quality</span>
                <span className="font-medium text-slate-900">
                  {dataHealthSnapshot.BCVDimsAvailability === 'OK' ? 'Complete' :
                   dataHealthSnapshot.BCVDimsAvailability === 'Assumed' ? 'Using Assumptions' :
                   'Missing'}
                </span>
              </div>
            </div>

            {dataHealthSnapshot.BCVDimsAvailability === 'Assumed' && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Assumptions in use:</strong> BCV dimensions calculated using carton average method.
                  Footprint estimates may vary by ±5-10% from actuals. Consider validating space requirements
                  with warehouse operations before committing to strategic decisions.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-100 p-4 rounded-lg">
          <h4 className="font-semibold text-slate-900 mb-2">Data Quality Guidelines</h4>
          <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
            <li>Forecast freshness: Updated daily, acceptable up to 7 days</li>
            <li>Rates coverage: Target &gt;95%, minimum 85% for valid runs</li>
            <li>Capacity data: Should be current within 30 days</li>
            <li>BCV dimensions: Actual data preferred; assumptions acceptable for planning</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};
