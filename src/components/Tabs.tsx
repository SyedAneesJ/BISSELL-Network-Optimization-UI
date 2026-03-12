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
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur rounded-xl px-4">
        <nav className="flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 py-3 px-3 rounded-lg font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }
              `}
            >
              {tab.icon && <span className="w-5 h-5">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-6">
        {activeTabContent}
      </div>
    </div>
  );
};
