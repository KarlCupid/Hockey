import { getTeamBranding } from "../../game/assets/teamBranding";
import { JerseySwatch } from "./JerseySwatch";
import { TeamCrest } from "./TeamCrest";

export function TeamBrandCard({
  teamId,
  name,
  meta,
  onSelect
}: {
  teamId: string;
  name: string;
  meta: string;
  onSelect?: () => void;
}) {
  const brand = getTeamBranding(teamId);
  return (
    <button
      className="team-brand-card"
      type="button"
      onClick={onSelect}
      style={{ "--team-primary": brand.primaryColor, "--team-secondary": brand.secondaryColor, "--team-accent": brand.accentColor } as React.CSSProperties}
    >
      <TeamCrest teamId={teamId} />
      <span>
        <strong>{name}</strong>
        <small>{meta}</small>
        <em>{brand.chant}</em>
      </span>
      <span className="team-brand-card__swatches" aria-hidden="true">
        <JerseySwatch teamId={teamId} kind="home" />
        <JerseySwatch teamId={teamId} kind="away" />
      </span>
    </button>
  );
}
