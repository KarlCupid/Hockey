import type { CSSProperties } from "react";
import type { CustomTeamDefinition } from "../../game/types";

export function TeamPreviewCard({ team }: { team: CustomTeamDefinition }) {
  const style = {
    "--team-primary": team.primaryColor,
    "--team-secondary": team.secondaryColor,
    "--team-accent": team.accentColor
  } as CSSProperties;
  return (
    <article className="custom-team-preview" style={style}>
      <div className="custom-team-preview__crest" aria-label={`${team.fullName} fictional crest preview`}>
        <span>{team.branding.crestInitials}</span>
      </div>
      <div>
        <strong>{team.fullName}</strong>
        <span>{team.marketSize} market | {team.teamPersonality}</span>
        <small>{team.arenaName} | {team.branding.chant}</small>
      </div>
      <div className="custom-team-preview__jerseys" aria-hidden="true">
        <JerseyMini primary={team.primaryColor} secondary={team.secondaryColor} accent={team.accentColor} />
        <JerseyMini primary="#f5fbff" secondary={team.primaryColor} accent={team.secondaryColor} />
      </div>
    </article>
  );
}

function JerseyMini({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  return (
    <span className="custom-jersey-mini" style={{ "--jersey-base": primary, "--jersey-shoulder": secondary, "--jersey-stripe": accent } as CSSProperties}>
      <b />
    </span>
  );
}
