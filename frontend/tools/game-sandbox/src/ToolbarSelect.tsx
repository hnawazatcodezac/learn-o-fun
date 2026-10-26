import { useId } from 'react';

interface ToolbarSelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function ToolbarSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: ToolbarSelectProps<T>) {
  const id = useId();

  return (
    <div className="sandbox-control">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          if (next) onChange(next.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
