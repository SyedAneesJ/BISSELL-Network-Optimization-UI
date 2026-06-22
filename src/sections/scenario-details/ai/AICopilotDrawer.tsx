import React, { useState, useEffect } from 'react';
import { X, Sparkles, Brain, ShieldAlert, Lightbulb, Waves } from 'lucide-react';
import { AIScenarioNarrator } from './AIScenarioNarrator';
import { AISuppressionReadiness } from './AISuppressionReadiness';
import { AISupplyChainInsights } from './AISupplyChainInsights';
import { AIOceanExposure } from './AIOceanExposure';
import { startWorkflow } from '@/services/domo/domoWorkflow';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenarioName?: string;
  defaultInsightResult?: any;
  isDefaultInsightLoading?: boolean;
}

export interface WorkflowInsight {
  id: string;
  dc: string;
  title: string;
  category: string;
  body: string;
  stats: { value: string | React.ReactNode; color: string; label: string }[];
  action: string;
  actionType: 'blue' | 'amber' | 'red' | 'green';
}

const MOCK_DC_INSIGHTS: Record<string, Omit<WorkflowInsight, 'id' | 'dc'>> = {
  Dallas: {
    title: "Dallas suppression shifts 1,492 lanes to R Virginia — 92% capacity warning",
    category: "AI Workflow Output · DC Suppression Risk",
    stats: [
      { value: "+$5.1M", color: "#EF4444", label: "Cost Penalty" },
      { value: "1,492", color: "#F59E0B", label: "Displaced Lanes" },
      { value: "92%", color: "#EF4444", label: "R Virginia Util" },
    ],
    body: "Suppressing Dallas redirects all south-central volume to R Virginia. This pushes R Virginia's utilization from 66.8% to 92.4%, risking severe inbound congestion. Backup lanes do not have sufficient pre-negotiated rates.",
    action: "<strong>Action:</strong> Avoid suppressing Dallas unless alternative capacity in Elwood can be unlocked.",
    actionType: "red",
  },
  Elwood: {
    title: "Elwood suppression shifts 2,840 lanes to R Virginia — SLA Alert",
    category: "AI Workflow Output · DC Suppression Risk",
    stats: [
      { value: "+$7.2M", color: "#EF4444", label: "Cost Penalty" },
      { value: "2,840", color: "#F59E0B", label: "Displaced Lanes" },
      { value: "88%", color: "#EF4444", label: "SLA Breach Rate" },
    ],
    body: "Suppressing Elwood eliminates the primary midwest distribution hub. Midwest shipments rerouted to R Virginia see transit time increase by 2.4 days on average, triggering substantial SLA breaches.",
    action: "<strong>Action:</strong> Re-negotiate regional LTL carrier rates in Chicago area before suppressing Elwood.",
    actionType: "amber",
  },
  'Los Angeles': {
    title: "Los Angeles suppression disrupts West Coast distribution — High Cost Penalty",
    category: "AI Workflow Output · DC Suppression Risk",
    stats: [
      { value: "+$12.5M", color: "#EF4444", label: "Cost Penalty" },
      { value: "3,150", color: "#F59E0B", label: "Displaced Lanes" },
      { value: "98%", color: "#EF4444", label: "Transit Delay %" },
    ],
    body: "West Coast import volume must be cross-docked or routed all-rail to R Virginia. This creates an immediate $12.5M transportation penalty and adds 5+ days to all West Coast customer delivery lanes.",
    action: "<strong>Action:</strong> LA is critical for ocean container transloads. Do not suppress without a dedicated West Coast port-bypass program.",
    actionType: "red",
  },
  'R Virginia': {
    title: "R Virginia suppression shifts major eastern volume — Capacity Failure",
    category: "AI Workflow Output · DC Suppression Risk",
    stats: [
      { value: "+$18.4M", color: "#EF4444", label: "Cost Penalty" },
      { value: "4,900", color: "#F59E0B", label: "Displaced Lanes" },
      { value: "100%+", color: "#EF4444", label: "Elwood/Dallas Util" },
    ],
    body: "R Virginia is the cornerstone of eastern U.S. distribution. Suppressing it causes immediate capacity failures at Elwood and Dallas, which are unable to absorb the 4,900 displaced lanes.",
    action: "<strong>Action:</strong> R Virginia must remain active in all tactical and strategic scenarios.",
    actionType: "red",
  },
};

type SubTab = 'narrator' | 'suppression' | 'insights' | 'ocean';

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeScenarioName = '',
  defaultInsightResult,
  isDefaultInsightLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<SubTab>('narrator');
  const [selectedKey, setSelectedKey] = useState<string>('tactical_dallas');
  const [workflowInsights, setWorkflowInsights] = useState<WorkflowInsight[]>([]);
  const [runningWorkflows, setRunningWorkflows] = useState<Record<string, boolean>>({});

  // Try to auto-map target scenario name when activeScenarioName changes
  useEffect(() => {
    const lowerName = activeScenarioName.toLowerCase();
    if (lowerName.includes('baseline')) {
      setSelectedKey('baseline');
    } else if (lowerName.includes('dallas') || lowerName.includes('tactical')) {
      setSelectedKey('tactical_dallas');
    } else if (lowerName.includes('strategic')) {
      setSelectedKey('strategic');
    } else if (lowerName.includes('consolidation')) {
      setSelectedKey('consolidation');
    }
  }, [activeScenarioName]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      
      // Reset state back to defaults after closing animation completes (300ms)
      const timer = setTimeout(() => {
        setActiveTab('narrator');
        setSelectedKey('tactical_dallas');
      }, 300);
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const triggerSuppressionWorkflow = async (dcName: string) => {
    // Prevent double running
    if (runningWorkflows[dcName]) return;

    setRunningWorkflows((prev) => ({ ...prev, [dcName]: true }));

    try {
      let response: any = null;
      try {
        response = await startWorkflow('Bissell_AI_insights', { suppressedDC: dcName });
        console.log(`[Bissell_AI_insights] Response for ${dcName}:`, response);
      } catch (err) {
        console.warn('Workflow start failed or not in Domo environment. Falling back to local generation.', err);
      }

      // Simulated brief delay for realistic user feedback
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const fallback = MOCK_DC_INSIGHTS[dcName] || MOCK_DC_INSIGHTS['Dallas'];
      const newInsight: WorkflowInsight = {
        id: `workflow-${dcName}-${Date.now()}`,
        dc: dcName,
        title: response?.title || fallback.title,
        category: response?.category || fallback.category,
        stats: response?.stats || fallback.stats,
        body: response?.body || fallback.body,
        action: response?.action || fallback.action,
        actionType: response?.actionType || fallback.actionType,
      };

      // Add to start of workflow insights array
      setWorkflowInsights((prev) => [newInsight, ...prev.filter((ins) => ins.dc !== dcName)]);
      
      // Auto-transition to Insights tab to display output
      setActiveTab('insights');
    } catch (e) {
      console.error('Failed to run suppression workflow:', e);
    } finally {
      setRunningWorkflows((prev) => ({ ...prev, [dcName]: false }));
    }
  };

  const tabsConfig = [
    { id: 'narrator' as SubTab, label: 'Narrator', icon: <Brain className="w-4 h-4" /> },
    { id: 'suppression' as SubTab, label: 'Suppression', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'insights' as SubTab, label: 'Insights', icon: <Lightbulb className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 flex h-full w-full sm:w-[50vw] flex-col border-l border-slate-200/80 bg-slate-50/95 backdrop-blur-md shadow-2xl transition-transform duration-300 ease-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">AI Copilot</h3>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Interactive Logistics Assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation inside Drawer */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white shadow-sm flex gap-1.5 overflow-x-auto select-none">
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          {activeTab === 'narrator' && (
            <AIScenarioNarrator
              activeScenarioName={activeScenarioName}
              selectedKey={selectedKey}
              onSelectedKeyChange={setSelectedKey}
              onGoToSuppression={() => setActiveTab('suppression')}
              defaultInsightResult={defaultInsightResult}
              isDefaultInsightLoading={isDefaultInsightLoading}
            />
          )}
          {activeTab === 'suppression' && (
            <AISuppressionReadiness
              selectedKey={selectedKey}
              onTriggerWorkflow={triggerSuppressionWorkflow}
              runningWorkflows={runningWorkflows}
            />
          )}
          {activeTab === 'insights' && (
            <AISupplyChainInsights
              selectedKey={selectedKey}
              workflowInsights={workflowInsights}
              defaultInsightResult={defaultInsightResult}
            />
          )}
        </div>
      </div>
    </>
  );
};
