import { useMemo, useState } from "react";
import { generateBalanceReport, type BalanceReport } from "../../game/systems/balanceReport";
import { createDefaultDataPack, createDataPackFromCurrentLeague, createDataPackSummary, createLeagueRulesPreset, repairDataPack, validateDataPack } from "../../game/systems/dataPacks";
import { createCustomFranchiseFromDataPack } from "../../game/generators/generateCustomLeague";
import { getBuiltInScenarios, createScenarioDataPack, validateBuiltInScenarios } from "../../game/systems/scenarios";
import { runOwnerGoalBalanceSample, type OwnerGoalBalanceSample } from "../../game/systems/ownerBalance";
import { runReSigningBalanceSample, type ReSigningBalanceSample } from "../../game/systems/reSigningBalance";
import { runDynastyPlaytest, type PlaytestReport } from "../../game/systems/dynastyPlaytest";
import { validateDynastyInvariants } from "../../game/systems/dynastyInvariants";
import { getActiveDecisionEvents } from "../../game/systems/decisionEvents";
import { getTeamDynamics } from "../../game/systems/relationships";
import { NARRATIVE_TEMPLATES } from "../../game/content/narrativeTemplates";
import { getMasterActionQueue, getRoomBadges } from "../../game/systems/actionQueue";
import { generateAssistantGmReport } from "../../game/systems/assistantGm";
import { createDifficultyTuning } from "../../game/systems/difficulty";
import { getEventCadenceTuning } from "../../game/systems/livingOpsTuning";
import { createRuleSetForTeamCount, getRuleSetDescription } from "../../game/systems/leagueRules";
import { checkBundleBudgetFromManifest, summarizeRuntimePerformanceSettings } from "../../game/systems/performanceBudget";
import { summarizeRuntimeHealth } from "../../game/systems/runtimeHealth";
import { getVersionSummary } from "../../game/systems/version";
import {
  createDecisionEventFromTemplate,
  getTemplateContextFromFranchise,
  selectNarrativeTemplate,
  validateNarrativeTemplates
} from "../../game/systems/narrativeTemplateEngine";
import { SeededRng } from "../../game/rng";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useRuntimeHealthStore } from "../../store/runtimeHealthStore";
import { useSettingsStore } from "../../store/settingsStore";
import { Button } from "../ui/Button";
import { WarningCallout } from "../ui/WarningCallout";
import type { DataPack, LeagueSize } from "../../game/types";

export function DevToolsPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const generateSampleDecisionEvent = useFranchiseStore((state) => state.generateSampleDecisionEvent);
  const autoResolveActiveDecisionEvents = useFranchiseStore((state) => state.autoResolveActiveDecisionEvents);
  const settings = useSettingsStore((state) => state.settings);
  const runtimeHealth = useRuntimeHealthStore((state) => state.runtimeHealth);
  const clearRuntimeEvents = useRuntimeHealthStore((state) => state.clearRuntimeEvents);
  const [playtest, setPlaytest] = useState<PlaytestReport | undefined>();
  const [balance, setBalance] = useState<BalanceReport | undefined>();
  const [reSigning, setReSigning] = useState<ReSigningBalanceSample[] | undefined>();
  const [ownerBalance, setOwnerBalance] = useState<OwnerGoalBalanceSample | undefined>();
  const [dataPackReport, setDataPackReport] = useState<string>("");
  const invariant = useMemo(() => (franchise ? validateDynastyInvariants(franchise) : undefined), [franchise]);
  const dynamics = franchise ? getTeamDynamics(franchise, franchise.selectedTeamId) : undefined;
  const templateIssues = useMemo(() => validateNarrativeTemplates(NARRATIVE_TEMPLATES), []);
  const assistantPreview = useMemo(() => (franchise ? generateAssistantGmReport(franchise, { type: "weekly" }) : undefined), [franchise]);
  const actionQueue = useMemo(() => (franchise ? getMasterActionQueue(franchise) : []), [franchise]);
  const roomBadgeCount = useMemo(() => (franchise ? Object.values(getRoomBadges(franchise)).reduce((sum, badges) => sum + badges.length, 0) : 0), [franchise]);
  const cadence = useMemo(() => (franchise ? getEventCadenceTuning(franchise) : undefined), [franchise]);
  const samplePressEvent = useMemo(() => {
    if (!franchise) return undefined;
    const rng = new SeededRng("dev-sample-press");
    const context = getTemplateContextFromFranchise(franchise, { category: "press", tags: ["press"] });
    return createDecisionEventFromTemplate(selectNarrativeTemplate(NARRATIVE_TEMPLATES, context, rng), context, rng);
  }, [franchise]);
  const builtInScenarioIssues = useMemo(() => validateBuiltInScenarios(), []);
  const version = useMemo(() => getVersionSummary(), []);
  const performanceSummary = useMemo(() => summarizeRuntimePerformanceSettings(settings), [settings]);
  const bundleReport = useMemo(
    () =>
      checkBundleBudgetFromManifest({
        "assets/index.js": { file: "assets/index.js", size: 210 * 1024 },
        "assets/three-r3f.js": { file: "assets/three-r3f.js", size: 997 * 1024 },
        "assets/DataPackLibrary.js": { file: "assets/DataPackLibrary.js", size: 180 * 1024 }
      }),
    []
  );

  if (!franchise) return null;

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <div>
          <small>Release</small>
          <strong>{version.appVersion}</strong>
        </div>
        <div>
          <small>Phase</small>
          <strong>{version.buildPhase}</strong>
        </div>
        <div>
          <small>Invariant Status</small>
          <strong>{invariant?.valid ? "Passing" : "Needs attention"}</strong>
        </div>
        <div>
          <small>Warnings</small>
          <strong>{invariant?.warnings.length ?? 0}</strong>
        </div>
        <div>
          <small>Errors</small>
          <strong>{invariant?.errors.length ?? 0}</strong>
        </div>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-one-season", 1, franchise.selectedTeamId))}>Run 1-season dry run</Button>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-three-season", 3, franchise.selectedTeamId))}>Run 3-season dry run</Button>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-five-season-roster", 5, franchise.selectedTeamId))}>Run 5-season roster stress</Button>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-five-season-story", 5, franchise.selectedTeamId))}>Run 5-season story stress</Button>
        <Button onClick={() => setPlaytest(runDynastyPlaytest("dev-hardcore-dramatic", 5, franchise.selectedTeamId, { difficulty: "hardcore", storyFrequency: "dramatic", gameMode: "pressureCooker" }))}>Hardcore dramatic sample</Button>
        <Button onClick={() => setBalance(generateBalanceReport(["dev-a", "dev-b"], 1))}>Run balance report</Button>
        <Button onClick={() => setReSigning(runReSigningBalanceSample(["dev-rs-a", "dev-rs-b"]))}>Re-signing sample</Button>
        <Button onClick={() => setOwnerBalance(runOwnerGoalBalanceSample(["dev-o-a", "dev-o-b", "dev-o-c"]))}>Owner sample</Button>
        <Button onClick={clearRuntimeEvents}>Clear runtime log</Button>
        <Button onClick={() => generateSampleDecisionEvent("press")}>Generate sample event</Button>
        <Button onClick={autoResolveActiveDecisionEvents}>Auto-resolve active events</Button>
        <Button onClick={() => {
          const pack = createDefaultDataPack();
          setDataPackReport(createDataPackSummary(pack));
        }}>Validate default pack</Button>
        <Button onClick={() => {
          const pack = createDataPackFromCurrentLeague(franchise);
          setDataPackReport(createDataPackSummary(pack));
        }}>Export current pack summary</Button>
        <Button onClick={() => {
          const pack = createDefaultDataPack();
          const custom = createCustomFranchiseFromDataPack(pack, pack.leagueTemplate?.teams[0]?.id, undefined, { seed: "dev-custom-dry-run" });
          setDataPackReport(`Custom dry run: ${custom.customLeagueName} | teams=${custom.league.teams.length} | errors=${validateDynastyInvariants(custom).errors.length}`);
        }}>Custom league dry run</Button>
        <Button onClick={() => {
          const sizes: LeagueSize[] = [8, 10, 12, 16];
          const reports = sizes.map((size) => {
            const pack = createDevRulePack(size);
            const custom = createCustomFranchiseFromDataPack(pack, pack.leagueTemplate?.teams[0]?.id, undefined, { seed: `dev-phase10-${size}` });
            return `${size}: ${getRuleSetDescription(custom.league.ruleSet)} | errors=${validateDynastyInvariants(custom).errors.length}`;
          });
          setDataPackReport(`Custom rule matrix | ${reports.join(" / ")}`);
        }}>Custom rules matrix</Button>
        <Button onClick={() => {
          const scenario = getBuiltInScenarios().find((item) => item.id === "cap-crunch") ?? getBuiltInScenarios()[0];
          const pack = createScenarioDataPack(scenario, createDefaultDataPack());
          const custom = createCustomFranchiseFromDataPack(pack, pack.leagueTemplate?.teams[0]?.id, undefined, { seed: "dev-scenario-dry-run" });
          setDataPackReport(`Scenario dry run: ${scenario.name} | events=${custom.decisionEvents.length} | cap=${custom.league.teams[0].capCeiling}`);
        }}>Scenario dry run</Button>
      </section>

      <section className="panel-section">
        <h3>Phase 11 Runtime, Bundle, And Performance</h3>
        <div className="season-pulse">
          <span>Runtime <strong>{runtimeHealth.status}</strong></span>
          <span>Health events <strong>{runtimeHealth.events.length}</strong></span>
          <span>Total JS budget <strong>{bundleReport.totalStatus}</strong></span>
          <span>Known exceptions <strong>{bundleReport.knownExceptions.length}</strong></span>
          <span>Low-spec recommended <strong>{performanceSummary.lowSpecRecommended ? "Yes" : "No"}</strong></span>
        </div>
        <p className="muted">{summarizeRuntimeHealth(runtimeHealth)}</p>
        <ul className="compact-list">
          {bundleReport.knownExceptions.map((item) => <li key={item}>{item}</li>)}
          {performanceSummary.recommendedLowSpecSettings.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      {invariant && !invariant.valid && (
        <WarningCallout title="Invariant Errors" tone="danger">
          {invariant.errors.slice(0, 8).map((item) => (
            <p key={`${item.code}-${item.path}`}>{item.message}</p>
          ))}
        </WarningCallout>
      )}

      <section className="panel-section">
        <h3>Current Invariant Report</h3>
        <div className="season-pulse">
          <span>Teams <strong>{invariant?.summary.teams}</strong></span>
          <span>Players <strong>{invariant?.summary.activePlayers}</strong></span>
          <span>Draft picks <strong>{invariant?.summary.draftPicks}</strong></span>
          <span>Prospects <strong>{invariant?.summary.prospects}</strong></span>
          <span>Active events <strong>{getActiveDecisionEvents(franchise).length}</strong></span>
          <span>Story arcs <strong>{franchise.storyArcs.length}</strong></span>
        </div>
      </section>

      <section className="panel-section">
        <h3>Living Ops Inspectors</h3>
        <div className="season-pulse">
          <span>Relationships <strong>{Object.keys(franchise.playerRelationships).length}</strong></span>
          <span>Agents <strong>{franchise.agents.length}</strong></span>
          <span>Chemistry <strong>{dynamics?.chemistry ?? 0}/100</strong></span>
          <span>Media <strong>{franchise.mediaState.pressure}/100</strong></span>
          <span>Fans <strong>{dynamics?.fanSentiment ?? 0}/100</strong></span>
          <span>Owner trust <strong>{dynamics?.ownerTrust ?? 0}/100</strong></span>
        </div>
        <div className="asset-list asset-list--compact">
          {franchise.decisionEvents.slice(0, 8).map((event) => (
            <article key={event.id}>
              <strong>{event.headline}</strong>
              <span>{event.type} | {event.status} | {event.severity} | {event.locationRoom}</span>
            </article>
          ))}
        </div>
        <div className="asset-list asset-list--compact">
          {franchise.storyArcs.slice(0, 8).map((arc) => (
            <article key={arc.id}>
              <strong>{arc.headline}</strong>
              <span>{arc.type} | {arc.status} | intensity {arc.intensity} | progress {arc.progress}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>Phase 7 Content & Guidance Tools</h3>
        <div className="season-pulse">
          <span>Templates <strong>{NARRATIVE_TEMPLATES.length}</strong></span>
          <span>Template issues <strong>{templateIssues.length}</strong></span>
          <span>Cadence chance <strong>{cadence ? Math.round(cadence.decisionChance * 100) : 0}%</strong></span>
          <span>Max active <strong>{cadence?.maxActiveEvents ?? 0}</strong></span>
          <span>Assistant recs <strong>{assistantPreview?.recommendations.length ?? 0}</strong></span>
          <span>Action queue <strong>{actionQueue.length}</strong></span>
          <span>Room badges <strong>{roomBadgeCount}</strong></span>
        </div>
        <div className="season-pulse">
          {(["relaxed", "standard", "demanding", "hardcore"] as const).map((difficulty) => {
            const tuning = createDifficultyTuning(difficulty, franchise.gmProfile.gameMode, franchise.gmProfile.storyFrequency);
            return (
              <span key={difficulty}>
                {difficulty} <strong>owner {tuning.ownerPatienceMultiplier} | media {tuning.mediaPressureMultiplier} | story {tuning.storyEventMultiplier}</strong>
              </span>
            );
          })}
        </div>
        {samplePressEvent && (
          <article className="news-item news-item--medium">
            <small>Sample press event</small>
            <strong>{samplePressEvent.headline}</strong>
            <p>{samplePressEvent.body}</p>
          </article>
        )}
        {assistantPreview && (
          <div className="asset-list asset-list--compact">
            {assistantPreview.recommendations.slice(0, 5).map((recommendation) => (
              <article key={recommendation.id}>
                <strong>{recommendation.title}</strong>
                <span>{recommendation.priority} | {recommendation.targetRoomId} | {recommendation.body}</span>
              </article>
            ))}
          </div>
        )}
        {templateIssues.length > 0 && (
          <WarningCallout title="Template Validator">
            {templateIssues.slice(0, 8).map((issue) => (
              <p key={issue}>{issue}</p>
            ))}
          </WarningCallout>
        )}
      </section>

      <section className="panel-section">
        <h3>Phase 9 Data Pack Tools</h3>
        <div className="season-pulse">
          <span>Default pack <strong>{validateDataPack(createDefaultDataPack()).valid ? "valid" : "invalid"}</strong></span>
          <span>Built-in scenarios <strong>{getBuiltInScenarios().length}</strong></span>
          <span>Scenario issues <strong>{builtInScenarioIssues.length}</strong></span>
        </div>
        {dataPackReport && <p className="muted">{dataPackReport}</p>}
        {builtInScenarioIssues.length > 0 && (
          <WarningCallout title="Scenario Validator">
            {builtInScenarioIssues.slice(0, 8).map((issue) => <p key={issue}>{issue}</p>)}
          </WarningCallout>
        )}
      </section>

      {playtest && (
        <section className="panel-section">
          <h3>Playtest Report</h3>
          <div className="season-pulse">
            <span>Seed <strong>{playtest.seed}</strong></span>
            <span>Seasons <strong>{playtest.seasonsCompleted}</strong></span>
            <span>Rules <strong>{playtest.playoffFormatUsed}</strong></span>
            <span>Schedule warnings <strong>{playtest.customScheduleWarnings.length}</strong></span>
            <span>Warnings <strong>{playtest.warnings.length}</strong></span>
            <span>Errors <strong>{playtest.errors.length}</strong></span>
          </div>
          <p className={playtest.errors.length ? "error-text" : "muted"}>{playtest.errors[0] ?? "Dry run completed without fatal invariant errors."}</p>
          <div className="season-pulse">
            <span>Invalid rosters <strong>{playtest.invalidGameRosters[playtest.invalidGameRosters.length - 1]?.teams ?? 0}</strong></span>
            <span>Replacements <strong>{playtest.emergencyReplacementCounts[playtest.emergencyReplacementCounts.length - 1]?.count ?? 0}</strong></span>
            <span>Affiliate moves <strong>{playtest.affiliatePromotions[playtest.affiliatePromotions.length - 1]?.count ?? 0}</strong></span>
            <span>Cap-over teams <strong>{playtest.capOverTeams[playtest.capOverTeams.length - 1]?.teams ?? 0}</strong></span>
            <span>Story events <strong>{playtest.livingOps.eventsGenerated}</strong></span>
            <span>Story arcs <strong>{playtest.livingOps.storyArcsStarted}/{playtest.livingOps.storyArcsResolved}</strong></span>
          </div>
        </section>
      )}

      {balance && (
        <section className="panel-section">
          <h3>Balance Report</h3>
          <div className="season-pulse">
            <span>Goals/game <strong>{balance.leagueScoring.averageGoalsPerGame}</strong></span>
            <span>Shots/game <strong>{balance.leagueScoring.averageShotsPerGame}</strong></span>
            <span>PP% <strong>{Math.round(balance.leagueScoring.powerPlayConversion * 100)}%</strong></span>
            <span>FA signing rate <strong>{Math.round(balance.rosterEconomy.freeAgentSigningRate * 100)}%</strong></span>
          </div>
          <ul className="compact-list">
            {balance.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {reSigning && (
        <section className="panel-section">
          <h3>Re-Signing Acceptance Report</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Role</th><th>Cap</th><th>Weak</th><th>Fair</th><th>Strong</th><th>RFA</th><th>UFA</th></tr></thead>
              <tbody>
                {reSigning.map((row) => (
                  <tr key={`${row.role}-${row.capState}`}>
                    <td>{row.role}</td>
                    <td>{row.capState}</td>
                    <td>{Math.round(row.weakAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.fairAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.strongAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.rfaAcceptanceRate * 100)}%</td>
                    <td>{Math.round(row.ufaAcceptanceRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ownerBalance && (
        <section className="panel-section">
          <h3>Owner Goal Balance</h3>
          <div className="season-pulse">
            <span>Completion <strong>{Math.round(ownerBalance.completionRate * 100)}%</strong></span>
            <span>Security delta <strong>{ownerBalance.averageSecurityDelta}</strong></span>
            <span>Rebuild goals <strong>{ownerBalance.rebuildingGoalMix.join(", ")}</strong></span>
            <span>Contender goals <strong>{ownerBalance.contenderGoalMix.join(", ")}</strong></span>
          </div>
        </section>
      )}
    </div>
  );
}

function createDevRulePack(size: LeagueSize): DataPack {
  const pack = createDefaultDataPack();
  const rules = createRuleSetForTeamCount(size);
  return repairDataPack({
    ...pack,
    id: `dev-rule-pack-${size}`,
    name: `${size}-Team Dev Rule Pack`,
    leagueTemplate: {
      ...pack.leagueTemplate!,
      id: `dev-league-${size}`,
      name: `${size}-Team Dev League`,
      description: `Dev-only ${size}-team fictional rule-set smoke pack.`,
      rules,
      teamCount: rules.teamCount,
      scheduleLength: rules.gamesPerTeam,
      playoffTeamCount: rules.playoffTeamCount,
      playoffSeriesLength: rules.playoffSeriesLength,
      draftRounds: rules.draftRounds,
      capCeiling: rules.capCeiling,
      capFloor: rules.capFloor,
      teams: pack.leagueTemplate!.teams.slice(0, size),
      rulesPreset: createLeagueRulesPreset(`dev-${size}`, `${size}-Team Dev`, size)
    }
  }).pack;
}
