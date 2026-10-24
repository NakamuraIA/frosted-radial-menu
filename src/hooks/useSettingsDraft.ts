import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../lib/api';
import {
  FALLBACK_CONFIG,
  normalizeRadialConfig,
  type RadialConfig,
} from '../lib/config';

type DraftState = 'loading' | 'ready' | 'preview';

/**
 * Rascunho do painel: mantém o estado editado separado do último estado salvo,
 * calcula `dirty` e centraliza salvar/descartar.
 *
 * Trocar de página não perde nada porque todas as páginas leem o mesmo draft.
 */
export function useSettingsDraft() {
  const [draft, setDraft] = useState<RadialConfig>(() =>
    normalizeRadialConfig(FALLBACK_CONFIG),
  );
  const [saved, setSaved] = useState<RadialConfig>(() =>
    normalizeRadialConfig(FALLBACK_CONFIG),
  );
  const [state, setState] = useState<DraftState>('loading');
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autostartActive, setAutostartActive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    api
      .loadConfig()
      .then((config) => {
        if (!mounted) return;
        const normalized = normalizeRadialConfig(config);
        setDraft(normalized);
        setSaved(normalized);
        setState('ready');
      })
      .catch((error) => {
        if (!mounted) return;
        console.warn('Usando configuracao local de fallback.', error);
        setState('preview');
      });

    api
      .getAutostartStatus()
      .then((active) => {
        if (mounted) setAutostartActive(active);
      })
      .catch(() => {
        if (mounted) setAutostartActive(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback((updater: (current: RadialConfig) => RadialConfig) => {
    setDraft((current) => normalizeRadialConfig(updater(current)));
    setSaveError(null);
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  const revert = useCallback(() => {
    setDraft(saved);
    setWarnings([]);
    setSaveError(null);
  }, [saved]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);

    try {
      const normalized = normalizeRadialConfig(draft);
      const nextWarnings = await api.saveConfig(normalized);
      setDraft(normalized);
      setSaved(normalized);
      setWarnings(nextWarnings);
      setAutostartActive(await api.getAutostartStatus().catch(() => null));
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft]);

  return {
    draft,
    saved,
    dirty,
    state,
    saving,
    warnings,
    saveError,
    autostartActive,
    update,
    revert,
    save,
  };
}
