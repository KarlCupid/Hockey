import { useEffect, useMemo, useState } from "react";
import { SAVE_SLOT_COUNT } from "../../game/constants";
import { getPhaseLabel } from "../../game/systems/phaseGuidance";
import { validateSaveIntegrity } from "../../game/systems/saves";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { WarningCallout } from "../ui/WarningCallout";
import { DataPackLibrary } from "../editors/DataPackLibrary";

export function SaveLoadPanel() {
  const {
    franchise,
    saves,
    refreshSaves,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    loadError,
    importFromJson,
    exportCurrentJson,
    repairCurrentSave,
    exportBugReport,
    copyDiagnosticSummary
  } = useFranchiseStore();
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  const [importText, setImportText] = useState("");
  const [exportText, setExportText] = useState("");
  const [bugReportText, setBugReportText] = useState("");
  const [bugReportNote, setBugReportNote] = useState("");
  const [includeFullSave, setIncludeFullSave] = useState(false);
  const integrity = useMemo(() => (franchise ? validateSaveIntegrity(franchise) : undefined), [franchise]);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  const slots = Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => `slot-${index + 1}`);
  async function confirmSave(slotId: string, occupied: boolean) {
    if (occupied && !window.confirm("Overwrite this manual save slot?")) return;
    await saveToSlot(slotId);
    markChecklistItem("saveFranchise");
  }

  async function confirmDelete(slotId: string) {
    if (!window.confirm("Delete this local save? This cannot be undone.")) return;
    await deleteSlot(slotId);
  }

  return (
    <div className="room-grid room-grid--two">
      <section className="panel-section">
        <h3>Manual Saves</h3>
        <p className="muted">Three local slots are stored in IndexedDB. Autosave updates after completed games.</p>
        {franchise && (
          <div className="save-integrity-card">
            <strong>Current save integrity</strong>
            <span>Schema v{integrity?.schemaVersion} | {getPhaseLabel(franchise.seasonPhase)} | Season {franchise.league.seasonYear}</span>
            <span>{integrity?.errors.length ?? 0} errors | {integrity?.warnings.length ?? 0} warnings</span>
            {!!integrity?.warnings.length && (
              <WarningCallout title="Save Warnings" tone="info">
                {integrity.warnings.slice(0, 4).map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </WarningCallout>
            )}
            <div className="button-row">
              <Button onClick={repairCurrentSave} disabled={!integrity?.warnings.length && !integrity?.errors.length}>Repair current save</Button>
              <Button onClick={() => setExportText(exportCurrentJson() ?? "")}>Export save JSON</Button>
            </div>
          </div>
        )}
        {slots.map((slotId) => {
          const metadata = saves.find((save) => save.slotId === slotId);
          return (
            <article className="save-row" key={slotId}>
              <div>
                <strong>{metadata?.label ?? `Slot ${slotId.replace("slot-", "")}`}</strong>
                <span>
                  {metadata
                    ? `${metadata.teamName} | ${metadata.record} | ${getPhaseLabel(metadata.seasonPhase)} | Game ${metadata.gameNumber} | ${metadata.currentDate} | Saved ${new Date(metadata.lastSaved).toLocaleString()}`
                    : "Empty slot"}
                </span>
                {metadata && <small className="muted">Season {metadata.seasonYear} | schema v{metadata.schemaVersion}</small>}
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void confirmSave(slotId, Boolean(metadata))}>
                  {metadata ? "Overwrite" : "Save"}
                </button>
                <button type="button" disabled={!metadata} onClick={() => void loadFromSlot(slotId)}>
                  Load
                </button>
                <button type="button" disabled={!metadata} onClick={() => void confirmDelete(slotId)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>
      <section className="panel-section">
        <h3>Autosave</h3>
        {saves
          .filter((save) => save.slotId === "autosave")
          .map((save) => (
            <article className="save-row" key={save.slotId}>
              <div>
                <strong>{save.teamName}</strong>
                <span>
                  {save.record} | {getPhaseLabel(save.seasonPhase)} | Game {save.gameNumber} | {save.currentDate} | Saved {new Date(save.lastSaved).toLocaleString()}
                </span>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void loadFromSlot(save.slotId)}>
                  Continue
                </button>
                <button type="button" onClick={() => void confirmDelete(save.slotId)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        {!saves.some((save) => save.slotId === "autosave") && <p className="empty-state">No autosave yet. Complete a game to create one.</p>}
        {loadError && <p className="error-text">{loadError}</p>}
        <h3>Import / Export JSON</h3>
        <label className="select-field">
          <span>Exported save JSON</span>
          <textarea readOnly value={exportText} placeholder="Use Export save JSON to populate this field." />
        </label>
        <label className="select-field">
          <span>Import save JSON</span>
          <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste a Franchise Ice save JSON export here." />
        </label>
        <div className="button-row">
          <Button
            tone="primary"
            disabled={!importText.trim()}
            onClick={() => {
              if (window.confirm("Importing will replace the currently loaded franchise. Continue?")) importFromJson(importText);
            }}
          >
            Validate and Import
          </Button>
          <Button onClick={() => setImportText("")}>Clear Import</Button>
        </div>
        <h3>Diagnostics & Bug Report</h3>
        <p className="muted">Creates a local JSON report for playtests. The full save is excluded unless you turn it on.</p>
        <label className="checkbox-row settings-toggle">
          <input type="checkbox" checked={includeFullSave} onChange={(event) => setIncludeFullSave(event.target.checked)} />
          <span>Include full save JSON</span>
        </label>
        <label className="select-field">
          <span>Playtester note</span>
          <textarea value={bugReportNote} onChange={(event) => setBugReportNote(event.target.value)} placeholder="What happened before the issue?" />
        </label>
        <div className="button-row">
          <Button onClick={() => setBugReportText(copyDiagnosticSummary() ?? "")}>Copy diagnostic summary</Button>
          <Button onClick={() => setBugReportText(exportBugReport(bugReportNote, includeFullSave) ?? "")}>Export bug report JSON</Button>
        </div>
        <label className="select-field">
          <span>Diagnostic output</span>
          <textarea readOnly value={bugReportText} placeholder="Generate a diagnostic summary or bug report." />
        </label>
        <h3>Data Packs</h3>
        <DataPackLibrary currentFranchise={franchise} onStartPack={(pack, selectedTeamId) => useFranchiseStore.getState().startFranchiseFromDataPack(pack, selectedTeamId)} />
      </section>
    </div>
  );
}
