import { upcomingOpponent, recordLabel, selectedTeam } from "../../store/franchiseStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { getCurrentUserPlayoffGame } from "../../game/systems/playoffs";
import { getPhaseLabel, getRecommendedNextAction } from "../../game/systems/phaseGuidance";
import { validateRosterForGame } from "../../game/systems/rosterRules";
import { TeamBadge } from "./TeamBadge";
import { roomLabel } from "./RoomPrompt";
import { useSettingsStore } from "../../store/settingsStore";

export function TopBar() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const saves = useFranchiseStore((state) => state.saves);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
  if (!franchise) return null;

  const team = selectedTeam(franchise);
  const opponent = upcomingOpponent(franchise);
  const playoffGame = getCurrentUserPlayoffGame(franchise);
  const playoffOpponent = playoffGame ? franchise.league.teams.find((candidate) => candidate.id === (playoffGame.homeTeamId === team.id ? playoffGame.awayTeamId : playoffGame.homeTeamId)) : undefined;
  const nextGame = playoffOpponent ? `Playoffs: ${team.fullName} vs ${playoffOpponent.fullName}` : opponent ? `Next: ${team.fullName} vs ${opponent.fullName}` : `${getPhaseLabel(franchise.seasonPhase)} phase`;
  const lastSaved = [...saves].sort((a, b) => Date.parse(b.lastSaved) - Date.parse(a.lastSaved))[0];
  const roster = validateRosterForGame(team);
  const rosterHealth = roster.healthyGoalieCount < 2 ? "Needs goalie" : roster.activeCount > team.activeRosterLimit ? "Too many active" : roster.errors.length ? "Invalid lineup" : "Ready";

  return (
    <header className="top-bar">
      <TeamBadge team={team} compact />
      <div className="top-bar__meta">
        <strong>{recordLabel(team)}</strong>
        <span>{franchise.league.currentDate}</span>
        <span>{getPhaseLabel(franchise.seasonPhase)} | Game {Math.min(22, team.stats.gamesPlayed + 1)}/22</span>
      </div>
      <div className="top-bar__next">
        <strong>{nextGame}</strong>
        <span>{getRecommendedNextAction(franchise)}</span>
      </div>
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
        <span>Roster: {rosterHealth}</span>
        <strong>{activeRoom ? roomLabel(activeRoom) : nearbyRoom ? roomLabel(nearbyRoom) : "Facility Hub"}</strong>
        <div className="top-bar__actions">
          <button type="button" onClick={() => setHelpOpen(true)} aria-label="Open help">?</button>
          <button type="button" onClick={() => setActiveRoom("settings")}>Settings</button>
          {import.meta.env.DEV && <button type="button" onClick={() => setActiveRoom("devTools")}>Dev</button>}
        </div>
      </div>
    </header>
  );
}
