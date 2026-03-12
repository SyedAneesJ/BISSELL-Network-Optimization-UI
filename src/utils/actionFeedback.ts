import { useEffect, useRef, useState } from 'react';

export const useActionFeedback = (durationMs = 2500) => {
  const [active, setActive] = useState<Record<string, boolean>>({});
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((id) => window.clearTimeout(id));
      timersRef.current = {};
    };
  }, []);

  const trigger = (key: string) => {
    setActive((prev) => ({ ...prev, [key]: true }));
    if (timersRef.current[key]) {
      window.clearTimeout(timersRef.current[key]);
    }
    timersRef.current[key] = window.setTimeout(() => {
      setActive((prev) => ({ ...prev, [key]: false }));
      delete timersRef.current[key];
    }, durationMs);
  };

  const isActive = (key: string) => !!active[key];

  return { trigger, isActive };
};
