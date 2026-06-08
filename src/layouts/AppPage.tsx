import React, { type ReactNode } from 'react';

interface AppPageProps {
  header?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const AppPage: React.FC<AppPageProps> = ({ header, children, className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {header ? <div className="pb-1">{header}</div> : null}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
};
