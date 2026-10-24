import type { CSSProperties } from 'react';

import { formatRangeValue } from '../../lib/format';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

/**
 * Slider com valor numérico destacado e limites visíveis, como pede o spec v2.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  hint,
  disabled,
  onChange,
}: SliderProps) {
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;

  return (
    <div className={`ui-slider ${disabled ? 'is-disabled' : ''}`}>
      <div className="ui-slider__head">
        <span className="ui-slider__label">{label}</span>
        <output className="ui-slider__value">
          {formatRangeValue(value, step)}
          {unit}
        </output>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        style={{ '--fill': `${ratio * 100}%` } as CSSProperties}
      />
      <div className="ui-slider__bounds" aria-hidden="true">
        <span>
          {formatRangeValue(min, step)}
          {unit}
        </span>
        <span>
          {formatRangeValue(max, step)}
          {unit}
        </span>
      </div>
      {hint ? <p className="ui-slider__hint">{hint}</p> : null}
    </div>
  );
}
