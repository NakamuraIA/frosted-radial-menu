import { useEffect, useState } from 'react';

const TICK_INTERVAL_MS = 1000;

/**
 * Relógio exibido no centro do menu. Só tica enquanto o menu está aberto —
 * fechado, o app não tem por que acordar a cada segundo.
 */
export function useClock(enabled = true): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;

    const timer = window.setInterval(() => setNow(new Date()), TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  return now;
}
