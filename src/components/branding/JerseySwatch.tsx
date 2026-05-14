import { getJerseyTemplates, type JerseyKind } from "../../game/assets/jerseyTemplates";

export function JerseySwatch({ teamId, kind = "home" }: { teamId: string; kind?: JerseyKind }) {
  const jersey = getJerseyTemplates(teamId)[kind];
  return (
    <div
      className={`jersey-swatch jersey-swatch--${jersey.pattern}`}
      style={
        {
          "--jersey-base": jersey.baseColor,
          "--jersey-shoulder": jersey.shoulderColor,
          "--jersey-stripe": jersey.stripeColor,
          "--jersey-trim": jersey.trimColor
        } as React.CSSProperties
      }
      aria-label={`${kind} fictional jersey concept`}
      title={`${kind} jersey concept`}
    >
      <span />
      <b />
    </div>
  );
}
