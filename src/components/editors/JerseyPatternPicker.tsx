import { JERSEY_PATTERNS } from "../../game/content/teamNamePools";

export function JerseyPatternPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="segmented-control" aria-label="Jersey pattern">
      {JERSEY_PATTERNS.map((pattern) => (
        <button key={pattern} type="button" className={value === pattern ? "is-selected" : ""} onClick={() => onChange(pattern)}>
          {pattern}
        </button>
      ))}
    </div>
  );
}
