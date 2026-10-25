import { ChevronRight } from 'lucide-react';
import type { CSSProperties } from 'react';

import { SliceContent } from './SliceContent';
import {
  getChevronPosition,
  getDonutSlicePath,
  getLabelPosition,
  getMainSliceGeometry,
} from './geometry';
import type { LayoutConfig, MenuItemConfig } from '../../lib/config';

interface MainSliceProps {
  item: MenuItemConfig;
  index: number;
  total: number;
  layout: LayoutConfig;
  isHovered: boolean;
  isActive: boolean;
  onHover: (id: string | null) => void;
  onSelect: (item: MenuItemConfig) => void;
}

/** Uma fatia do anel principal. */
export function MainSlice({
  item,
  index,
  total,
  layout,
  isHovered,
  isActive,
  onHover,
  onSelect,
}: MainSliceProps) {
  const { startAngle, endAngle, midAngle } = getMainSliceGeometry(index, total);
  const labelPosition = getLabelPosition(
    layout.mainInnerRadius,
    layout.mainOuterRadius,
    midAngle,
  );
  const chevronPosition = getChevronPosition(layout.mainOuterRadius, midAngle);
  const highlighted = isHovered || isActive;

  return (
    <g
      className={[
        'slice-group',
        isHovered ? 'is-hovered' : '',
        isActive ? 'is-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
      aria-haspopup={item.children?.length ? 'menu' : undefined}
      aria-expanded={item.children?.length ? isActive : undefined}
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
        fill={highlighted ? 'url(#slice-hot)' : 'url(#slice-glass)'}
      />
      <foreignObject
        x={labelPosition.x - 62}
        y={labelPosition.y - 47}
        width="124"
        height="94"
        className="slice-foreign"
      >
        <SliceContent item={item} isHovered={highlighted} size="main" layout={layout} />
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
}
