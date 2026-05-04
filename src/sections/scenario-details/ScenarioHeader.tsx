import React from 'react';
import { Archive, ArrowLeft, CheckCircle, Copy, Download, MessageSquare } from 'lucide-react';
import { Button, StatusBadge, Tooltip } from '@/components/ui';
import { ScenarioRunHeader } from '@/data';

interface ScenarioHeaderProps {
  scenario: ScenarioRunHeader;
  scenarioId: string;
  laneResultsCount: number;
  onBack: () => void;
  onDuplicateScenario: (scenarioId: string) => void;
  onPublishScenario: (scenarioId: string) => void;
  onApproveScenario: (scenarioId: string) => void;
  onArchiveScenario: (scenarioId: string) => void;
  onOpenComment: () => void;
  onExportDecisionPack: () => void;
  onExportRoutingCSV: () => void;
  onExportLaneCSV: () => void;
  onExportExceptionsCSV: () => void;
  exportDecisionActive: boolean;
  exportRoutingActive: boolean;
  exportLaneActive: boolean;
  exportExceptionsActive: boolean;
  duplicateActive: boolean;
  publishActive: boolean;
  approveActive: boolean;
  commentOpenActive: boolean;
  archiveActive: boolean;
}

export const ScenarioHeader: React.FC<ScenarioHeaderProps> = ({
  scenario,
  scenarioId,
  laneResultsCount,
  onBack,
  onDuplicateScenario,
  onPublishScenario,
  onApproveScenario,
  onArchiveScenario,
  onOpenComment,
  onExportDecisionPack,
  onExportRoutingCSV,
  onExportLaneCSV,
  onExportExceptionsCSV,
  exportDecisionActive,
  exportRoutingActive,
  exportLaneActive,
  exportExceptionsActive,
  duplicateActive,
  publishActive,
  approveActive,
  commentOpenActive,
  archiveActive,
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
            {scenario.AssumptionsSummary && (
              <Tooltip content={scenario.AssumptionsSummary}>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  Assumptions
                </span>
              </Tooltip>
            )}
          </div>
          <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>{scenario.ScenarioType} | {scenario.Region} | {scenario.EntityScope}</span>
            <span>
              Mapped dataflow: {scenario.DataflowID || 'NA'}
            </span>
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
        <div className="relative group">
          <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${exportDecisionActive ? 'bg-amber-50 text-amber-800' : ''}`}
              onClick={onExportDecisionPack}
            >
              {exportDecisionActive ? 'Exporting Decision Pack...' : 'Export Decision Pack CSV'}
            </button>
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${laneResultsCount === 0 ? 'text-slate-400 cursor-not-allowed' : ''} ${exportRoutingActive ? 'bg-amber-50 text-amber-800' : ''}`}
              disabled={laneResultsCount === 0}
              onClick={onExportRoutingCSV}
            >
              {exportRoutingActive ? 'Exporting Routing CSV...' : 'Export Routing Assignment CSV'}
            </button>
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${laneResultsCount === 0 ? 'text-slate-400 cursor-not-allowed' : ''} ${exportLaneActive ? 'bg-amber-50 text-amber-800' : ''}`}
              disabled={laneResultsCount === 0}
              onClick={onExportLaneCSV}
            >
              {exportLaneActive ? 'Exporting Lane Table...' : 'Export Lane Table CSV'}
            </button>
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${laneResultsCount === 0 ? 'text-slate-400 cursor-not-allowed' : ''} ${exportExceptionsActive ? 'bg-amber-50 text-amber-800' : ''}`}
              disabled={laneResultsCount === 0}
              onClick={onExportExceptionsCSV}
            >
              {exportExceptionsActive ? 'Exporting Exceptions...' : 'Export Exceptions CSV'}
            </button>
          </div>
        </div>

        <Button
          variant="secondary"
          size="small"
          icon={<Copy className="w-4 h-4" />}
          onClick={() => undefined}
          disabled
          title="Duplicate is temporarily disabled"
          className="opacity-50 cursor-not-allowed"
        >
          Duplicate
        </Button>

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

        <Button
          variant="ghost"
          size="small"
          icon={<Archive className="w-4 h-4" />}
          onClick={() => onArchiveScenario(scenarioId)}
          className={archiveActive ? 'bg-amber-100 text-amber-800' : ''}
        >
          {archiveActive ? 'Archived' : 'Archive'}
        </Button>
      </div>
    </div>
  );
};
