import { useEffect, useMemo, useRef } from "react";
import { upcomingOpponent, recordLabel, selectedTeam } from "../../store/franchiseStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { getCurrentUserPlayoffGame } from "../../game/systems/playoffs";
import { getPhaseLabel, getRecommendedNextAction } from "../../game/systems/phaseGuidance";
import { validateRosterForGame } from "../../game/systems/rosterRules";
import { getUrgentActionCount } from "../../game/systems/actionQueue";
import { getDifficultyLabel, getGameModeLabel } from "../../game/systems/difficulty";
import { normalizeLeagueRuleSet } from "../../game/systems/leagueRules";
import { getReleaseLabel } from "../../game/systems/version";
import { TeamBadge } from "./TeamBadge";
import { roomLabel } from "./RoomPrompt";
import { useSettingsStore } from "../../store/settingsStore";
import { useAudioStore } from "../../store/audioStore";

export function TopBar() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const saves = useFranchiseStore((state) => state.saves);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
  const playCue = useAudioStore((state) => state.playCue);
  const lastAchievementRef = useRef<string | undefined>(undefined);
  const latestAchievement = useMemo(
    () => [...(franchise?.achievements ?? [])].filter((achievement) => achievement.unlockedAt).sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? ""))[0],
    [franchise?.achievements]
  );

  useEffect(() => {
    if (!latestAchievement?.unlockedAt || latestAchievement.id === lastAchievementRef.current) return;
    lastAchievementRef.current = latestAchievement.id;
    playCue("achievement-unlock");
  }, [latestAchievement, playCue]);

  if (!franchise) return null;

  const team = selectedTeam(franchise);
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const opponent = upcomingOpponent(franchise);
  const playoffGame = getCurrentUserPlayoffGame(franchise);
  const playoffOpponent = playoffGame ? franchise.league.teams.find((candidate) => candidate.id === (playoffGame.homeTeamId === team.id ? playoffGame.awayTeamId : playoffGame.homeTeamId)) : undefined;
  const nextGame = playoffOpponent ? `Playoffs: ${team.fullName} vs ${playoffOpponent.fullName}` : opponent ? `Next: ${team.fullName} vs ${opponent.fullName}` : `${getPhaseLabel(franchise.seasonPhase)} phase`;
  const lastSaved = [...saves].sort((a, b) => Date.parse(b.lastSaved) - Date.parse(a.lastSaved))[0];
  const roster = validateRosterForGame(team);
  const rosterHealth = roster.healthyGoalieCount < 2 ? "Needs goalie" : roster.activeCount > team.activeRosterLimit ? "Too many active" : roster.errors.length ? "Invalid lineup" : "Ready";
  const urgentActions = getUrgentActionCount(franchise);
  const assistantAlerts = franchise.assistantGmReports
    .filter((report) => !report.dismissed)
    .reduce((sum, report) => sum + report.recommendations.filter((recommendation) => recommendation.priority === "urgent" || recommendation.priority === "high").length, 0);
  return (
    <header className="top-bar">
      <TeamBadge team={team} compact />
      <div className="top-bar__meta">
        <strong>{recordLabel(team)}</strong>
        <span>{franchise.league.currentDate}</span>
        <span>{getPhaseLabel(franchise.seasonPhase)} | Game {Math.min(ruleSet.gamesPerTeam, team.stats.gamesPlayed + 1)}/{ruleSet.gamesPerTeam}</span>
        <span>{getGameModeLabel(franchise.gmProfile.gameMode)} | {getDifficultyLabel(franchise.gmProfile.difficulty)} | {franchise.gmProfile.storyFrequency}</span>
        {franchise.customLeagueName && <span>{franchise.customLeagueName}{franchise.dataPackMetadata?.scenarioName ? ` | ${franchise.dataPackMetadata.scenarioName}` : ""}</span>}
      </div>
      <div className="top-bar__next">
        <strong>{nextGame}</strong>
        <span>{getRecommendedNextAction(franchise)}</span>
      </div>
      <div className="top-bar__status">
        {latestAchievement && (
          <span className="achievement-toast" aria-live="polite">
            Achievement: {latestAchievement.label}
          </span>
        )}
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
        <span>Urgent: {urgentActions}</span>
        <span>AGM: {assistantAlerts}</span>
        <span>{getReleaseLabel()}</span>
        <strong>{activeRoom ? roomLabel(activeRoom) : nearbyRoom ? roomLabel(nearbyRoom) : "Facility Hub"}</strong>
        <div className="top-bar__actions">
          <button type="button" onClick={() => setHelpOpen(true)} aria-label="Open help">?</button>
          <button type="button" onClick={() => setActiveRoom("feedback")}>Feedback</button>
          <button type="button" onClick={() => setActiveRoom("settings")}>Settings</button>
          {import.meta.env.DEV && <button type="button" onClick={() => setActiveRoom("devTools")}>Dev</button>}
        </div>
      </div>
    </header>
  );
}
