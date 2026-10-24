import { useCallback, useEffect, useState } from 'react';

import { api } from '../lib/api';
import { FALLBACK_CONFIG, normalizeRadialConfig, type RadialConfig } from '../lib/config';

/**
 * Configuração ativa do menu. Recarrega quando o painel salva algo e cai no
 * fallback local (útil para rodar o frontend no navegador, sem Tauri).
 */
export function useRadialConfig() {
  const [config, setConfig] = useState<RadialConfig>(() =>
    normalizeRadialConfig(FALLBACK_CONFIG),
  );

  const reload = useCallback(async () => {
    try {
      const nextConfig = await api.loadConfig();
      setConfig(normalizeRadialConfig(nextConfig));
    } catch (error) {
      console.warn('Nao foi possivel carregar a configuracao do Tauri.', error);
      setConfig(normalizeRadialConfig(FALLBACK_CONFIG));
    }
  }, []);

  useEffect(() => {
    // Adia para depois do primeiro paint: evita setState síncrono no efeito.
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [reload]);

  return { config, reload };
}
