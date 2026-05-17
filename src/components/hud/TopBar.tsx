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
import { DEFAULT_FACILITY_BLUEPRINT } from "../../game/facility/facilityBlueprint";
import { getDistrictForRoom } from "../../game/facility/facilityNavigation";
import { getCurrentDistrictFromPosition, getNearestRoomLabel } from "../../game/facility/facilityWayfinding";
import { TeamBadge } from "./TeamBadge";
import { roomLabel } from "./RoomPrompt";
import { useSettingsStore } from "../../store/settingsStore";
import { useAudioStore } from "../../store/audioStore";
import type { FranchiseState } from "../../game/types";

export function TopBar() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const saves = useFranchiseStore((state) => state.saves);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const facilityPosition = useUiStore((state) => state.facilityPosition);
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
  const guidedStartActive = franchise.tutorialState.active && !activeRoom;
  const nextHeadline = guidedStartActive ? "First shift: get oriented" : nextGame;
  const nextAction = guidedStartActive ? "Open the GM Computer, then follow roster, coach, arena, and save." : getRecommendedNextAction(franchise);
  const lastSaved = [...saves].sort((a, b) => Date.parse(b.lastSaved) - Date.parse(a.lastSaved))[0];
  const roster = validateRosterForGame(team);
  const rosterHealth = roster.healthyGoalieCount < 2 ? "Needs goalie" : roster.activeCount > team.activeRosterLimit ? "Too many active" : roster.errors.length ? "Invalid lineup" : "Ready";
  const urgentActions = getUrgentActionCount(franchise);
  const currentDistrict = activeRoom
    ? getDistrictForRoom(DEFAULT_FACILITY_BLUEPRINT, activeRoom)
    : nearbyRoom
      ? getDistrictForRoom(DEFAULT_FACILITY_BLUEPRINT, nearbyRoom)
      : getCurrentDistrictFromPosition(DEFAULT_FACILITY_BLUEPRINT, facilityPosition);
  const nearestRoomLabel = nearbyRoom ? roomLabel(nearbyRoom) : getNearestRoomLabel(DEFAULT_FACILITY_BLUEPRINT, facilityPosition);
  const assistantAlerts = franchise.assistantGmReports
    .filter((report) => !report.dismissed)
    .reduce((sum, report) => sum + report.recommendations.filter((recommendation) => recommendation.priority === "urgent" || recommendation.priority === "high").length, 0);
  return (
    <header className={guidedStartActive ? "top-bar top-bar--guided" : "top-bar"}>
      <TeamBadge team={team} compact />
      <div className="top-bar__meta">
        <strong>{recordLabel(team)}</strong>
        <span>{franchise.league.currentDate}</span>
        <span>{getPhaseLabel(franchise.seasonPhase)} | Game {Math.min(ruleSet.gamesPerTeam, team.stats.gamesPlayed + 1)}/{ruleSet.gamesPerTeam}</span>
        {!guidedStartActive && <span>{getGameModeLabel(franchise.gmProfile.gameMode)} | {getDifficultyLabel(franchise.gmProfile.difficulty)} | {franchise.gmProfile.storyFrequency}</span>}
        {!guidedStartActive && franchise.customLeagueName && <span>{franchise.customLeagueName}{franchise.dataPackMetadata?.scenarioName ? ` | ${franchise.dataPackMetadata.scenarioName}` : ""}</span>}
      </div>
      <div className="top-bar__next">
        <strong>{nextHeadline}</strong>
        <span>{nextAction}</span>
      </div>
      <div className="top-bar__status">
        {latestAchievement && !guidedStartActive && !activeRoom && (
          <span className="achievement-toast" aria-live="polite">
            Achievement: {latestAchievement.label}
          </span>
        )}
        <span>{saveStatusLabel(franchise, lastSaved?.lastSaved, guidedStartActive)}</span>
        <span>Roster: {rosterHealth}</span>
        <span>AGM: {assistantAlerts}</span>
        {!guidedStartActive && <span>Urgent: {urgentActions}</span>}
        {!guidedStartActive && <span>{getReleaseLabel()}</span>}
        {!guidedStartActive && <span>District: {currentDistrict?.label ?? "Facility Hub"}</span>}
        {!guidedStartActive && <strong>{activeRoom ? roomLabel(activeRoom) : nearestRoomLabel}</strong>}
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

function saveStatusLabel(franchise: FranchiseState, lastSaved?: string, compact = false): string {
  if (franchise.saveStatus === "saved") return "Autosaved";
  if (franchise.saveStatus === "saving") return "Autosaving";
  if (franchise.saveStatus === "error") return "Save issue";
  if (lastSaved && !compact) return `Last save ${new Date(lastSaved).toLocaleTimeString()}`;
  return "Local save";
}
