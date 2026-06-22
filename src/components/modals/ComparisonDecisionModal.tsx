import React from 'react';
import { Button, Modal, Select } from '../ui';

const verdictOptions = [
  { value: 'Recommend A', label: 'Recommend A' },
  { value: 'Recommend B', label: 'Recommend B' },
  { value: 'No clear winner', label: 'No clear winner' },
  { value: 'Needs more data', label: 'Needs more data' },
];

interface ComparisonDecisionModalProps {
  isOpen: boolean;
  decisionVerdict: string;
  decisionReason: string;
  onDecisionVerdictChange: (value: string) => void;
  onDecisionReasonChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveActive: boolean;
}

export const ComparisonDecisionModal: React.FC<ComparisonDecisionModalProps> = ({
  isOpen,
  decisionVerdict,
  decisionReason,
  onDecisionVerdictChange,
  onDecisionReasonChange,
  onCancel,
  onSave,
  saveActive,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Add Decision"
      size="medium"
      footer={
        <>
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button
            onClick={onSave}
            variant="primary"
          >
            {saveActive ? 'Saving...' : 'Save Decision'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Decision Verdict
          </label>
          <Select
            value={decisionVerdict}
            onChange={onDecisionVerdictChange}
            options={verdictOptions}
            placeholder="Select verdict..."
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Decision Reason
          </label>
          <textarea
            value={decisionReason}
            onChange={(e) => onDecisionReasonChange(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Explain the rationale for this decision..."
          />
        </div>
      </div>
    </Modal>
  );
};
