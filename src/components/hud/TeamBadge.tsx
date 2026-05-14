import type { Team } from "../../game/types";
import { TeamCrest } from "../branding/TeamCrest";

export function TeamBadge({ team, compact = false }: { team: Team; compact?: boolean }) {
  return (
    <div className="team-badge" style={{ "--team-primary": team.primaryColor, "--team-secondary": team.secondaryColor } as React.CSSProperties}>
      <span className="team-badge__mark">
        <TeamCrest teamId={team.id} size={compact ? 34 : 44} title={`${team.fullName} crest`} />
      </span>
      {!compact && (
        <span>
          <strong>{team.fullName}</strong>
          <small>{team.teamPersonality}</small>
        </span>
      )}
    </div>
  );
}
