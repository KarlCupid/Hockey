import { CREST_SHAPES } from "../../game/content/teamNamePools";

export function CrestShapePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="segmented-control" aria-label="Crest shape">
      {CREST_SHAPES.map((shape) => (
        <button key={shape} type="button" className={value === shape ? "is-selected" : ""} onClick={() => onChange(shape)}>
          {shape}
        </button>
      ))}
    </div>
  );
}
