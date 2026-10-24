import { describe, expect, it } from 'vitest';

import { clampPercent, formatRangeValue } from './format';

describe('clampPercent', () => {
  it('limita entre 0 e 100 e arredonda', () => {
    expect(clampPercent(42.6)).toBe(43);
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(150)).toBe(100);
  });

  it('trata valores invalidos como zero', () => {
    expect(clampPercent(null)).toBe(0);
    expect(clampPercent(undefined)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe('formatRangeValue', () => {
  it('mostra duas casas sem zeros a direita para passos fracionarios', () => {
    expect(formatRangeValue(0.72, 0.02)).toBe('0.72');
    expect(formatRangeValue(1, 0.05)).toBe('1');
    expect(formatRangeValue(0.5, 0.05)).toBe('0.5');
  });

  it('arredonda valores inteiros', () => {
    expect(formatRangeValue(244.4, 1)).toBe('244');
    expect(formatRangeValue(1.85, 0.05)).toBe('1.85');
  });
});
