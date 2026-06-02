import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab, onChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className="w-full">
      <div className="surface-panel px-2 sm:px-4 py-2">
        <nav className="flex flex-nowrap gap-3 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.98]
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }
              `}
            >
              {tab.icon && <span className="w-4 h-4 sm:w-5 sm:h-5">{tab.icon}</span>}
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="py-6 fade-in">
        {activeTabContent}
      </div>
    </div>
  );
};
