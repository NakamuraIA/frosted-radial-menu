import { formatRangeValue } from '../../lib/format';

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

/** Slider com o valor formatado ao lado do rótulo. */
export function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: RangeFieldProps) {
  return (
    <label className="range-field">
      <span>
        {label}
        <output>
          {formatRangeValue(value, step)}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
