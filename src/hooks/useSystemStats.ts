import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { SystemStats } from '../lib/config';
import { isTauri } from '../lib/tauri';

const POLL_INTERVAL_MS = 1800;

function simulatedNext(current: SystemStats | null): SystemStats {
  const cpu = current?.cpu ?? 64;
  const ram = current?.ram ?? 42;

  return {
    cpu: cpu >= 92 ? 28 : cpu + 7,
    ram: ram >= 84 ? 38 : ram + 3,
    gpu: current?.gpu ?? null,
  };
}

/**
 * Percentuais exibidos no centro.
 *
 * - Fora do Tauri (preview no navegador) simula uma variação suave.
 * - Dentro do Tauri, se o backend falhar, devolve `null` para a UI mostrar "—"
 *   em vez de inventar números.
 * - Fechado, não faz polling.
 */
export function useSystemStats(enabled = true): SystemStats | null {
  const [stats, setStats] = useState<SystemStats | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStats(await api.getSystemStats());
    } catch {
      setStats((current) => (isTauri() ? null : simulatedNext(current)));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const kickoff = window.setTimeout(() => {
      void refresh();
    }, 0);
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [enabled, refresh]);

  return stats;
}
