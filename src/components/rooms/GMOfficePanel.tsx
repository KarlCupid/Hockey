import { useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { upcomingOpponent, recordLabel, selectedTeam } from "../../store/franchiseStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { describePlayoffResult, getCurrentUserPlayoffGame } from "../../game/systems/playoffs";
import { ownerMoodLabel } from "../../game/systems/owner";
import {
  getAdvancePreview,
  getDangerWarnings,
  getPhaseChecklist,
  getPhaseDescription,
  getPhaseLabel,
  getRecommendedNextAction
} from "../../game/systems/phaseGuidance";
import { validateRosterForGame } from "../../game/systems/rosterRules";
import { getActiveDecisionEvents } from "../../game/systems/decisionEvents";
import { createFanPulse, createMediaNarrative } from "../../game/systems/fanMedia";
import { getAgentPressureLevel } from "../../game/systems/agentInteractions";
import { getTeamMeetingNeed } from "../../game/systems/playerMeetings";
import { getMasterActionQueue, getUrgentActionCount } from "../../game/systems/actionQueue";
import { getDifficultyLabel, getGameModeLabel } from "../../game/systems/difficulty";
import { getGmProfileSummary } from "../../game/systems/gmProfile";
import { getAchievementSummary } from "../../game/systems/achievements";
import { normalizeLeagueRuleSet } from "../../game/systems/leagueRules";
import { getRecentMilestones } from "../../game/systems/milestones";
import { getCurrentTutorialStep, getTutorialSteps } from "../../game/systems/tutorial";
import { getPlaytestChecklists, validatePlaytestChecklists } from "../../game/systems/playtestChecklist";
import { getAfterFirstGameChecklist, getFirstHourChecklist } from "../../game/systems/onboarding";
import { createFrictionRecommendation, detectUxFriction } from "../../game/systems/uxFriction";
import type { FranchiseState } from "../../game/types";
import { useSettingsStore } from "../../store/settingsStore";
import { JerseySwatch } from "../branding/JerseySwatch";
import { TeamCrest } from "../branding/TeamCrest";
import { ProgressBar } from "../ui/ProgressBar";
import { SectionHeader } from "../ui/SectionHeader";
import { WarningCallout } from "../ui/WarningCallout";
import { DecisionEventCard } from "../hud/DecisionEventCard";
import { StoryArcCard } from "../hud/StoryArcCard";
import { TeamDynamicsPanel } from "../hud/TeamDynamicsPanel";
import { AssistantGmReportCard } from "../hud/AssistantGmReportCard";
import { SaveLoadPanel } from "./SaveLoadPanel";

export function GMOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const simulateInstantNextGame = useFranchiseStore((state) => state.simulateInstantNextGame);
  const simToEndRegularSeason = useFranchiseStore((state) => state.simToEndRegularSeason);
  const advanceSeasonPhase = useFranchiseStore((state) => state.advanceSeasonPhase);
  const simulateNextPlayoffDay = useFranchiseStore((state) => state.simulateNextPlayoffDay);
  const simulateCurrentPlayoffRound = useFranchiseStore((state) => state.simulateCurrentPlayoffRound);
  const simulateToPlayoffChampion = useFranchiseStore((state) => state.simulateToPlayoffChampion);
  const autoDraftUntilUserPick = useFranchiseStore((state) => state.autoDraftUntilUserPick);
  const autoCompleteDraft = useFranchiseStore((state) => state.autoCompleteDraft);
  const advanceFreeAgencyDay = useFranchiseStore((state) => state.advanceFreeAgencyDay);
  const completeFreeAgency = useFranchiseStore((state) => state.completeFreeAgency);
  const resolveDecisionEvent = useFranchiseStore((state) => state.resolveDecisionEvent);
  const dismissAssistantGmReport = useFranchiseStore((state) => state.dismissAssistantGmReport);
  const settings = useSettingsStore((state) => state.settings);
  const confirmPhaseAdvances = settings.confirmPhaseAdvances;
  const showPlaytestChecklist = settings.showPlaytestChecklist;
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  useEffect(() => {
    markChecklistItem("readInbox");
  }, [markChecklistItem]);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const opponent = upcomingOpponent(franchise);
  const playoffGame = getCurrentUserPlayoffGame(franchise);
  const userSchedule = franchise.league.schedule
    .filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id)
    .slice(Math.max(0, team.stats.gamesPlayed - 1), team.stats.gamesPlayed + 5);
  const mood = team.ownerPatience < 38 ? "Demanding" : team.ownerPatience < 62 ? "Concerned" : "Patient";
  const fan = team.fanConfidence < 42 ? "Falling" : team.fanConfidence < 66 ? "Stable" : "Rising";
  const phaseLabel = getPhaseLabel(franchise.seasonPhase);
  const checklist = getPhaseChecklist(franchise);
  const completedChecklist = checklist.filter((item) => item.complete).length;
  const dangerWarnings = getDangerWarnings(franchise);
  const rosterReport = validateRosterForGame(team);
  const activeDecisions = getActiveDecisionEvents(franchise);
  const urgentDecisions = activeDecisions.filter((event) => event.severity === "high" || event.severity === "critical");
  const currentStorylines = franchise.storyArcs.filter((arc) => arc.status === "active").slice(0, 4);
  const topAgentPressure = [...franchise.agents].sort((a, b) => b.publicPressure - a.publicPressure)[0];
  const recommendedMeeting = getTeamMeetingNeed(franchise) ?? activeDecisions.find((event) => event.locationRoom === "playerMeetings")?.headline ?? "No urgent meeting recommended.";
  const actionQueue = getMasterActionQueue(franchise);
  const urgentActionCount = getUrgentActionCount(franchise);
  const assistantReports = franchise.assistantGmReports.filter((report) => !report.dismissed).slice(0, 3);
  const tutorialSteps = getTutorialSteps(franchise);
  const tutorialCurrent = getCurrentTutorialStep(franchise);
  const tutorialComplete = tutorialSteps.filter((step) => step.completed).length;
  const achievementSummary = getAchievementSummary(franchise);
  const recentMilestones = getRecentMilestones(franchise, 3);
  const playtestIssues = validatePlaytestChecklists();
  const playtestChecklists = getPlaytestChecklists();
  const firstHourChecklist = getFirstHourChecklist(franchise);
  const afterFirstGameChecklist = getAfterFirstGameChecklist(franchise);
  const frictionSignals = detectUxFriction(franchise, franchise.localTelemetry, settings);
  const handoffRecommendation = frictionSignals[0] ? createFrictionRecommendation(frictionSignals[0]) : undefined;
  const confirmAndRun = (action: string, run: () => void) => {
    if (!confirmPhaseAdvances) {
      run();
      return;
    }
    const warnings = getDangerWarnings(franchise, action);
    const message = [getAdvancePreview(franchise, action), ...warnings].join("\n");
    if (warnings.length || action !== "safe") {
      if (!window.confirm(message)) return;
    }
    run();
  };

  return (
    <div className="room-stack">
      <section className="command-strip">
        <div className="brand-strip">
          <TeamCrest teamId={team.id} size={46} title={`${team.fullName} crest`} />
          <JerseySwatch teamId={team.id} kind="home" />
        </div>
        <div>
          <small>Current Phase</small>
          <strong>{phaseLabel}</strong>
        </div>
        <div>
          <small>Record</small>
          <strong>{recordLabel(team)}</strong>
        </div>
        <div>
          <small>Active Decisions</small>
          <strong>{activeDecisions.length}</strong>
        </div>
        <div>
          <small>Urgent Actions</small>
          <strong>{urgentActionCount}</strong>
        </div>
        <div>
          <small>Owner Mood</small>
          <strong>{mood}</strong>
        </div>
        <div>
          <small>Fan Confidence</small>
          <strong>{fan}</strong>
        </div>
        <button type="button" onClick={() => setActiveRoom("arena")} disabled={!opponent && !playoffGame}>
          Go to Arena
        </button>
        <button
          type="button"
          onClick={() => {
            markChecklistItem("simulateGame");
            void simulateInstantNextGame();
          }}
          disabled={!opponent && !playoffGame}
        >
          {playoffGame ? "Instant Sim Playoff Game" : "Instant Sim Next Game"}
        </button>
      </section>
      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <SectionHeader title="Guided Start" eyebrow="Tutorial" />
          {tutorialCurrent ? (
            <>
              <div className="profile-card">
                <strong>{tutorialCurrent.title}</strong>
                <span>{tutorialCurrent.body}</span>
                <small>{tutorialComplete}/{tutorialSteps.length} tutorial steps complete</small>
              </div>
              <ProgressBar value={tutorialComplete} max={tutorialSteps.length} label={`${tutorialComplete}/${tutorialSteps.length} steps`} />
              <div className="button-row">
                {tutorialCurrent.roomId && <button type="button" onClick={() => setActiveRoom(tutorialCurrent.roomId)}>Open target room</button>}
              </div>
            </>
          ) : (
            <p className="empty-state">Tutorial complete. Reset it from Settings any time.</p>
          )}
          <div className="dynasty-checklist dynasty-checklist--inline">
            {firstHourChecklist.steps.slice(0, 5).map((item) => (
              <span className={item.completed ? "is-complete" : ""} key={item.id}>
                <b aria-hidden="true">{item.completed ? "OK" : ""}</b>
                {item.label}
              </span>
            ))}
          </div>
          {afterFirstGameChecklist.available && (
            <p className="muted">After first game: {afterFirstGameChecklist.steps.map((item) => item.label).join(" | ")}</p>
          )}
        </section>
        {handoffRecommendation && (
          <section className="panel-section panel-section--guidance">
            <SectionHeader title="Need a Hand?" eyebrow="UX guidance" />
            <article className="profile-card">
              <strong>{handoffRecommendation.title}</strong>
              <span>{handoffRecommendation.body}</span>
              <small>{handoffRecommendation.actionLabel}</small>
            </article>
            <div className="button-row">
              <button type="button" onClick={() => handoffRecommendation.targetRoomId && setActiveRoom(handoffRecommendation.targetRoomId)}>
                Open suggested room
              </button>
            </div>
          </section>
        )}
        <section className="panel-section">
          <SectionHeader title="Franchise Moments" eyebrow="Release Candidate" />
          <div className="season-pulse">
            <span>Achievements <strong>{achievementSummary.unlocked}/{achievementSummary.total}</strong></span>
            <span>Completion <strong>{achievementSummary.percent}%</strong></span>
            <span>Milestones <strong>{franchise.milestones.length}</strong></span>
          </div>
          <div className="asset-list asset-list--compact">
            {recentMilestones.length ? recentMilestones.map((milestone) => (
              <article key={milestone.id}>
                <strong>{milestone.headline}</strong>
                <span>{milestone.date} | {milestone.body}</span>
              </article>
            )) : <p className="empty-state">Your first win, trade, draft pick, or season transition will appear here.</p>}
          </div>
        </section>
        <section className="panel-section">
          <SectionHeader title="Master Action Queue" eyebrow="Assistant GM" />
          <div className="asset-list asset-list--compact">
            {actionQueue.slice(0, 7).map((item) => (
              <article key={item.id} className={`queue-item queue-item--${item.priority}`}>
                <small>{item.priority}{item.blocking ? " | blocking" : ""} | {item.category}</small>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
                <button type="button" onClick={() => setActiveRoom(item.roomId)}>
                  Open room
                </button>
              </article>
            ))}
          </div>
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("arena")} disabled={!opponent && !playoffGame}>Go to next game</button>
            <button type="button" onClick={() => activeDecisions[0] && setActiveRoom(activeDecisions[0].locationRoom ?? "gm")} disabled={!activeDecisions.length}>Resolve urgent decision</button>
            <button type="button" onClick={() => setActiveRoom("roster")} disabled={!rosterReport.errors.length}>Fix roster</button>
            <button type="button" onClick={() => setActiveRoom("coach")}>Review lines</button>
            <button type="button" onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>Advance phase</button>
          </div>
        </section>
        <section className="panel-section">
          <SectionHeader title="GM Profile & Pressure" eyebrow="Phase 7" />
          <div className="profile-card">
            <strong>{franchise.gmProfile.displayName}</strong>
            <span>{getGmProfileSummary(franchise.gmProfile)}</span>
            <small>
              {getGameModeLabel(franchise.gmProfile.gameMode)} | {getDifficultyLabel(franchise.gmProfile.difficulty)} | {franchise.gmProfile.storyFrequency} stories
            </small>
          </div>
          <div className="season-pulse">
            <span>Owner trust <strong>{franchise.teamDynamics[team.id]?.ownerTrust ?? 0}/100</strong></span>
            <span>Chemistry <strong>{franchise.teamDynamics[team.id]?.chemistry ?? 0}/100</strong></span>
            <span>Media pressure <strong>{franchise.mediaState.pressure}/100</strong></span>
            <span>Assistant help <strong>{franchise.difficultyTuning.assistantGmHelpLevel}</strong></span>
            {franchise.customLeagueName && <span>World <strong>{franchise.customLeagueName}</strong></span>}
            {franchise.dataPackMetadata?.scenarioName && <span>Scenario <strong>{franchise.dataPackMetadata.scenarioName}</strong></span>}
          </div>
          <p className="muted">{createMediaNarrative(franchise)}</p>
        </section>
      </div>
      {assistantReports.length > 0 && (
        <section className="panel-section">
          <SectionHeader title="Assistant GM Reports" eyebrow="Guidance" />
          <div className="assistant-report-grid">
            {assistantReports.map((report) => (
              <AssistantGmReportCard key={report.id} report={report} onGoTo={setActiveRoom} onDismiss={dismissAssistantGmReport} />
            ))}
          </div>
        </section>
      )}
      {showPlaytestChecklist && (
        <section className="panel-section">
          <SectionHeader title="Beta Playtest Checklist" eyebrow="Phase 11" />
          {playtestIssues.length > 0 && (
            <WarningCallout title="Checklist Content Issue" tone="warning">
              {playtestIssues.slice(0, 3).map((issue) => <p key={issue}>{issue}</p>)}
            </WarningCallout>
          )}
          <div className="asset-list asset-list--compact">
            {playtestChecklists.slice(0, 4).map((checklist) => (
              <article key={checklist.id}>
                <strong>{checklist.title}</strong>
                <span>{checklist.steps.map((step) => step.label).join(" | ")}</span>
              </article>
            ))}
          </div>
        </section>
      )}
      {(activeDecisions.length > 0 || currentStorylines.length > 0) && (
        <div className="room-grid room-grid--two">
          <section className="panel-section">
            <SectionHeader title="Living Organization Dashboard" eyebrow="Phase 6" />
            {urgentDecisions.length > 0 && (
              <WarningCallout title="Urgent Issues" tone={urgentDecisions.some((event) => event.severity === "critical") ? "danger" : "warning"}>
                {urgentDecisions.slice(0, 3).map((event) => (
                  <p key={event.id}>{event.headline}</p>
                ))}
              </WarningCallout>
            )}
            <div className="news-list">
              {activeDecisions.slice(0, 4).map((event) => (
                <DecisionEventCard key={event.id} event={event} onGoTo={setActiveRoom} onResolve={resolveDecisionEvent} compact={event.severity === "low"} />
              ))}
            </div>
          </section>
          <section className="panel-section">
            <h3>Current Storylines</h3>
            <div className="asset-list">
              {currentStorylines.length ? currentStorylines.map((arc) => <StoryArcCard key={arc.id} arc={arc} />) : <p className="empty-state">No active story arcs yet.</p>}
            </div>
            <h4>Media / Fan / Agent Pulse</h4>
            <p className="muted">{createMediaNarrative(franchise)}</p>
            <p className="muted">{createFanPulse(franchise)}</p>
            <p className="muted">Agent pressure: {topAgentPressure ? `${topAgentPressure.displayName} is ${getAgentPressureLevel(topAgentPressure)}.` : "No agents loaded."}</p>
            <p className="muted">Recommended meeting: {recommendedMeeting}</p>
            <div className="button-row">
              <button type="button" onClick={() => setActiveRoom("press")}>Press Room</button>
              <button type="button" onClick={() => setActiveRoom("ownerSuite")}>Owner Suite</button>
              <button type="button" onClick={() => setActiveRoom("agents")}>Agent Desk</button>
              <button type="button" onClick={() => setActiveRoom("playerMeetings")}>Player Meetings</button>
            </div>
          </section>
        </div>
      )}
      <TeamDynamicsPanel franchise={franchise} />
      <section className="panel-section">
        <SectionHeader title="Calendar Command Center" eyebrow={phaseLabel} />
        <div className="season-pulse">
          <span>Season <strong>{franchise.league.seasonYear}</strong></span>
          <span>Date <strong>{franchise.league.currentDate}</strong></span>
          <span>Next action <strong>{getRecommendedNextAction(franchise)}</strong></span>
          <span>Owner confidence <strong>{ownerMoodLabel(franchise.ownerState)} | {franchise.ownerState.jobSecurity}/100</strong></span>
          <span>Roster <strong>{rosterReport.errors.length ? "Needs Roster Office" : "Ready"}</strong></span>
        </div>
        <article className="phase-command-card">
          <span className="phase-badge">{phaseLabel}</span>
          <p>{getPhaseDescription(franchise)}</p>
          <strong>Recommended: {getRecommendedNextAction(franchise)}</strong>
          {rosterReport.errors.length > 0 && <strong>Roster Office: {rosterReport.errors[0]}</strong>}
          <small>Advance preview: {getAdvancePreview(franchise)}</small>
          <ProgressBar value={completedChecklist} max={Math.max(1, checklist.length)} label={`${completedChecklist}/${checklist.length} phase checks`} />
        </article>
        {dangerWarnings.length > 0 && (
          <WarningCallout title="Advance Warning">
            {dangerWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </WarningCallout>
        )}
        <div className="dynasty-checklist dynasty-checklist--inline">
          {checklist.map((item) => (
            <span className={item.complete ? "is-complete" : ""} key={item.id}>
              <b aria-hidden="true">{item.complete ? "OK" : ""}</b>
              {item.label}
              {item.optional ? " (optional)" : ""}
            </span>
          ))}
        </div>
        {franchise.seasonPhase === "regularSeason" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("arena")} disabled={!opponent}>
              Sim to next user game
            </button>
            <button type="button" onClick={() => window.confirm("Sim the rest of the regular season?") && simToEndRegularSeason()}>
              Sim to end of regular season
            </button>
            <button type="button" disabled={!franchise.league.completed} onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>
              Start playoffs
            </button>
          </div>
        )}
        {franchise.seasonPhase === "playoffs" && (
          <>
            <p className="muted">{describePlayoffResult(franchise)}</p>
            <div className="button-row">
              <button type="button" onClick={() => setActiveRoom("arena")} disabled={!playoffGame}>
                User playoff game
              </button>
              <button type="button" onClick={simulateNextPlayoffDay}>Sim next playoff game/day</button>
              <button type="button" onClick={simulateCurrentPlayoffRound}>Sim current round</button>
              <button type="button" onClick={simulateToPlayoffChampion}>Sim to champion</button>
              <button type="button" disabled={!franchise.playoffState?.completed} onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>
                Advance to season review
              </button>
            </div>
          </>
        )}
        {["seasonReview", "retirements", "draftLottery", "staffHiring", "trainingCamp", "preseason"].includes(franchise.seasonPhase) && (
          <div className="button-row">
            <button type="button" onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>
              Advance to next major phase
            </button>
          </div>
        )}
        {franchise.seasonPhase === "draft" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("scouting")}>Open Draft Room</button>
            <button type="button" onClick={autoDraftUntilUserPick}>Auto-draft until user pick</button>
            <button type="button" onClick={() => window.confirm("Auto-complete the rest of the draft?") && autoCompleteDraft()}>
              Auto-complete draft
            </button>
            <button type="button" disabled={!franchise.offseasonState?.draftState?.completed} onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>
              Advance to re-signing
            </button>
          </div>
        )}
        {franchise.seasonPhase === "reSigning" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("contracts")}>Open Re-Signing Board</button>
            <button type="button" onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>
              Advance to free agency
            </button>
          </div>
        )}
        {franchise.seasonPhase === "freeAgency" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("freeAgency")}>Open Free Agency Office</button>
            <button type="button" onClick={() => confirmAndRun("day", advanceFreeAgencyDay)}>Advance one free agency day</button>
            <button type="button" onClick={() => window.confirm("Resolve the rest of free agency?") && completeFreeAgency()}>Auto-resolve free agency</button>
            <button type="button" disabled={!franchise.freeAgencyState?.completed} onClick={() => confirmAndRun("advance", advanceSeasonPhase)}>Advance to staff hiring</button>
          </div>
        )}
        <h4>Owner Goals</h4>
        <div className="asset-list asset-list--compact">
          {franchise.ownerState.seasonGoals.map((goal) => (
            <article key={goal.id}>
              <strong>{goal.label}</strong>
              <span>{goal.status} | {goal.importance} importance | progress {Math.round(goal.progress)} / {goal.target}</span>
            </article>
          ))}
        </div>
      </section>
      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Inbox / News</h3>
          <div className="news-list">
            {franchise.inbox.map((item) => (
              <article className={`news-item news-item--${item.severity}`} key={item.id}>
                <small>{item.date} | {item.type} | {item.severity} priority</small>
                <strong>{item.headline}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel-section">
          <h3>Calendar & Recent Results</h3>
          <div className="calendar-card">
            <strong>{franchise.league.currentDate}</strong>
            <span>Regular season day {franchise.league.currentDayIndex + 1} of {ruleSet.gamesPerTeam}</span>
          </div>
          <h4>Schedule</h4>
          <div className="schedule-list">
            {userSchedule.map((game) => {
              const home = franchise.league.teams.find((candidate) => candidate.id === game.homeTeamId)!;
              const away = franchise.league.teams.find((candidate) => candidate.id === game.awayTeamId)!;
              const matchup = `${away.abbreviation} @ ${home.abbreviation}`;
              return (
                <article className={game.played ? "schedule-row schedule-row--played" : "schedule-row"} key={game.id}>
                  <span>{game.date}</span>
                  <strong>{matchup}</strong>
                  <small>
                    {game.played && game.result
                      ? `${game.result.awayGoals}-${game.result.homeGoals}${game.result.overtime ? " OT" : ""}`
                      : game.dayIndex === franchise.league.currentDayIndex
                        ? "Next game"
                        : "Upcoming"}
                  </small>
                </article>
              );
            })}
          </div>
          <h4>Recent League Results</h4>
          {franchise.league.recentResults.length ? (
            <ul className="compact-list">
              {franchise.league.recentResults.slice(0, 8).map((result) => (
                <li key={result}>{result}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No results yet. The room is quiet before puck drop.</p>
          )}
          <h4>Front Office Expansion</h4>
          <p className="muted">Contracts, trades, scouting, development, free agency, staff, and dynasty history now feed the same inbox and local save.</p>
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("contracts")}>Cap Office</button>
            <button type="button" onClick={() => setActiveRoom("roster")}>Roster Office</button>
            <button type="button" onClick={() => setActiveRoom("trades")}>Trade Room</button>
            <button type="button" onClick={() => setActiveRoom("scouting")}>Scouting</button>
            <button type="button" onClick={() => setActiveRoom("development")}>Development</button>
            <button type="button" onClick={() => setActiveRoom("freeAgency")}>Free Agency</button>
            <button type="button" onClick={() => setActiveRoom("staff")}>Staff</button>
          </div>
          <h4>Transaction Log</h4>
          {franchise.transactionLog.length ? (
            <div className="asset-list asset-list--compact">
              {franchise.transactionLog.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <strong>{item.headline}</strong>
                  <span>
                    {item.date} | {item.type}
                  </span>
                  <small>{item.details}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No front-office transactions logged yet.</p>
          )}
          <h4>Local Save</h4>
          <SaveLoadPanel />
        </section>
      </div>
    </div>
  );
}
