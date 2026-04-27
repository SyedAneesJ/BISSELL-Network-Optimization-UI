import React from 'react';
import { ArrowLeft, ArrowLeftRight, Download } from 'lucide-react';
import { Button, StatusBadge } from '@/components/ui';
import { ComparisonHeader as ComparisonHeaderType, ScenarioRunHeader } from '@/data';

interface ComparisonHeaderProps {
  comparison: ComparisonHeaderType;
  scenarioA?: ScenarioRunHeader;
  scenarioB?: ScenarioRunHeader;
  onBack: () => void;
  onExportComparisonPack: () => void;
  onExportLaneDiff: () => void;
  onExportDCDiff: () => void;
  exportPackActive: boolean;
  exportLaneActive: boolean;
  exportDcActive: boolean;
  onOpenDecision: () => void;
  canAddDecision: boolean;
  onPublishComparison: () => void;
  publishActive: boolean;
}

export const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({
  comparison,
  scenarioA,
  scenarioB,
  onBack,
  onExportComparisonPack,
  onExportLaneDiff,
  onExportDCDiff,
  exportPackActive,
  exportLaneActive,
  exportDcActive,
  onOpenDecision,
  canAddDecision,
  onPublishComparison,
  publishActive,
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
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 break-words">{comparison.ComparisonName}</h1>
            <StatusBadge status={comparison.Status} />
          </div>
          <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-1">
            <span className="font-medium text-blue-600 truncate max-w-[200px]">{scenarioA?.RunName}</span>
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-blue-600 truncate max-w-[200px]">{scenarioB?.RunName}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <div className="text-sm text-slate-600">
          Run A: <span className="font-medium text-slate-900 truncate">{scenarioA?.RunName}</span>
        </div>
        <div className="text-sm text-slate-600">
          Run B: <span className="font-medium text-slate-900 truncate">{scenarioB?.RunName}</span>
        </div>

        <div className="hidden sm:block flex-1" />

        <div className="relative group">
          <Button variant="secondary" size="small" icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${exportPackActive ? 'bg-amber-50 text-amber-800' : ''}`}
              onClick={onExportComparisonPack}
            >
              {exportPackActive ? 'Exporting Comparison Pack...' : 'Export Comparison Pack CSV'}
            </button>
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${exportLaneActive ? 'bg-amber-50 text-amber-800' : ''}`}
              onClick={onExportLaneDiff}
            >
              {exportLaneActive ? 'Exporting Lane Diff...' : 'Export Lane Diff CSV'}
            </button>
            <button
              className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${exportDcActive ? 'bg-amber-50 text-amber-800' : ''}`}
              onClick={onExportDCDiff}
            >
              {exportDcActive ? 'Exporting DC Diff...' : 'Export DC Diff CSV'}
            </button>
          </div>
        </div>

        {canAddDecision && (
          <Button
            onClick={onOpenDecision}
            variant="primary"
            size="small"
          >
            Add Decision
          </Button>
        )}

        {comparison.Status !== 'Published' && (
          <Button
            variant="primary"
            size="small"
            onClick={onPublishComparison}
            className={publishActive ? 'bg-amber-500 text-white' : ''}
          >
            {publishActive ? 'Publishing...' : 'Publish'}
          </Button>
        )}
      </div>
    </div>
  );
};
