import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ChevronRight } from 'lucide-react';
import {
  clampPercent,
  FALLBACK_CONFIG,
  findMenuItem,
  normalizeLayoutConfig,
  normalizeRadialConfig,
  type MenuItemConfig,
  type LayoutConfig,
  type RadialConfig,
  type SystemStats,
} from '../lib/menuConfig';
import { getIconComponent } from '../lib/iconRegistry';
import './RadialMenu.css';

const SIZE = 840;
const CENTER = SIZE / 2;
const MAX_MAIN_ITEMS = 10;

function toRadians(angle: number) {
  return ((angle - 90) * Math.PI) / 180;
}

function pointOnCircle(radius: number, angle: number) {
  const rad = toRadians(angle);
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function getDonutSlicePath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  gap = 3,
) {
  const effectiveStart = startAngle + gap / 2;
  const effectiveEnd = endAngle - gap / 2;
  const outerStart = pointOnCircle(outerRadius, effectiveStart);
  const outerEnd = pointOnCircle(outerRadius, effectiveEnd);
  const innerStart = pointOnCircle(innerRadius, effectiveEnd);
  const innerEnd = pointOnCircle(innerRadius, effectiveStart);
  const largeArcFlag = effectiveEnd - effectiveStart <= 180 ? 0 : 1;

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function getLabelPosition(innerRadius: number, outerRadius: number, angle: number) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  return pointOnCircle(radius, angle);
}

function getChevronPosition(outerRadius: number, angle: number) {
  return pointOnCircle(outerRadius - 16, angle);
}

function getSubmenuGeometry(parentAngle: number, itemCount: number, spread: number) {
  const visibleCount = Math.max(1, itemCount);
  const totalSpan = Math.min(178, Math.max(64, visibleCount * spread));
  const anglePerItem = totalSpan / visibleCount;
  const startAngle = parentAngle - totalSpan / 2;

  return {
    anglePerItem,
    startAngle,
  };
}

function renderSliceContent(
  item: MenuItemConfig,
  isHovered: boolean,
  size: 'main' | 'sub',
  layout: LayoutConfig,
) {
  const Icon = getIconComponent(item.icon);
  const iconSize = size === 'main' ? layout.mainIconSize : layout.submenuIconSize;
  const labelSize = size === 'main' ? layout.mainLabelSize : layout.submenuLabelSize;

  return (
    <div
      className={`slice-content slice-content-${size}`}
      style={
        {
          '--slice-icon-size': `${iconSize}px`,
          '--slice-label-size': `${labelSize}px`,
        } as CSSProperties
      }
    >
      {item.customIcon ? (
        <img className="slice-custom-icon" src={item.customIcon} alt="" />
      ) : (
        <Icon size={iconSize} strokeWidth={2.15} />
      )}
      <span>{item.label}</span>
      <i style={{ opacity: isHovered ? 1 : 0 }} />
    </div>
  );
}

function statLabel(value: number | null) {
  return typeof value === 'number' ? `${clampPercent(value)}%` : 'N/D';
}

function getPreviewActiveParentId() {
  return new URLSearchParams(window.location.search).get('activeParent');
}

export function RadialMenu() {
  const [config, setConfig] = useState<RadialConfig>(() => normalizeRadialConfig(FALLBACK_CONFIG));
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(() => getPreviewActiveParentId());
  const [time, setTime] = useState(() => new Date());
  const [stats, setStats] = useState<SystemStats>({ cpu: 64, ram: 42, gpu: null });

  const loadConfig = useCallback(async () => {
    try {
      const nextConfig = await invoke<RadialConfig>('load_config');
      setConfig(normalizeRadialConfig(nextConfig));
    } catch (error) {
      console.warn('Nao foi possivel carregar a configuracao do Tauri.', error);
      setConfig(normalizeRadialConfig(FALLBACK_CONFIG));
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const nextStats = await invoke<SystemStats>('get_system_stats');
      setStats(nextStats);
    } catch {
      setStats((current) => ({
        cpu: current.cpu >= 92 ? 28 : current.cpu + 7,
        ram: current.ram >= 84 ? 38 : current.ram + 3,
        gpu: current.gpu,
      }));
    }
  }, []);

  const hideMenu = useCallback(async () => {
    setIsOpen(false);
    window.setTimeout(() => {
      void invoke('hide_main_window').catch(() => getCurrentWindow().hide()).finally(() => {
        setActiveParentId(null);
      });
    }, 140);
  }, []);

  const handleCenterClick = useCallback(async () => {
    if (activeParentId) {
      setActiveParentId(null);
      return;
    }

    await hideMenu();
  }, [activeParentId, hideMenu]);

  const runAction = useCallback(
    async (item: MenuItemConfig) => {
      if (item.children?.length || item.actionType === 'submenu') {
        setActiveParentId((current) => (current === item.id ? null : item.id));
        return;
      }

      try {
        await invoke('run_menu_action', { actionId: item.id });
      } catch (error) {
        console.error(`Falha ao executar ${item.label}`, error);
      }

      if (config.preferences.hideAfterAction && item.actionType !== 'none') {
        await hideMenu();
      }
    },
    [hideMenu, config.preferences.hideAfterAction],
  );

  useEffect(() => {
    const openTimer = window.setTimeout(() => setIsOpen(true), 60);
    const clockTimer = window.setInterval(() => setTime(new Date()), 1000);
    const statsTimer = window.setInterval(() => {
      void refreshStats();
    }, 1800);

    const loadTimer = window.setTimeout(() => {
      void loadConfig();
      void refreshStats();
    }, 0);

    const unlisteners = [
      listen('menu-opened', () => {
        setIsOpen(true);
      }),
      listen('menu-closed', () => {
        setIsOpen(false);
        setActiveParentId(null);
      }),
      listen('config-updated', () => {
        void loadConfig();
      }),
    ];

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(loadTimer);
      window.clearInterval(clockTimer);
      window.clearInterval(statsTimer);
      unlisteners.forEach((unlisten) => {
        void unlisten.then((dispose) => dispose());
      });
    };
  }, [loadConfig, refreshStats]);

  const mainItems = useMemo(
    () => config.items.slice(0, MAX_MAIN_ITEMS),
    [config.items],
  );

  const mainItemAngles = useMemo(() => {
    const anglePerItem = 360 / mainItems.length;
    return new Map(mainItems.map((item, index) => [item.id, index * anglePerItem]));
  }, [mainItems]);

  const activeParent = useMemo(
    () => findMenuItem(config.items, activeParentId),
    [activeParentId, config.items],
  );

  const layout = useMemo(() => normalizeLayoutConfig(config.layout), [config.layout]);
  const activeChildren = activeParent?.children ?? [];
  const activeParentAngle = mainItemAngles.get(activeParentId ?? '') ?? 90;
  const focusPercent = clampPercent(stats.cpu);
  const cpuDash = 2 * Math.PI * 64;
  const timeText = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateText = time.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });

  const themeVars = {
    '--accent': config.theme.accent,
    '--accent-alt': config.theme.accentAlt,
    '--danger': config.theme.danger,
    '--glass-opacity': String(config.theme.glassOpacity),
    '--anim-speed': String(config.theme.animationSpeed),
    '--menu-scale': String(layout.menuScale),
    '--menu-font-family': layout.fontFamily,
    '--slice-border-width': `${layout.borderWidth}px`,
    '--glow-intensity': String(layout.glowIntensity),
    '--center-size': `${layout.centerSize}px`,
  } as CSSProperties;

  return (
    <div className={`radial-shell ${isOpen ? 'is-open' : ''}`} style={themeVars}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <svg
        className="radial-canvas"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-label="Menu radial"
      >
        <defs>
          <radialGradient id="slice-glass" cx="45%" cy="32%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
            <stop offset="46%" stopColor="rgba(67,86,112,0.34)" />
            <stop offset="100%" stopColor="rgba(4,8,18,0.78)" />
          </radialGradient>
          <radialGradient id="slice-hot" cx="42%" cy="22%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="50%" stopColor="rgba(35,230,255,0.24)" />
            <stop offset="100%" stopColor="rgba(4,8,18,0.72)" />
          </radialGradient>
          <filter id="neon-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle className="orbit orbit-soft" cx={CENTER} cy={CENTER} r={layout.submenuOuterRadius + 10} />
        <circle className="orbit orbit-hot" cx={CENTER} cy={CENTER} r={layout.submenuOuterRadius + 18} />
        <circle className="orbit orbit-inner" cx={CENTER} cy={CENTER} r={layout.mainInnerRadius + 12} />

        <g className="main-slices">
          {mainItems.map((item, index) => {
            const anglePerItem = 360 / mainItems.length;
            const startAngle = index * anglePerItem - anglePerItem / 2;
            const endAngle = startAngle + anglePerItem;
            const midAngle = (startAngle + endAngle) / 2;
            const isHovered = hoveredId === item.id || activeParentId === item.id;
            const labelPosition = getLabelPosition(
              layout.mainInnerRadius,
              layout.mainOuterRadius,
              midAngle,
            );
            const chevronPosition = getChevronPosition(layout.mainOuterRadius, midAngle);

            return (
              <g
                key={item.id}
                className={`slice-group ${isHovered ? 'is-hovered' : ''}`}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => void runAction(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void runAction(item);
                  }
                }}
                role="button"
                tabIndex={0}
                style={{ '--slice-color': item.color } as CSSProperties}
              >
                <path
                  className="slice-path"
                  d={getDonutSlicePath(
                    layout.mainInnerRadius,
                    layout.mainOuterRadius,
                    startAngle,
                    endAngle,
                    layout.mainGap,
                  )}
                  fill={isHovered ? 'url(#slice-hot)' : 'url(#slice-glass)'}
                />
                <foreignObject
                  x={labelPosition.x - 62}
                  y={labelPosition.y - 47}
                  width="124"
                  height="94"
                  className="slice-foreign"
                >
                  {renderSliceContent(item, isHovered, 'main', layout)}
                </foreignObject>

                {item.children?.length ? (
                  <foreignObject
                    x={chevronPosition.x - 10}
                    y={chevronPosition.y - 10}
                    width="20"
                    height="20"
                    className="slice-chevron"
                    style={{ '--chevron-rotation': `${midAngle - 90}deg` } as CSSProperties}
                  >
                    <ChevronRight size={18} />
                  </foreignObject>
                ) : null}
              </g>
            );
          })}
        </g>

        {activeChildren.length ? (
          <g className="submenu-slices">
            {activeChildren.slice(0, 5).map((item, index, visibleChildren) => {
              const geometry = getSubmenuGeometry(
                activeParentAngle,
                visibleChildren.length,
                layout.submenuSpread,
              );
              const startAngle = geometry.startAngle + index * geometry.anglePerItem;
              const anglePerItem = geometry.anglePerItem;
              const endAngle = startAngle + anglePerItem;
              const midAngle = (startAngle + endAngle) / 2;
              const labelPosition = getLabelPosition(
                layout.submenuInnerRadius,
                layout.submenuOuterRadius,
                midAngle,
              );
              const isHovered = hoveredId === item.id;

              return (
                <g
                  key={item.id}
                  className={`slice-group submenu-group ${isHovered ? 'is-hovered' : ''}`}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => void runAction(item)}
                  role="button"
                  tabIndex={0}
                  style={{ '--slice-color': item.color } as CSSProperties}
                >
                  <path
                    className="submenu-path"
                    d={getDonutSlicePath(
                      layout.submenuInnerRadius,
                      layout.submenuOuterRadius,
                      startAngle,
                      endAngle,
                      layout.submenuGap,
                    )}
                  />
                  <foreignObject
                    x={labelPosition.x - 60}
                    y={labelPosition.y - 55}
                    width="120"
                    height="110"
                    className="slice-foreign"
                  >
                    {renderSliceContent(item, isHovered, 'sub', layout)}
                  </foreignObject>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>

      <button
        className="center-dashboard"
        type="button"
        onClick={() => void handleCenterClick()}
        title={activeParentId ? 'Voltar' : 'Fechar menu'}
      >
        <svg className="center-progress" viewBox="0 0 160 160" aria-hidden="true">
          <circle className="center-track" cx="80" cy="80" r="64" />
          <circle
            className="center-cpu"
            cx="80"
            cy="80"
            r="64"
            strokeDasharray={cpuDash}
            strokeDashoffset={cpuDash - (cpuDash * focusPercent) / 100}
          />
        </svg>
        <span className="center-time">{timeText}</span>
        <span className="center-date">{dateText}</span>
        {config.preferences.showPercentages ? <strong>{focusPercent}%</strong> : null}
        <div className="center-metrics" aria-label="Uso do sistema">
          <span>
            <b>CPU</b>
            <em>{config.preferences.showPercentages ? statLabel(stats.cpu) : 'ON'}</em>
          </span>
          <span>
            <b>RAM</b>
            <em>{config.preferences.showPercentages ? statLabel(stats.ram) : 'ON'}</em>
          </span>
          <span>
            <b>GPU</b>
            <em>{config.preferences.showPercentages ? statLabel(stats.gpu) : 'N/D'}</em>
          </span>
        </div>
      </button>

    </div>
  );
}
