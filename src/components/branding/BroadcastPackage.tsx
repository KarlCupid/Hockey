import { createBroadcastTheme } from "../../game/assets/broadcastTheme";
import type { Team } from "../../game/types";
import { TeamCrest } from "./TeamCrest";

export function BroadcastScorebug({
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  label
}: {
  awayTeam: Team;
  homeTeam: Team;
  awayScore: number;
  homeScore: number;
  label: string;
}) {
  const theme = createBroadcastTheme(homeTeam, awayTeam);
  return (
    <div className={`broadcast-package ${theme.lowerThirdClass}`} style={{ "--scorebug-gradient": theme.scorebugGradient } as React.CSSProperties}>
      <span>
        <TeamCrest teamId={awayTeam.id} size={34} />
        <strong>{awayTeam.abbreviation}</strong>
        <b>{awayScore}</b>
      </span>
      <em>{label}</em>
      <span>
        <b>{homeScore}</b>
        <strong>{homeTeam.abbreviation}</strong>
        <TeamCrest teamId={homeTeam.id} size={34} />
      </span>
    </div>
  );
}
