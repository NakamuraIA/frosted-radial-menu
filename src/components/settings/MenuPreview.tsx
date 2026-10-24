import type { RadialConfig } from '../../lib/config';
import { normalizeLayoutConfig } from '../../lib/config';
import { clampPercent } from '../../lib/format';
import { useClock } from '../../hooks/useClock';
import { useSystemStats } from '../../hooks/useSystemStats';
import { CenterDashboard } from '../radial/CenterDashboard';
import { RadialCanvas } from '../radial/RadialCanvas';
import { buildRadialThemeVars } from '../radial/themeVars';
import '../radial/RadialMenu.css';

const MAX_PREVIEW_ITEMS = 10;

/**
 * Prévia do menu usando o rascunho real: geometria, cores e tipografia reagem
 * ao que está sendo editado. Métricas e relógio vêm do sistema, não de mock.
 */
export function MenuPreview({ config }: { config: RadialConfig }) {
  const time = useClock();
  const stats = useSystemStats();
  const layout = normalizeLayoutConfig(config.layout);
  const items = config.items.slice(0, MAX_PREVIEW_ITEMS);

  return (
    <div className="preview-stage" aria-hidden="true">
      <div className="radial-shell is-open" style={buildRadialThemeVars(config.theme, layout)}>
        <RadialCanvas
          items={items}
          layout={layout}
          hoveredId={null}
          activeParentId={null}
          activeParent={null}
          activeParentAngle={90}
          onHover={() => {}}
          onSelect={() => {}}
        />
        <CenterDashboard
          time={time}
          cpuPercent={clampPercent(stats.cpu)}
          showPercentages={config.preferences.showPercentages}
          hasActiveParent={false}
          onCenterClick={() => {}}
        />
      </div>
    </div>
  );
}
