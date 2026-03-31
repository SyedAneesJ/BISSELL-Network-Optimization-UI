import React from 'react';
import { Button, Modal } from '../ui';
import { ScenarioOverride, ScenarioRunResultsLane } from '@/data';

export interface ScenarioLaneOption {
  key: string;
  label: string;
  lane: ScenarioRunResultsLane;
}

interface ScenarioOverrideModalProps {
  isOpen: boolean;
  laneOptions: ScenarioLaneOption[];
  overrideLaneKey: string;
  onOverrideLaneKeyChange: (value: string) => void;
  overrideNewDC: string;
  onOverrideNewDCChange: (value: string) => void;
  overrideReason: ScenarioOverride['ReasonCode'];
  onOverrideReasonChange: (value: ScenarioOverride['ReasonCode']) => void;
  overrideComment: string;
  onOverrideCommentChange: (value: string) => void;
  onCancel: () => void;
  onApply: () => void;
  canApply: boolean;
}

export const ScenarioOverrideModal: React.FC<ScenarioOverrideModalProps> = ({
  isOpen,
  laneOptions,
  overrideLaneKey,
  onOverrideLaneKeyChange,
  overrideNewDC,
  onOverrideNewDCChange,
  overrideReason,
  onOverrideReasonChange,
  overrideComment,
  onOverrideCommentChange,
  onCancel,
  onApply,
  canApply,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Apply Override"
      size="large"
      footer={
        <>
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button
            onClick={onApply}
            variant="primary"
            disabled={!canApply}
          >
            Apply Override
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Lane
          </label>
          <select
            value={overrideLaneKey}
            onChange={(e) => onOverrideLaneKeyChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select lane...</option>
            {laneOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            New DC
          </label>
          <input
            type="text"
            value={overrideNewDC}
            onChange={(e) => onOverrideNewDCChange(e.target.value)}
            placeholder="e.g., DC3"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Reason
          </label>
          <select
            value={overrideReason}
            onChange={(e) => onOverrideReasonChange(e.target.value as ScenarioOverride['ReasonCode'])}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Capacity">Capacity</option>
            <option value="SLA">SLA</option>
            <option value="CustomerPreference">Customer Preference</option>
            <option value="OpsLimitation">Ops Limitation</option>
            <option value="FinanceDirective">Finance Directive</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Comment
          </label>
          <textarea
            value={overrideComment}
            onChange={(e) => onOverrideCommentChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Why this override is needed..."
          />
        </div>
      </div>
    </Modal>
  );
};
