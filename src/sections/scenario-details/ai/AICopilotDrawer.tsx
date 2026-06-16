import React, { useState, useEffect } from 'react';
import { X, Sparkles, Brain, ShieldAlert, Lightbulb, Waves } from 'lucide-react';
import { AIScenarioNarrator } from './AIScenarioNarrator';
import { AISuppressionReadiness } from './AISuppressionReadiness';
import { AISupplyChainInsights } from './AISupplyChainInsights';
import { AIOceanExposure } from './AIOceanExposure';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenarioName?: string;
}

type SubTab = 'narrator' | 'suppression' | 'insights' | 'ocean';

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  activeScenarioName = '',
}) => {
  const [activeTab, setActiveTab] = useState<SubTab>('narrator');
  const [selectedKey, setSelectedKey] = useState<string>('tactical_dallas');

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

  const tabsConfig = [
    { id: 'narrator' as SubTab, label: 'Narrator', icon: <Brain className="w-4 h-4" /> },
    { id: 'suppression' as SubTab, label: 'Suppression', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'insights' as SubTab, label: 'Insights', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'ocean' as SubTab, label: 'Ocean', icon: <Waves className="w-4 h-4" /> },
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
            />
          )}
          {activeTab === 'suppression' && <AISuppressionReadiness selectedKey={selectedKey} />}
          {activeTab === 'insights' && <AISupplyChainInsights selectedKey={selectedKey} />}
          {activeTab === 'ocean' && <AIOceanExposure selectedKey={selectedKey} />}
        </div>
      </div>
    </>
  );
};
