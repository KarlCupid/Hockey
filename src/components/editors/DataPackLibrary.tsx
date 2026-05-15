import { useMemo, useState } from "react";
import type { CustomPlayerDefinition, DataPack, LeagueRuleSet, LeagueSize, PlayoffFormat, PlayoffSeriesFormat, ScheduleFormat } from "../../game/types";
import { generateDraftClass } from "../../game/generators/generateDraftClass";
import { createDataPackFromCurrentLeague, createDefaultDataPack, exportDataPackJson, repairDataPack, validateDataPack } from "../../game/systems/dataPacks";
import {
  createRuleSetForTeamCount,
  getSupportedPlayoffFormats,
  getSupportedScheduleFormats,
  normalizeLeagueRuleSet,
  validateLeagueRuleSet
} from "../../game/systems/leagueRules";
import { getBuiltInScenarios, createScenarioDataPack } from "../../game/systems/scenarios";
import { useDataPackStore } from "../../store/dataPackStore";
import type { FranchiseState } from "../../game/types";
import { Button } from "../ui/Button";
import { Tabs, type TabItem } from "../ui/Tabs";
import { WarningCallout } from "../ui/WarningCallout";
import { createDefaultEditorTeam, TeamCreator } from "./TeamCreator";
import { RosterEditor, autoGenerateCustomRoster } from "./RosterEditor";
import { DraftClassEditor, autoBalanceDraftClass, createDraftClassPack } from "./DraftClassEditor";

type LabTab = "library" | "rules" | "teams" | "rosters" | "draft" | "scenarios" | "import";

const LAB_TABS: TabItem<LabTab>[] = [
  { id: "library", label: "Library" },
  { id: "rules", label: "Rules" },
  { id: "teams", label: "Teams" },
  { id: "rosters", label: "Rosters" },
  { id: "draft", label: "Draft Class" },
  { id: "scenarios", label: "Scenarios" },
  { id: "import", label: "Import / Export" }
];

const LEAGUE_SIZES: LeagueSize[] = [8, 10, 12, 16];
const SERIES_FORMATS: PlayoffSeriesFormat[] = ["singleGame", "bestOf3", "bestOf5", "bestOf7"];

export function updatePackRuleSet(pack: DataPack, patch: Partial<LeagueRuleSet>): DataPack {
  const template = pack.leagueTemplate ?? createDefaultDataPack().leagueTemplate!;
  const current = normalizeLeagueRuleSet(template.rules ?? template);
  const teamCountChanged = Boolean(patch.teamCount && patch.teamCount !== current.teamCount);
  const baseForTeamCount = createRuleSetForTeamCount(patch.teamCount ?? current.teamCount);
  const scheduleFormatChanged = Boolean(patch.scheduleFormat && patch.scheduleFormat !== current.scheduleFormat);
  const draftScaleChanged = Boolean(patch.teamCount || patch.draftRounds);
  const normalized = normalizeLeagueRuleSet({
    ...current,
    ...patch,
    playoffFormat: teamCountChanged && patch.playoffFormat === undefined ? baseForTeamCount.playoffFormat : patch.playoffFormat ?? current.playoffFormat,
    scheduleFormat: teamCountChanged && patch.scheduleFormat === undefined ? baseForTeamCount.scheduleFormat : patch.scheduleFormat ?? current.scheduleFormat,
    gamesPerTeam: teamCountChanged || scheduleFormatChanged ? 0 : patch.gamesPerTeam ?? current.gamesPerTeam,
    draftRounds: teamCountChanged && patch.draftRounds === undefined ? baseForTeamCount.draftRounds : patch.draftRounds ?? current.draftRounds,
    draftClassSize: draftScaleChanged && patch.draftClassSize === undefined ? 0 : patch.draftClassSize ?? current.draftClassSize
  });
  const teams = resizeTeams(template.teams ?? [], normalized.teamCount);
  const draftClass = pack.draftClass
    ? autoBalanceDraftClass(
        {
          ...pack.draftClass,
          prospects:
            pack.draftClass.prospects.length >= normalized.draftClassSize
              ? pack.draftClass.prospects
              : [...pack.draftClass.prospects, ...generateDraftClass(`${pack.id}-rules-fill`, normalized.draftClassSize - pack.draftClass.prospects.length)]
        },
        normalized.teamCount,
        normalized.draftRounds
      )
    : createDraftClassPack(`${pack.id}-rules`, template.seasonYear, normalized.draftClassSize);
  const nextTemplate = {
    ...template,
    rules: normalized,
    teamCount: normalized.teamCount,
    scheduleLength: normalized.gamesPerTeam,
    playoffTeamCount: normalized.playoffTeamCount,
    playoffSeriesLength: normalized.playoffSeriesLength,
    draftRounds: normalized.draftRounds,
    capCeiling: normalized.capCeiling,
    capFloor: normalized.capFloor,
    teams,
    rulesPreset: {
      ...template.rulesPreset,
      teamCount: normalized.teamCount,
      scheduleLength: normalized.gamesPerTeam,
      playoffTeamCount: normalized.playoffTeamCount,
      playoffSeriesLength: normalized.playoffSeriesLength,
      draftRounds: normalized.draftRounds,
      capCeiling: normalized.capCeiling,
      capFloor: normalized.capFloor,
      rosterActiveMin: normalized.activeRosterMin,
      rosterActiveMax: normalized.activeRosterMax,
      affiliateEnabled: normalized.affiliateEnabled
    }
  };
  return {
    ...pack,
    leagueTemplate: nextTemplate,
    draftClass,
    validation: validateDataPack({ ...pack, leagueTemplate: nextTemplate, draftClass })
  };
}

function resizeTeams(teams: NonNullable<DataPack["leagueTemplate"]>["teams"], teamCount: LeagueSize) {
  const next = [...(teams ?? [])].slice(0, teamCount);
  const existingIds = new Set(next.map((team) => team.id));
  while (next.length < teamCount) {
    const generated = createDefaultEditorTeam(next.length);
    let id = generated.id;
    let suffix = 2;
    while (existingIds.has(id)) {
      id = `${generated.id}-${suffix}`;
      suffix += 1;
    }
    existingIds.add(id);
    next.push({ ...generated, id, rivalryTeamIds: generated.rivalryTeamIds.filter((rivalId: string) => existingIds.has(rivalId)) });
  }
  const validIds = new Set(next.map((team) => team.id));
  return next.map((team) => ({
    ...team,
    rivalryTeamIds: team.rivalryTeamIds.filter((rivalId) => validIds.has(rivalId) && rivalId !== team.id)
  }));
}

function formatLabel(format: ScheduleFormat): string {
  if (format === "doubleRoundRobin") return "Double round robin";
  if (format === "balancedShort") return "Balanced short";
  if (format === "balancedLong") return "Balanced long";
  return "Balanced standard";
}

function playoffLabel(format: PlayoffFormat): string {
  if (format === "top4") return "Top 4";
  if (format === "top6WithByes") return "Top 6 with byes";
  if (format === "top10WithPlayIn") return "Top 10 with play-in";
  return "Top 8";
}

function seriesLabel(format: PlayoffSeriesFormat): string {
  if (format === "singleGame") return "Single game";
  if (format === "bestOf3") return "Best of 3";
  if (format === "bestOf7") return "Best of 7";
  return "Best of 5";
}

export function DataPackLibrary({
  currentFranchise,
  onStartPack
}: {
  currentFranchise?: FranchiseState | null;
  onStartPack?: (pack: DataPack, selectedTeamId: string) => void;
}) {
  const importedPacks = useDataPackStore((state) => state.importedPacks);
  const addPack = useDataPackStore((state) => state.addPack);
  const removePack = useDataPackStore((state) => state.removePack);
  const importPackFromJson = useDataPackStore((state) => state.importPackFromJson);
  const [activeTab, setActiveTab] = useState<LabTab>("library");
  const [pack, setPack] = useState<DataPack>(() => createDefaultDataPack());
  const [selectedTeamId, setSelectedTeamId] = useState(pack.leagueTemplate?.teams[0]?.id ?? "");
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [message, setMessage] = useState("");
  const scenarios = useMemo(() => getBuiltInScenarios(), []);
  const validation = useMemo(() => validateDataPack(pack), [pack]);
  const ruleSet = useMemo(() => normalizeLeagueRuleSet(pack.leagueTemplate?.rules ?? pack.leagueTemplate), [pack.leagueTemplate]);
  const ruleValidation = useMemo(() => validateLeagueRuleSet(ruleSet), [ruleSet]);
  const teams = pack.leagueTemplate?.teams ?? [];
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const draftPack = pack.draftClass ?? createDraftClassPack("lab-draft", pack.leagueTemplate?.seasonYear ?? 2026, ruleSet.draftClassSize);

  const updatePack = (next: DataPack) => {
    const validated = { ...next, updatedAt: new Date().toISOString(), validation: validateDataPack(next) };
    setPack(validated);
    const nextTeams = validated.leagueTemplate?.teams ?? [];
    if ((!selectedTeamId || !nextTeams.some((team) => team.id === selectedTeamId)) && nextTeams[0]) setSelectedTeamId(nextTeams[0].id);
  };

  const updateTeamPlayers = (teamId: string, players: CustomPlayerDefinition[]) => {
    if (!pack.leagueTemplate) return;
    updatePack({
      ...pack,
      leagueTemplate: {
        ...pack.leagueTemplate,
        teams: pack.leagueTemplate.teams.map((team) => (team.id === teamId ? { ...team, players } : team))
      }
    });
  };

  return (
    <section className="custom-league-lab">
      <div className="lab-header">
        <div>
          <h2>Custom League Lab</h2>
          <p className="muted">Create, validate, import, export, and start local fictional data packs.</p>
        </div>
        <div className="button-row">
          <Button onClick={() => updatePack(createDefaultDataPack())}>Reset standard pack</Button>
          <Button onClick={() => {
            const repaired = repairDataPack(pack);
            updatePack(repaired.pack);
            setMessage(repaired.report.valid ? "Pack repaired and valid." : "Pack repaired; review remaining validation notes.");
          }}>Repair pack</Button>
          <Button tone="primary" disabled={!validation.valid || !validation.supported || !selectedTeam || !onStartPack} onClick={() => selectedTeam && onStartPack?.(pack, selectedTeam.id)}>
            Start Franchise
          </Button>
        </div>
      </div>
      <Tabs tabs={LAB_TABS} active={activeTab} onChange={setActiveTab} />
      {message && <p className="muted">{message}</p>}
      {!validation.valid && (
        <WarningCallout title="Validation report" tone="warning">
          {[...validation.errors, ...validation.unsupportedReasons, ...validation.duplicateIdWarnings, ...validation.realWorldContentFlags.map((term) => `Restricted term: ${term}`)].slice(0, 6).map((item) => (
            <p key={item}>{item}</p>
          ))}
          {validation.suggestedFixes.slice(0, 2).map((item) => <p key={item}>{item}</p>)}
        </WarningCallout>
      )}

      {activeTab === "library" && (
        <div className="room-grid room-grid--two">
          <section className="panel-section">
            <h3>Working Pack</h3>
            <label className="field-label">
              Pack name
              <input value={pack.name} onChange={(event) => updatePack({ ...pack, name: event.target.value })} maxLength={72} />
            </label>
            <label className="field-label">
              Description
              <textarea value={pack.description} onChange={(event) => updatePack({ ...pack, description: event.target.value })} />
            </label>
            <div className="season-pulse">
              <span>Teams <strong>{ruleSet.teamCount}</strong></span>
              <span>Schedule <strong>{ruleSet.gamesPerTeam}</strong></span>
              <span>Playoff teams <strong>{ruleSet.playoffTeamCount}</strong></span>
              <span>Status <strong>{validation.valid && validation.supported ? "Supported" : "Needs edits"}</strong></span>
            </div>
            <div className="button-row">
              <Button onClick={() => void addPack(pack).then((report) => setMessage(report.valid ? "Pack saved locally." : "Pack saved with validation warnings."))}>Save to library</Button>
              {currentFranchise && (
                <Button onClick={() => {
                  const exported = createDataPackFromCurrentLeague(currentFranchise);
                  updatePack(exported);
                  void addPack(exported);
                  setMessage("Current fictional league exported into the lab.");
                }}>
                  Export current league
                </Button>
              )}
            </div>
          </section>
          <section className="panel-section">
            <h3>Imported Local Packs</h3>
            <div className="asset-list asset-list--compact">
              {importedPacks.length ? importedPacks.map((item) => (
                <article key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.type} | {item.validation?.valid ? "valid" : "needs validation"}</span>
                  <div className="button-row">
                    <button type="button" onClick={() => updatePack(item)}>Edit</button>
                    <button type="button" disabled={!item.validation?.valid || item.validation.supported === false || !onStartPack || !item.leagueTemplate?.teams[0]} onClick={() => item.leagueTemplate?.teams[0] && onStartPack?.(item, item.leagueTemplate.teams[0].id)}>Start</button>
                    <button type="button" onClick={() => void removePack(item.id)}>Delete</button>
                  </div>
                </article>
              )) : <p className="empty-state">No imported packs yet.</p>}
            </div>
          </section>
        </div>
      )}

      {activeTab === "rules" && pack.leagueTemplate && (
        <section className="panel-section">
          <h3>League Rules</h3>
          <div className="editor-grid">
            <label className="field-label">
              Team count
              <select
                value={ruleSet.teamCount}
                onChange={(event) => {
                  const nextCount = Number(event.target.value) as LeagueSize;
                  if (nextCount < teams.length && typeof window !== "undefined" && !window.confirm(`Reduce this pack to ${nextCount} teams? Extra teams will be removed from this local working copy.`)) return;
                  updatePack(updatePackRuleSet(pack, { teamCount: nextCount }));
                }}
              >
                {LEAGUE_SIZES.map((size) => <option key={size} value={size}>{size} teams</option>)}
              </select>
            </label>
            <label className="field-label">
              Schedule format
              <select value={ruleSet.scheduleFormat} onChange={(event) => updatePack(updatePackRuleSet(pack, { scheduleFormat: event.target.value as ScheduleFormat }))}>
                {getSupportedScheduleFormats(ruleSet.teamCount).map((format) => <option key={format} value={format}>{formatLabel(format)}</option>)}
              </select>
            </label>
            <label className="field-label">
              Playoff format
              <select value={ruleSet.playoffFormat} onChange={(event) => updatePack(updatePackRuleSet(pack, { playoffFormat: event.target.value as PlayoffFormat }))}>
                {getSupportedPlayoffFormats(ruleSet.teamCount).map((format) => <option key={format} value={format}>{playoffLabel(format)}</option>)}
              </select>
            </label>
            <label className="field-label">
              Series length
              <select value={ruleSet.playoffSeriesFormat} onChange={(event) => updatePack(updatePackRuleSet(pack, { playoffSeriesFormat: event.target.value as PlayoffSeriesFormat }))}>
                {SERIES_FORMATS.map((format) => <option key={format} value={format}>{seriesLabel(format)}</option>)}
              </select>
            </label>
            <label className="field-label">
              Draft rounds
              <input type="number" min={3} max={7} value={ruleSet.draftRounds} onChange={(event) => updatePack(updatePackRuleSet(pack, { draftRounds: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Draft class size
              <input type="number" min={ruleSet.teamCount * ruleSet.draftRounds} value={ruleSet.draftClassSize} onChange={(event) => updatePack(updatePackRuleSet(pack, { draftClassSize: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Cap ceiling
              <input type="number" value={ruleSet.capCeiling} step={500000} onChange={(event) => updatePack(updatePackRuleSet(pack, { capCeiling: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Cap floor
              <input type="number" value={ruleSet.capFloor} step={500000} onChange={(event) => updatePack(updatePackRuleSet(pack, { capFloor: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Active roster minimum
              <input type="number" min={18} max={23} value={ruleSet.activeRosterMin} onChange={(event) => updatePack(updatePackRuleSet(pack, { activeRosterMin: Number(event.target.value) }))} />
            </label>
            <label className="field-label">
              Active roster maximum
              <input type="number" min={20} max={30} value={ruleSet.activeRosterMax} onChange={(event) => updatePack(updatePackRuleSet(pack, { activeRosterMax: Number(event.target.value) }))} />
            </label>
            <label className="field-label field-label--inline">
              <input type="checkbox" checked={ruleSet.affiliateEnabled} onChange={(event) => updatePack(updatePackRuleSet(pack, { affiliateEnabled: event.target.checked }))} />
              Affiliate enabled
            </label>
          </div>
          <div className="season-pulse">
            <span>Games/team <strong>{ruleSet.gamesPerTeam}</strong></span>
            <span>Draft minimum <strong>{ruleSet.teamCount * ruleSet.draftRounds}</strong></span>
            <span>Recommended class <strong>{ruleSet.draftClassSize}</strong></span>
            <span>Status <strong>{ruleValidation.valid ? "Supported" : "Unsupported"}</strong></span>
          </div>
          <div className="validation-pill-list">
            {[...ruleValidation.errors, ...ruleValidation.warnings].length ? [...ruleValidation.errors, ...ruleValidation.warnings].slice(0, 6).map((message) => (
              <span key={message} className="validation-pill validation-pill--warning">{message}</span>
            )) : <span className="validation-pill validation-pill--ok">Rules validate</span>}
          </div>
          <div className="button-row">
            <Button onClick={() => updatePack(repairDataPack(pack).pack)}>Repair to nearest supported format</Button>
          </div>
        </section>
      )}

      {activeTab === "teams" && selectedTeam && pack.leagueTemplate && (
        <div className="room-grid room-grid--two">
          <section className="panel-section">
            <h3>Edit Teams</h3>
            <div className="asset-list asset-list--compact">
              {teams.map((team) => (
                <button key={team.id} type="button" className={team.id === selectedTeam.id ? "is-selected asset-button" : "asset-button"} onClick={() => setSelectedTeamId(team.id)}>
                  <strong>{team.fullName}</strong>
                  <span>{team.abbreviation} | {team.marketSize}</span>
                </button>
              ))}
            </div>
          </section>
          <TeamCreator
            team={selectedTeam}
            onChange={(team) =>
              updatePack({
                ...pack,
                leagueTemplate: {
                  ...pack.leagueTemplate!,
                  teams: teams.map((candidate) => (candidate.id === selectedTeam.id ? team : candidate))
                }
              })
            }
          />
        </div>
      )}

      {activeTab === "rosters" && selectedTeam && (
        <RosterEditor
          teamId={selectedTeam.id}
          players={selectedTeam.players ?? autoGenerateCustomRoster(selectedTeam.id)}
          onChange={(players) => updateTeamPlayers(selectedTeam.id, players)}
        />
      )}

      {activeTab === "draft" && (
        <DraftClassEditor
          pack={draftPack}
          teamCount={ruleSet.teamCount}
          rounds={ruleSet.draftRounds}
          onChange={(draftClass) => updatePack({ ...pack, draftClass })}
        />
      )}

      {activeTab === "scenarios" && (
        <section className="panel-section">
          <h3>Scenario Starts</h3>
          <div className="asset-list">
            {scenarios.map((scenario) => {
              const scenarioPack = createScenarioDataPack(scenario, pack);
              const scenarioValidation = validateDataPack(scenarioPack);
              return (
                <article key={scenario.id}>
                  <strong>{scenario.name}</strong>
                  <span>{scenario.description}</span>
                  <small>{scenario.setupNotes.join(" ")}</small>
                  <div className="button-row">
                    <button type="button" onClick={() => updatePack(scenarioPack)}>Apply to working pack</button>
                    <button type="button" disabled={!scenarioValidation.valid || !scenarioValidation.supported || !selectedTeam || !onStartPack} onClick={() => selectedTeam && onStartPack?.(scenarioPack, selectedTeam.id)}>Start scenario</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === "import" && (
        <section className="panel-section">
          <h3>Local JSON Import / Export</h3>
          <div className="button-row">
            <Button onClick={() => setExportText(exportDataPackJson(pack))}>Export working pack JSON</Button>
            <Button onClick={() => {
              const result = validateDataPack(pack);
              setMessage(result.valid ? "Working pack validates." : `${result.errors.length + result.duplicateIdWarnings.length} validation issues found.`);
            }}>Validate</Button>
          </div>
          <label className="select-field">
            <span>Exported data pack JSON</span>
            <textarea readOnly value={exportText} placeholder="Export JSON to populate this field." />
          </label>
          <label className="select-field">
            <span>Import data pack JSON</span>
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste local fictional data pack JSON here." />
          </label>
          <div className="button-row">
            <Button
              tone="primary"
              disabled={!importText.trim()}
              onClick={() => void importPackFromJson(importText).then((result) => {
                if (result.pack) updatePack(result.pack);
                setMessage(result.error ?? (result.report.valid ? "Pack imported and valid." : "Pack imported with validation notes."));
              })}
            >
              Import JSON
            </Button>
            <Button onClick={() => setImportText("")}>Clear</Button>
          </div>
        </section>
      )}
    </section>
  );
}
