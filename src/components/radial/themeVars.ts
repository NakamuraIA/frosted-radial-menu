import type { CSSProperties } from 'react';

import type { LayoutConfig, ThemeConfig } from '../../lib/config';

/** Converte tema + layout em CSS custom properties consumidas pelo CSS do menu. */
export function buildRadialThemeVars(theme: ThemeConfig, layout: LayoutConfig): CSSProperties {
  return {
    '--accent': theme.accent,
    '--accent-alt': theme.accentAlt,
    '--danger': theme.danger,
    '--glass-opacity': String(theme.glassOpacity),
    '--anim-speed': String(theme.animationSpeed),
    '--menu-scale': String(layout.menuScale),
    '--menu-font-family': layout.fontFamily,
    '--slice-border-width': `${layout.borderWidth}px`,
    '--glow-intensity': String(layout.glowIntensity),
    '--center-size': `${layout.centerSize}px`,
  } as CSSProperties;
}
