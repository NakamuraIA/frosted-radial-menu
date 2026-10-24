import { CANVAS_CENTER, CANVAS_SIZE } from './geometry';
import { MainSlice } from './MainSlice';
import { SubmenuSlices } from './SubmenuSlices';
import type { LayoutConfig, MenuItemConfig } from '../../lib/config';

interface RadialCanvasProps {
  items: MenuItemConfig[];
  layout: LayoutConfig;
  hoveredId: string | null;
  activeParentId: string | null;
  activeParent: MenuItemConfig | null;
  activeParentAngle: number;
  onHover: (id: string | null) => void;
  onSelect: (item: MenuItemConfig) => void;
}

/** SVG com gradientes, órbitas, fatias principais e o arco de submenu. */
export function RadialCanvas({
  items,
  layout,
  hoveredId,
  activeParentId,
  activeParent,
  activeParentAngle,
  onHover,
  onSelect,
}: RadialCanvasProps) {
  return (
    <svg
      className="radial-canvas"
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
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

      <circle
        className="orbit orbit-soft"
        cx={CANVAS_CENTER}
        cy={CANVAS_CENTER}
        r={layout.submenuOuterRadius + 10}
      />
      <circle
        className="orbit orbit-hot"
        cx={CANVAS_CENTER}
        cy={CANVAS_CENTER}
        r={layout.submenuOuterRadius + 18}
      />
      <circle
        className="orbit orbit-inner"
        cx={CANVAS_CENTER}
        cy={CANVAS_CENTER}
        r={layout.mainInnerRadius + 12}
      />

      <g className="main-slices">
        {items.map((item, index) => (
          <MainSlice
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            layout={layout}
            isHighlighted={hoveredId === item.id || activeParentId === item.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </g>

      <SubmenuSlices
        parent={activeParent}
        parentAngle={activeParentAngle}
        layout={layout}
        hoveredId={hoveredId}
        onHover={onHover}
        onSelect={onSelect}
      />
    </svg>
  );
}
