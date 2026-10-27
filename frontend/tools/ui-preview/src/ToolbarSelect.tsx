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
    <div className="flex flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        className="font-inherit text-size-family-body min-block-ui-tool-control min-inline-ui-tool-menu"
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
