import { useEffect, useRef } from 'react';

export function usePersistence({ enabled = true, delay = 400, save }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof save !== 'function') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, delay, save]);
}
