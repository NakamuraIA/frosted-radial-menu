import { describe, expect, it } from 'vitest';

import { DEFAULT_LAYOUT, FALLBACK_CONFIG } from './defaults';
import { normalizeLayoutConfig, normalizeRadialConfig } from './normalize';

describe('normalizeLayoutConfig', () => {
  it('usa os defaults quando nada e informado', () => {
    expect(normalizeLayoutConfig(null)).toEqual(DEFAULT_LAYOUT);
  });

  it('impede o raio interno de invadir o centro', () => {
    const layout = normalizeLayoutConfig({ centerSize: 320, mainInnerRadius: 50 });
    expect(layout.mainInnerRadius).toBeGreaterThanOrEqual(160 + 12);
    expect(layout.centerSize).toBe(320);
  });

  it('mantem a ordem dos aneis (principal dentro do submenu)', () => {
    const layout = normalizeLayoutConfig({
      centerSize: 148,
      mainInnerRadius: 100,
      mainOuterRadius: 120,
      submenuInnerRadius: 130,
      submenuOuterRadius: 140,
    });

    expect(layout.mainOuterRadius).toBeGreaterThanOrEqual(layout.mainInnerRadius + 58);
    expect(layout.submenuInnerRadius).toBeGreaterThan(layout.mainOuterRadius);
    expect(layout.submenuOuterRadius).toBeGreaterThanOrEqual(layout.submenuInnerRadius + 42);
  });

  it('respeita limites de escala e glow', () => {
    const layout = normalizeLayoutConfig({ menuScale: 99, glowIntensity: -5, borderWidth: 10 });
    expect(layout.menuScale).toBe(1.3);
    expect(layout.glowIntensity).toBe(0.35);
    expect(layout.borderWidth).toBe(3.4);
  });

  it('descarta fonte vazia e mantem uma valida', () => {
    expect(normalizeLayoutConfig({ fontFamily: '   ' }).fontFamily).toBe(DEFAULT_LAYOUT.fontFamily);
    expect(normalizeLayoutConfig({ fontFamily: 'Inter' }).fontFamily).toBe('Inter');
  });
});

describe('normalizeRadialConfig', () => {
  it('preenche tema e preferencias ausentes com o fallback', () => {
    const config = normalizeRadialConfig({});
    expect(config.theme).toEqual(FALLBACK_CONFIG.theme);
    expect(config.preferences).toEqual(FALLBACK_CONFIG.preferences);
  });

  it('manteve o default de runCommandsAsAdmin desligado', () => {
    expect(normalizeRadialConfig({}).preferences.runCommandsAsAdmin).toBe(false);
  });

  it('usa os itens do fallback quando a lista vem vazia', () => {
    const config = normalizeRadialConfig({ items: [] });
    expect(config.items.length).toBeGreaterThan(0);
    expect(config.items).toEqual(FALLBACK_CONFIG.items);
  });

  it('preserva os itens informados', () => {
    const config = normalizeRadialConfig({
      items: [
        {
          id: 'x',
          label: 'X',
          icon: 'apps',
          color: '#fff',
          actionType: 'none',
        },
      ],
    });
    expect(config.items).toHaveLength(1);
    expect(config.items[0].id).toBe('x');
  });
});
