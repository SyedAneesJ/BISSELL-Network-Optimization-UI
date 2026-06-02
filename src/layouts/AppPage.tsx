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
      {children}
    </div>
  );
};
