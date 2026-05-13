import type { Team } from "../../game/types";

export function TeamBadge({ team, compact = false }: { team: Team; compact?: boolean }) {
  return (
    <div className="team-badge" style={{ "--team-primary": team.primaryColor, "--team-secondary": team.secondaryColor } as React.CSSProperties}>
      <span className="team-badge__mark">{team.abbreviation}</span>
      {!compact && (
        <span>
          <strong>{team.fullName}</strong>
          <small>{team.teamPersonality}</small>
        </span>
      )}
    </div>
  );
}
