import React from 'react';

interface AppPageProps {
  header?: React.ReactNode;
  children: React.ReactNode;
}

export const AppPage: React.FC<AppPageProps> = ({ header, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {header && (
        <div className="bg-white border-b border-slate-200 shadow-sm">
          {header}
        </div>
      )}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </div>
    </div>
  );
};
