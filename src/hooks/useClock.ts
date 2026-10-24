import { useEffect, useState } from 'react';

const TICK_INTERVAL_MS = 1000;

/** Relógio exibido no centro do menu, atualizado a cada segundo. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
