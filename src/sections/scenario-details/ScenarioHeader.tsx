import React from 'react';
import { ArrowLeft, CheckCircle, MessageSquare } from 'lucide-react';
import { Button, StatusBadge, Tooltip } from '@/components/ui';
import { ScenarioRunHeader } from '@/data';

interface ScenarioHeaderProps {
  scenario: ScenarioRunHeader;
  scenarioId: string;
  laneResultsCount: number;
  onBack: () => void;
  onPublishScenario: (scenarioId: string) => void;
  onApproveScenario: (scenarioId: string) => void;
  onOpenComment: () => void;
  publishActive: boolean;
  approveActive: boolean;
  commentOpenActive: boolean;
}

export const ScenarioHeader: React.FC<ScenarioHeaderProps> = ({
  scenario,
  scenarioId,
  laneResultsCount,
  onBack,
  onPublishScenario,
  onApproveScenario,
  onOpenComment,
  publishActive,
  approveActive,
  commentOpenActive,
}) => {
  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </button>
        <div className="hidden sm:block h-6 w-px bg-slate-300 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 break-words">{scenario.RunName}</h1>
            <StatusBadge status={scenario.Status} />
            {scenario.AssumptionsSummary !== 'NA' && (
              <Tooltip content={scenario.AssumptionsSummary}>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Assumptions
                </span>
              </Tooltip>
            )}
          </div>
          <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>{scenario.ScenarioType} | {scenario.Region} | {scenario.EntityScope}</span>
            {scenario.ApprovedBy && (
              <span>Approved by {scenario.ApprovedBy}</span>
            )}
            {scenario.LastRunBy && (
              <span>
                Last run by {scenario.LastRunBy}
                {scenario.LastRunAt ? ` on ${new Date(scenario.LastRunAt).toLocaleString()}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {scenario.Status !== 'Published' && (
          <Button
            variant="primary"
            size="small"
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={() => onPublishScenario(scenarioId)}
            className={publishActive ? 'bg-amber-500 text-white' : ''}
          >
            {publishActive ? 'Publishing...' : 'Publish'}
          </Button>
        )}

        {scenario.Status === 'Completed' && !scenario.ApprovedBy && (
          <Button
            variant="primary"
            size="small"
            icon={<CheckCircle className="w-4 h-4" />}
            onClick={() => onApproveScenario(scenarioId)}
            className={approveActive ? 'bg-amber-500 text-white' : ''}
          >
            {approveActive ? 'Approving...' : 'Approve'}
          </Button>
        )}

        <Button
          variant="secondary"
          size="small"
          icon={<MessageSquare className="w-4 h-4" />}
          onClick={onOpenComment}
          className={commentOpenActive ? 'bg-amber-100 text-amber-800' : ''}
        >
          {commentOpenActive ? 'Adding...' : 'Add Comment'}
        </Button>

        <span className="ml-auto text-xs text-slate-500">
          {laneResultsCount} lane rows
        </span>
      </div>
    </div>
  );
};
