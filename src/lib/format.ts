/** Normaliza um percentual de hardware para 0–100. */
export function clampPercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Formata o valor exibido ao lado dos sliders (sem zeros sobrando). */
export function formatRangeValue(value: number, step: number): string {
  return step < 1
    ? value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
    : String(Math.round(value));
}
