import React from 'react';
import { Button, Modal } from '../ui';

interface ScenarioCommentModalProps {
  isOpen: boolean;
  commentText: string;
  onCommentChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saveActive: boolean;
}

export const ScenarioCommentModal: React.FC<ScenarioCommentModalProps> = ({
  isOpen,
  commentText,
  onCommentChange,
  onCancel,
  onSave,
  saveActive,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Add Comment"
      size="medium"
      footer={
        <>
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button
            onClick={onSave}
            variant="primary"
            className={saveActive ? 'bg-amber-500 text-white' : ''}
          >
            {saveActive ? 'Saving...' : 'Save Comment'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Comment
        </label>
        <textarea
          value={commentText}
          onChange={(e) => onCommentChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add a note about this scenario..."
        />
      </div>
    </Modal>
  );
};
