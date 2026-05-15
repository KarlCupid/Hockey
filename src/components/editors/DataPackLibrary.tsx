import { useMemo, useState } from "react";
import type { CustomPlayerDefinition, DataPack } from "../../game/types";
import { createDataPackFromCurrentLeague, createDefaultDataPack, exportDataPackJson, repairDataPack, validateDataPack } from "../../game/systems/dataPacks";
import { getBuiltInScenarios, createScenarioDataPack } from "../../game/systems/scenarios";
import { useDataPackStore } from "../../store/dataPackStore";
import type { FranchiseState } from "../../game/types";
import { Button } from "../ui/Button";
import { Tabs, type TabItem } from "../ui/Tabs";
import { WarningCallout } from "../ui/WarningCallout";
import { TeamCreator } from "./TeamCreator";
import { RosterEditor, autoGenerateCustomRoster } from "./RosterEditor";
import { DraftClassEditor, createDraftClassPack } from "./DraftClassEditor";

type LabTab = "library" | "teams" | "rosters" | "draft" | "scenarios" | "import";

const LAB_TABS: TabItem<LabTab>[] = [
  { id: "library", label: "Library" },
  { id: "teams", label: "Teams" },
  { id: "rosters", label: "Rosters" },
  { id: "draft", label: "Draft Class" },
  { id: "scenarios", label: "Scenarios" },
  { id: "import", label: "Import / Export" }
];

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
  const teams = pack.leagueTemplate?.teams ?? [];
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
  const draftPack = pack.draftClass ?? createDraftClassPack("lab-draft", pack.leagueTemplate?.seasonYear ?? 2026);

  const updatePack = (next: DataPack) => {
    const validated = { ...next, updatedAt: new Date().toISOString(), validation: validateDataPack(next) };
    setPack(validated);
    if (!selectedTeamId && validated.leagueTemplate?.teams[0]) setSelectedTeamId(validated.leagueTemplate.teams[0].id);
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
          <Button tone="primary" disabled={!validation.valid || !selectedTeam || !onStartPack} onClick={() => selectedTeam && onStartPack?.(pack, selectedTeam.id)}>
            Start Franchise
          </Button>
        </div>
      </div>
      <Tabs tabs={LAB_TABS} active={activeTab} onChange={setActiveTab} />
      {message && <p className="muted">{message}</p>}
      {!validation.valid && (
        <WarningCallout title="Validation report" tone="warning">
          {[...validation.errors, ...validation.duplicateIdWarnings, ...validation.realWorldContentFlags.map((term) => `Restricted term: ${term}`)].slice(0, 6).map((item) => (
            <p key={item}>{item}</p>
          ))}
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
              <span>Teams <strong>{pack.leagueTemplate?.teams.length ?? 0}</strong></span>
              <span>Schedule <strong>{pack.leagueTemplate?.scheduleLength ?? 0}</strong></span>
              <span>Playoff teams <strong>{pack.leagueTemplate?.playoffTeamCount ?? 0}</strong></span>
              <span>Status <strong>{validation.valid ? "Valid" : "Needs edits"}</strong></span>
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
                    <button type="button" disabled={!item.validation?.valid || !onStartPack || !item.leagueTemplate?.teams[0]} onClick={() => item.leagueTemplate?.teams[0] && onStartPack?.(item, item.leagueTemplate.teams[0].id)}>Start</button>
                    <button type="button" onClick={() => void removePack(item.id)}>Delete</button>
                  </div>
                </article>
              )) : <p className="empty-state">No imported packs yet.</p>}
            </div>
          </section>
        </div>
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
        <DraftClassEditor pack={draftPack} onChange={(draftClass) => updatePack({ ...pack, draftClass })} />
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
                    <button type="button" disabled={!scenarioValidation.valid || !selectedTeam || !onStartPack} onClick={() => selectedTeam && onStartPack?.(scenarioPack, selectedTeam.id)}>Start scenario</button>
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
