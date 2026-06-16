import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  targetWidth: number;
  color: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ targetWidth, color, className = "h-full rounded-full transition-all duration-800 ease-out" }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Reset to 0 first to force animation trigger on value change
    setWidth(0);
    const timer = setTimeout(() => setWidth(targetWidth), 50);
    return () => clearTimeout(timer);
  }, [targetWidth]);

  return (
    <div
      className={className}
      style={{ backgroundColor: color, width: `${width}%` }}
    />
  );
};
