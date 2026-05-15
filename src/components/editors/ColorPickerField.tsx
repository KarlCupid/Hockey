export function ColorPickerField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-label color-picker-field">
      {label}
      <span>
        <input type="color" value={normalizeColor(value)} onChange={(event) => onChange(event.target.value)} aria-label={label} />
        <input value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} />
      </span>
    </label>
  );
}

export function normalizeColor(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#61c9ff";
}
