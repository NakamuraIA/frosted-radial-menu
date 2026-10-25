import { DEFAULT_LAYOUT, FALLBACK_CONFIG } from './defaults';
import type { LayoutConfig, RadialConfig } from './types';

function clampNumber(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/**
 * Mantém o layout fisicamente coerente: o raio interno nunca invade o centro e
 * cada anel externo sempre começa depois do anterior.
 */
export function normalizeLayoutConfig(layout?: Partial<LayoutConfig> | null): LayoutConfig {
  const source = { ...DEFAULT_LAYOUT, ...(layout ?? {}) };
  const centerSize = clampNumber(source.centerSize, 148, 320, DEFAULT_LAYOUT.centerSize);
  const centerRadius = centerSize / 2;
  const mainInnerRadius = clampNumber(
    source.mainInnerRadius,
    centerRadius + 12,
    220,
    DEFAULT_LAYOUT.mainInnerRadius,
  );
  const mainOuterRadius = clampNumber(
    source.mainOuterRadius,
    mainInnerRadius + 58,
    390,
    DEFAULT_LAYOUT.mainOuterRadius,
  );
  const submenuInnerRadius = clampNumber(
    source.submenuInnerRadius,
    mainOuterRadius + 10,
    450,
    DEFAULT_LAYOUT.submenuInnerRadius,
  );
  const submenuOuterRadius = clampNumber(
    source.submenuOuterRadius,
    submenuInnerRadius + 42,
    510,
    DEFAULT_LAYOUT.submenuOuterRadius,
  );

  return {
    menuScale: clampNumber(source.menuScale, 0.45, 1.3, DEFAULT_LAYOUT.menuScale),
    mainInnerRadius,
    mainOuterRadius,
    mainGap: clampNumber(source.mainGap, 0, 10, DEFAULT_LAYOUT.mainGap),
    mainIconSize: clampNumber(source.mainIconSize, 24, 72, DEFAULT_LAYOUT.mainIconSize),
    mainLabelSize: clampNumber(source.mainLabelSize, 9, 22, DEFAULT_LAYOUT.mainLabelSize),
    submenuInnerRadius,
    submenuOuterRadius,
    submenuGap: clampNumber(source.submenuGap, 0, 8, DEFAULT_LAYOUT.submenuGap),
    submenuIconSize: clampNumber(source.submenuIconSize, 24, 76, DEFAULT_LAYOUT.submenuIconSize),
    submenuLabelSize: clampNumber(source.submenuLabelSize, 8, 22, DEFAULT_LAYOUT.submenuLabelSize),
    submenuSpread: clampNumber(source.submenuSpread, 20, 72, DEFAULT_LAYOUT.submenuSpread),
    centerSize,
    borderWidth: clampNumber(source.borderWidth, 0.8, 3.4, DEFAULT_LAYOUT.borderWidth),
    glowIntensity: clampNumber(source.glowIntensity, 0.35, 1.85, DEFAULT_LAYOUT.glowIntensity),
    fontFamily:
      typeof source.fontFamily === 'string' && source.fontFamily.trim()
        ? source.fontFamily
        : DEFAULT_LAYOUT.fontFamily,
  };
}

/** Preenche campos ausentes com o padrão para o app nunca renderizar `undefined`. */
export function normalizeRadialConfig(
  config: Partial<RadialConfig> & { layout?: Partial<LayoutConfig> | null },
): RadialConfig {
  const theme = { ...FALLBACK_CONFIG.theme, ...(config.theme ?? {}) };

  return {
    version: config.version ?? FALLBACK_CONFIG.version,
    schemaVersion: config.schemaVersion ?? FALLBACK_CONFIG.schemaVersion,
    theme: {
      ...theme,
      // Vidro quase transparente deixa o texto ilegível sobre fundo claro.
      glassOpacity: clampNumber(
        theme.glassOpacity,
        0.6,
        0.9,
        FALLBACK_CONFIG.theme.glassOpacity,
      ),
    },
    layout: normalizeLayoutConfig(config.layout),
    preferences: {
      ...FALLBACK_CONFIG.preferences,
      ...(config.preferences ?? {}),
    },
    items: config.items?.length ? config.items : FALLBACK_CONFIG.items,
  };
}
