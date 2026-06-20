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
  className?: string;
}

export function Toggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: ToggleProps<T>) {
  const rootClassName = className ? `toggle ${className}` : 'toggle';

  return (
    <div className={rootClassName} role="group" aria-label={ariaLabel}>
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
