import { useCallback, useMemo, useState } from 'react';

import { CenterDashboard } from './CenterDashboard';
import { RadialCanvas } from './RadialCanvas';
import { buildRadialThemeVars } from './themeVars';
import { useClock } from '../../hooks/useClock';
import { useMenuVisibility } from '../../hooks/useMenuVisibility';
import { useRadialConfig } from '../../hooks/useRadialConfig';
import { useSystemStats } from '../../hooks/useSystemStats';
import { api } from '../../lib/api';
import {
  MAX_MAIN_SLICES,
  findMenuItem,
  normalizeLayoutConfig,
  type MenuItemConfig,
} from '../../lib/config';
import { clampPercent } from '../../lib/format';
import './RadialMenu.css';

/**
 * Container do menu: junta configuração, métricas e estado de visibilidade e
 * delega o desenho para `RadialCanvas` / `CenterDashboard`.
 */
export function RadialMenu() {
  const { config, reload } = useRadialConfig();
  const stats = useSystemStats();
  const time = useClock();
  const { isOpen, activeParentId, setActiveParentId, hide } = useMenuVisibility(reload);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

  const runAction = useCallback(
    async (item: MenuItemConfig) => {
      if (item.children?.length || item.actionType === 'submenu') {
        setActiveParentId((current) => (current === item.id ? null : item.id));
        return;
      }

      try {
        await api.runMenuAction(item.id);
      } catch (error) {
        console.error(`Falha ao executar ${item.label}`, error);
      }

      if (config.preferences.hideAfterAction && item.actionType !== 'none') {
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
    <div className={`radial-shell ${isOpen ? 'is-open' : ''}`} style={themeVars}>
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
        cpuPercent={clampPercent(stats.cpu)}
        showPercentages={config.preferences.showPercentages}
        hasActiveParent={Boolean(activeParentId)}
        onCenterClick={() => void handleCenterClick()}
      />
    </div>
  );
}
