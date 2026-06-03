import './RangeSlider.css';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  /** 当前区间；±Infinity 视作未约束，回落到 [min, max] 显示。 */
  value: [number, number];
  onChange: (range: [number, number]) => void;
  format?: (value: number) => string;
}

export function RangeSlider({ label, min, max, step, value, onChange, format }: RangeSliderProps) {
  const lo = Number.isFinite(value[0]) ? value[0] : min;
  const hi = Number.isFinite(value[1]) ? value[1] : max;
  const fmt = format ?? ((value: number) => `${value}`);

  return (
    <div className="range-slider" role="group" aria-label={label}>
      <div className="range-slider__head">
        <span className="range-slider__label">{label}</span>
        <span className="range-slider__value">
          {fmt(lo)}–{fmt(hi)}
        </span>
      </div>
      <div className="range-slider__inputs">
        <input
          type="range"
          aria-label={`${label} 下限`}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(event) => onChange([Math.min(Number(event.target.value), hi), hi])}
        />
        <input
          type="range"
          aria-label={`${label} 上限`}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(event) => onChange([lo, Math.max(Number(event.target.value), lo)])}
        />
      </div>
    </div>
  );
}
