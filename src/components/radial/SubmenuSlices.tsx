import type { CSSProperties } from 'react';

import { SliceContent } from './SliceContent';
import { getDonutSlicePath, getLabelPosition, getSubmenuGeometry } from './geometry';
import type { LayoutConfig, MenuItemConfig } from '../../lib/config';

interface SubmenuSlicesProps {
  parent: MenuItemConfig | null;
  parentAngle: number;
  layout: LayoutConfig;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (item: MenuItemConfig) => void;
}

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

  return (
    <g className="submenu-slices">
      {children.slice(0, 5).map((item, index, visibleChildren) => {
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
              <SliceContent item={item} isHovered={isHovered} size="sub" layout={layout} />
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
