import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CenterDashboard } from './CenterDashboard';
import { RadialCanvas } from './RadialCanvas';
import { buildRadialThemeVars } from './themeVars';
import { useClock } from '../../hooks/useClock';
import { useMenuVisibility } from '../../hooks/useMenuVisibility';
import { useRadialConfig } from '../../hooks/useRadialConfig';
import { useSystemStats } from '../../hooks/useSystemStats';
import { api } from '../../lib/api';
import { isWindows } from '../../lib/tauri';
import {
  MAX_MAIN_SLICES,
  findMenuItem,
  normalizeLayoutConfig,
  type MenuItemConfig,
} from '../../lib/config';
import { clampPercent } from '../../lib/format';
import './RadialMenu.css';

const FEEDBACK_TIMEOUT_MS = 3500;

/**
 * Container do menu: junta configuração, métricas e estado de visibilidade e
 * delega o desenho para `RadialCanvas` / `CenterDashboard`.
 *
 * Relógio e métricas só rodam com o menu aberto; Esc volta do submenu ou fecha,
 * e uma ação que falha mostra um aviso no centro em vez de sumir no console.
 */
export function RadialMenu() {
  const { config, reload } = useRadialConfig();
  const { isOpen, activeParentId, setActiveParentId, hide } = useMenuVisibility(reload);
  const stats = useSystemStats(isOpen);
  const time = useClock(isOpen);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const mainItems = useMemo(() => config.items.slice(0, MAX_MAIN_SLICES), [config.items]);
  const layout = useMemo(() => normalizeLayoutConfig(config.layout), [config.layout]);
  const activeParent = useMemo(
    () => findMenuItem(config.items, activeParentId),
    [config.items, activeParentId],
  );

  const activeParentAngle = useMemo(() => {
    const index = mainItems.findIndex((item) => item.id === activeParentId);
    if (index < 0 || !mainItems.length) return 90;
    return index * (360 / mainItems.length);
  }, [mainItems, activeParentId]);

  // Esc: sai do submenu ou fecha o menu (atalho mais esperado num launcher).
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      if (activeParentId) {
        setActiveParentId(null);
      } else {
        void hide();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, activeParentId, hide, setActiveParentId]);

  // Teclado: o menu já abre com o foco na primeira fatia.
  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => {
      const firstSlice = shellRef.current?.querySelector<SVGGElement>('.slice-group[tabindex="0"]');
      firstSlice?.focus();
    }, 140);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => setFeedback(null), FEEDBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const runAction = useCallback(
    async (item: MenuItemConfig) => {
      if (item.children?.length || item.actionType === 'submenu') {
        setActiveParentId((current) => (current === item.id ? null : item.id));
        return;
      }

      if (item.actionType === 'none') {
        return;
      }

      try {
        await api.runMenuAction(item.id);
      } catch (error) {
        console.error(`Falha ao executar ${item.label}`, error);
        setFeedback(`Não foi possível executar “${item.label}”.`);
        return;
      }

      if (config.preferences.hideAfterAction) {
        await hide();
      }
    },
    [config.preferences.hideAfterAction, hide, setActiveParentId],
  );

  const handleCenterClick = useCallback(async () => {
    if (activeParentId) {
      setActiveParentId(null);
      return;
    }
    await hide();
  }, [activeParentId, hide, setActiveParentId]);

  const themeVars = buildRadialThemeVars(config.theme, layout);

  return (
    <div
      ref={shellRef}
      className={`radial-shell ${isOpen ? 'is-open' : ''}`}
      style={themeVars}
    >
      {!isWindows() ? <div className="glass-blur" aria-hidden="true" /> : null}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <RadialCanvas
        items={mainItems}
        layout={layout}
        hoveredId={hoveredId}
        activeParentId={activeParentId}
        activeParent={activeParent}
        activeParentAngle={activeParentAngle}
        onHover={setHoveredId}
        onSelect={(item) => void runAction(item)}
      />

      <CenterDashboard
        time={time}
        cpuPercent={stats ? clampPercent(stats.cpu) : null}
        showPercentages={config.preferences.showPercentages}
        hasActiveParent={Boolean(activeParentId)}
        onCenterClick={() => void handleCenterClick()}
      />

      {feedback ? (
        <div className="menu-feedback" role="status" aria-live="polite">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
