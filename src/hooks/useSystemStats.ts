import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';
import type { SystemStats } from '../lib/config';

const POLL_INTERVAL_MS = 1800;

/**
 * Percentuais exibidos no centro. Sem backend (preview no navegador) simula uma
 * variação suave em vez de deixar o centro vazio.
 */
export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats>({ cpu: 64, ram: 42, gpu: null });

  const refresh = useCallback(async () => {
    try {
      setStats(await api.getSystemStats());
    } catch {
      setStats((current) => ({
        cpu: current.cpu >= 92 ? 28 : current.cpu + 7,
        ram: current.ram >= 84 ? 38 : current.ram + 3,
        gpu: current.gpu,
      }));
    }
  }, []);

  useEffect(() => {
    // Primeira leitura depois do paint; o intervalo cuida das seguintes.
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
  }, [refresh]);

  return stats;
}
