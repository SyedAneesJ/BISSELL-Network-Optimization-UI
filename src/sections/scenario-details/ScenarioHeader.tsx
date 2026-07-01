import { ArrowLeft, CheckCircle, MessageSquare, Sparkles } from 'lucide-react';
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
  onOpenCopilot: () => void;
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
  onOpenCopilot,
}) => {
  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-0">
      <div className="surface-panel mb-0 px-5 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="flex items-center gap-3">
              <img src="/Bissell.png" alt="Bissell Logo" className="h-8 sm:h-10 object-contain" />
              <div className="hidden sm:block h-6 w-px bg-slate-300" />
              <button
                onClick={onBack}
                className="flex flex-shrink-0 items-center gap-2 text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
              </button>
            </div>
            <div className="hidden sm:block h-6 w-px bg-slate-300 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-lg font-semibold text-slate-900 sm:text-xl">{scenario.RunName}</h1>
                <StatusBadge status={scenario.Status} />
                {scenario.AssumptionsSummary !== 'NA' && (
                  <Tooltip content={scenario.AssumptionsSummary}>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      Assumptions
                    </span>
                  </Tooltip>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
                <span>{scenario.ScenarioType} | {scenario.Region} | {scenario.EntityScope}</span>
                {scenario.ApprovedBy && (
                  <span>Approved by {scenario.ApprovedBy}</span>
                )}
                {(scenario.LastRunBy || scenario.CreatedBy) && (
                  <span>
                    Run by {scenario.LastRunBy && scenario.LastRunBy !== 'NA' ? scenario.LastRunBy : scenario.CreatedBy}
                    {scenario.LastRunAt ? ` on ${new Date(scenario.LastRunAt).toLocaleString()}` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* <div className="flex flex-shrink-0 items-center sm:self-center">
              <Button
                variant="primary"
                size="small"
                icon={<Sparkles className="w-4 h-4 animate-pulse text-blue-200" />}
                onClick={onOpenCopilot}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/10 border-none whitespace-nowrap"
              >
                AI Copilot
              </Button>
            </div> */}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/70 pt-4">
            {/* {scenario.Status !== 'Published' && (
              <Button
                variant="primary"
                size="small"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => onPublishScenario(scenarioId)}
                className={publishActive ? 'bg-amber-500 text-white' : ''}
              >
                {publishActive ? 'Publishing...' : 'Publish'}
              </Button>
            )} */}

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
              {commentOpenActive 
                ? 'Adding...' 
                : (scenario.LatestComment && scenario.LatestComment !== 'NA' ? 'Update Comment' : 'Add Comment')}
            </Button>

            {scenario.LatestComment && scenario.LatestComment !== 'NA' && (
              <div className="flex items-center gap-2 bg-slate-100/60 border border-slate-200/70 rounded-full px-3 py-1 text-xs text-slate-600 max-w-[60%] sm:max-w-[70%] shadow-sm" title={scenario.LatestComment}>
                <span className="font-medium text-slate-500 uppercase tracking-wider text-[10px] bg-slate-200/60 rounded px-1.5 py-0.5 flex-shrink-0">Note</span>
                <span className="truncate text-slate-700 font-medium">{scenario.LatestComment}</span>
              </div>
            )}

            <span className="ml-auto text-xs font-medium tracking-wide text-slate-500">
              {laneResultsCount} lane rows
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
