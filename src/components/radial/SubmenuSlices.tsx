import type { CSSProperties } from 'react';

import { SliceContent } from './SliceContent';
import { getDonutSlicePath, getLabelPosition, getSubmenuGeometry } from './geometry';
import { MAX_SUBMENU_ITEMS, type LayoutConfig, type MenuItemConfig } from '../../lib/config';

interface SubmenuSlicesProps {
  parent: MenuItemConfig | null;
  parentAngle: number;
  layout: LayoutConfig;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (item: MenuItemConfig) => void;
}

const COMPACT_THRESHOLD = 5;

/** Arco externo com os filhos da fatia ativa. */
export function SubmenuSlices({
  parent,
  parentAngle,
  layout,
  hoveredId,
  onHover,
  onSelect,
}: SubmenuSlicesProps) {
  const children = parent?.children ?? [];
  if (!children.length) return null;

  const visibleChildren = children.slice(0, MAX_SUBMENU_ITEMS);
  const compact = visibleChildren.length > COMPACT_THRESHOLD;

  return (
    <g className={`submenu-slices ${compact ? 'is-dense' : ''}`}>
      {visibleChildren.map((item, index) => {
        const geometry = getSubmenuGeometry(parentAngle, visibleChildren.length, layout.submenuSpread);
        const startAngle = geometry.startAngle + index * geometry.anglePerItem;
        const endAngle = startAngle + geometry.anglePerItem;
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
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={item.label}
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
              <SliceContent
                item={item}
                isHovered={isHovered}
                size="sub"
                layout={layout}
                compact={compact}
              />
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
