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
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-900 mb-3">Cost Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Lane Cost:</span>
              <span className="font-medium">${lane.LaneCost.toFixed(2)}</span>
            </div>
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
