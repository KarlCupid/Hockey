import { upcomingOpponent, recordLabel, selectedTeam } from "../../store/franchiseStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { getCurrentUserPlayoffGame } from "../../game/systems/playoffs";
import { TeamBadge } from "./TeamBadge";
import { roomLabel } from "./RoomPrompt";

export function TopBar() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const saves = useFranchiseStore((state) => state.saves);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const activeRoom = useUiStore((state) => state.activeRoom);
  if (!franchise) return null;

  const team = selectedTeam(franchise);
  const opponent = upcomingOpponent(franchise);
  const playoffGame = getCurrentUserPlayoffGame(franchise);
  const playoffOpponent = playoffGame ? franchise.league.teams.find((candidate) => candidate.id === (playoffGame.homeTeamId === team.id ? playoffGame.awayTeamId : playoffGame.homeTeamId)) : undefined;
  const nextGame = playoffOpponent ? `Playoffs: ${team.fullName} vs ${playoffOpponent.fullName}` : opponent ? `Next: ${team.fullName} vs ${opponent.fullName}` : `${phaseLabel(franchise.seasonPhase)} phase`;
  const lastSaved = [...saves].sort((a, b) => Date.parse(b.lastSaved) - Date.parse(a.lastSaved))[0];

  return (
    <header className="top-bar">
      <TeamBadge team={team} compact />
      <div className="top-bar__meta">
        <strong>{recordLabel(team)}</strong>
        <span>{franchise.league.currentDate}</span>
        <span>{phaseLabel(franchise.seasonPhase)} | Game {Math.min(22, team.stats.gamesPlayed + 1)}/22</span>
      </div>
      <div className="top-bar__next">{nextGame}</div>
      <div className="top-bar__status">
        <span>
          {franchise.saveStatus === "saved"
            ? "Autosaved"
            : franchise.saveStatus === "saving"
              ? "Autosaving"
              : franchise.saveStatus === "error"
                ? "Save issue"
                : lastSaved
                  ? `Last save ${new Date(lastSaved.lastSaved).toLocaleTimeString()}`
                  : "Local"}
        </span>
        <strong>{activeRoom ? roomLabel(activeRoom) : nearbyRoom ? roomLabel(nearbyRoom) : "Facility Hub"}</strong>
      </div>
    </header>
  );
}

function phaseLabel(phase: string): string {
  return phase.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}
