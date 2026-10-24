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
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
  onSelect: (item: MenuItemConfig) => void;
}

/** Uma fatia do anel principal. */
export function MainSlice({
  item,
  index,
  total,
  layout,
  isHighlighted,
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

  return (
    <g
      className={`slice-group ${isHighlighted ? 'is-hovered' : ''}`}
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
        fill={isHighlighted ? 'url(#slice-hot)' : 'url(#slice-glass)'}
      />
      <foreignObject
        x={labelPosition.x - 62}
        y={labelPosition.y - 47}
        width="124"
        height="94"
        className="slice-foreign"
      >
        <SliceContent item={item} isHovered={isHighlighted} size="main" layout={layout} />
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
