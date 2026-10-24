import type { CSSProperties } from 'react';

import { CustomIcon } from '../common/CustomIcon';
import { renderIcon } from '../common/renderIcon';
import { resolveCustomIconSrc } from '../../lib/icons';
import type { LayoutConfig, MenuItemConfig } from '../../lib/config';

interface SliceContentProps {
  item: MenuItemConfig;
  isHovered: boolean;
  size: 'main' | 'sub';
  layout: LayoutConfig;
}

/** Conteúdo interno de uma fatia: ícone (ou imagem customizada) + rótulo. */
export function SliceContent({ item, isHovered, size, layout }: SliceContentProps) {
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
      <CustomIcon
        className="slice-custom-icon"
        src={resolveCustomIconSrc(item.customIcon)}
        fallback={renderIcon(item.icon, iconSize, 2.15)}
      />
      <span>{item.label}</span>
      <i style={{ opacity: isHovered ? 1 : 0 }} />
    </div>
  );
}
