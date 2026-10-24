/** Geometria do menu radial. O SVG sempre desenha em 840×840 e o CSS escala. */
export const CANVAS_SIZE = 840;
export const CANVAS_CENTER = CANVAS_SIZE / 2;

export function toRadians(angle: number): number {
  return ((angle - 90) * Math.PI) / 180;
}

export function pointOnCircle(radius: number, angle: number) {
  const rad = toRadians(angle);
  return {
    x: CANVAS_CENTER + radius * Math.cos(rad),
    y: CANVAS_CENTER + radius * Math.sin(rad),
  };
}

/** Path de uma fatia de rosca (anel) com espaçamento entre fatias. */
export function getDonutSlicePath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  gap = 3,
): string {
  const effectiveStart = startAngle + gap / 2;
  const effectiveEnd = endAngle - gap / 2;
  const outerStart = pointOnCircle(outerRadius, effectiveStart);
  const outerEnd = pointOnCircle(outerRadius, effectiveEnd);
  const innerStart = pointOnCircle(innerRadius, effectiveEnd);
  const innerEnd = pointOnCircle(innerRadius, effectiveStart);
  const largeArcFlag = effectiveEnd - effectiveStart <= 180 ? 0 : 1;

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function getLabelPosition(innerRadius: number, outerRadius: number, angle: number) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  return pointOnCircle(radius, angle);
}

export function getChevronPosition(outerRadius: number, angle: number) {
  return pointOnCircle(outerRadius - 16, angle);
}

/** Distribui as fatias principais igualmente ao redor do círculo. */
export function getMainSliceGeometry(index: number, total: number) {
  const anglePerItem = total > 0 ? 360 / total : 0;
  const startAngle = index * anglePerItem - anglePerItem / 2;
  const endAngle = startAngle + anglePerItem;
  return {
    anglePerItem,
    startAngle,
    endAngle,
    midAngle: (startAngle + endAngle) / 2,
  };
}

/** Calcula o arco do submenu, centrado no ângulo da fatia pai. */
export function getSubmenuGeometry(parentAngle: number, itemCount: number, spread: number) {
  const visibleCount = Math.max(1, itemCount);
  const totalSpan = Math.min(178, Math.max(64, visibleCount * spread));
  const anglePerItem = totalSpan / visibleCount;
  const startAngle = parentAngle - totalSpan / 2;

  return {
    anglePerItem,
    startAngle,
  };
}
