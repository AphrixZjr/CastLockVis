import './Toggle.css';

export interface ToggleOption<T extends string> {
  label: string;
  value: T;
}

interface ToggleProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
}

export function Toggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: ToggleProps<T>) {
  return (
    <div className="toggle" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
