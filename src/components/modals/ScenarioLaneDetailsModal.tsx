import React from 'react';
import { Modal } from '../ui';
import { ScenarioRunResultsLane } from '@/data';

interface ScenarioLaneDetailsModalProps {
  lane: ScenarioRunResultsLane | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioLaneDetailsModal: React.FC<ScenarioLaneDetailsModalProps> = ({
  lane,
  isOpen,
  onClose,
}) => {
  if (!lane) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lane Details"
      size="large"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600">3-Zip:</span>
            <span className="ml-2 font-medium">{lane.Dest3Zip}</span>
          </div>
          <div>
            <span className="text-slate-600">State:</span>
            <span className="ml-2 font-medium">{lane.DestState}</span>
          </div>
          <div>
            <span className="text-slate-600">Channel:</span>
            <span className="ml-2 font-medium">{lane.Channel}</span>
          </div>
          <div>
            <span className="text-slate-600">Terms:</span>
            <span className="ml-2 font-medium">{lane.Terms}</span>
          </div>
          <div>
            <span className="text-slate-600">Customer Group:</span>
            <span className="ml-2 font-medium">{lane.CustomerGroup}</span>
          </div>
          <div>
            <span className="text-slate-600">Assigned DC:</span>
            <span className="ml-2 font-medium text-blue-600">{lane.AssignedDC}</span>
          </div>
          {lane.CostingWarehouse ? (
            <div>
              <span className="text-slate-600">Costing Warehouse:</span>
              <span className="ml-2 font-medium">{lane.CostingWarehouse}</span>
            </div>
          ) : null}
          {lane.DefaultShipFrom ? (
            <div>
              <span className="text-slate-600">Default Ship From:</span>
              <span className="ml-2 font-medium">{lane.DefaultShipFrom}</span>
            </div>
          ) : null}
          {lane.OvercapFlag ? (
            <div>
              <span className="text-slate-600">Flag:</span>
              {lane.OvercapFlag === 'Y' ? (
                <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">Overcap</span>
              ) : (
                <span className="ml-2 text-slate-400">-</span>
              )}
            </div>
          ) : null}
          {lane.ScenarioType ? (
            <div>
              <span className="text-slate-600">Scenario Type:</span>
              <span className="ml-2 font-medium">{lane.ScenarioType}</span>
            </div>
          ) : null}
          {lane.PartyName ? (
            <div>
              <span className="text-slate-600">Party:</span>
              <span className="ml-2 font-medium">{lane.PartyName}</span>
            </div>
          ) : null}
          {lane.WorkingCapacity !== undefined ? (
            <div>
              <span className="text-slate-600">Working Capacity:</span>
              <span className="ml-2 font-medium">{lane.WorkingCapacity.toFixed(2)}</span>
            </div>
          ) : null}
          {lane.Threshold !== undefined ? (
            <div>
              <span className="text-slate-600">Threshold:</span>
              <span className="ml-2 font-medium">{lane.Threshold.toFixed(2)}</span>
            </div>
          ) : null}
          {lane.BreachFlag ? (
            <div>
              <span className="text-slate-600">Breach Flag:</span>
              <span className={`ml-2 font-medium ${lane.BreachFlag === 'Y' ? 'text-red-600' : 'text-emerald-600'}`}>
                {lane.BreachFlag}
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-900 mb-3">Cost Breakdown</h4>
          <div className="space-y-2 text-sm">
            {typeof lane.DistributionCost === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">Distribution Cost:</span>
                <span className="font-medium">${lane.DistributionCost.toFixed(2)}</span>
              </div>
            ) : null}
            {typeof lane.InboundSpend === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">Inbound Spend:</span>
                <span className="font-medium">${lane.InboundSpend.toFixed(2)}</span>
              </div>
            ) : null}
            {typeof lane.TlSpend === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">TL Spend:</span>
                <span className="font-medium">${lane.TlSpend.toFixed(2)}</span>
              </div>
            ) : null}
            {typeof lane.ParcelSpend === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">Parcel Spend:</span>
                <span className="font-medium">${lane.ParcelSpend.toFixed(2)}</span>
              </div>
            ) : null}
            {typeof lane.LtlSpend === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">LTL Spend:</span>
                <span className="font-medium">${lane.LtlSpend.toFixed(2)}</span>
              </div>
            ) : null}
            {typeof lane.CostPerUnit === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">Cost per Unit:</span>
                <span className="font-medium">${lane.CostPerUnit.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-slate-600">Lane Cost:</span>
              <span className="font-medium">${lane.LaneCost.toFixed(2)}</span>
            </div>
            {typeof lane.TotalCost === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">Total Cost:</span>
                <span className="font-medium">${lane.TotalCost.toFixed(2)}</span>
              </div>
            ) : null}
            {typeof lane.UtilImpactPct === 'number' ? (
              <div className="flex justify-between">
                <span className="text-slate-600">Util Impact %:</span>
                <span className="font-medium">{lane.UtilImpactPct.toFixed(2)}%</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-slate-600">Delta vs Best:</span>
              <span className={lane.CostDeltaVsBest > 0 ? 'text-amber-600 font-medium' : 'text-green-600 font-medium'}>
                ${lane.CostDeltaVsBest.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Delivery Days:</span>
              <span className="font-medium">{lane.DeliveryDays.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
