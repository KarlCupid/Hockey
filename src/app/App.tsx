import { lazy, Suspense, useEffect, useState } from "react";
import { TeamBrandCard } from "../components/branding/TeamBrandCard";
import { LoadingPanel } from "../components/hud/LoadingPanel";
import { FICTIONAL_TEAMS } from "../game/constants";
import { getPhaseLabel } from "../game/systems/phaseGuidance";
import { useFranchiseStore } from "../store/franchiseStore";

const AppShell = lazy(() => import("./AppShell").then((module) => ({ default: module.AppShell })));

export function App() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const saves = useFranchiseStore((state) => state.saves);
  const loadError = useFranchiseStore((state) => state.loadError);
  const refreshSaves = useFranchiseStore((state) => state.refreshSaves);
  const loadFromSlot = useFranchiseStore((state) => state.loadFromSlot);
  const deleteSlot = useFranchiseStore((state) => state.deleteSlot);
  const startNewFranchise = useFranchiseStore((state) => state.startNewFranchise);
  const [selectingTeam, setSelectingTeam] = useState(false);

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  if (franchise) {
    return (
      <Suspense fallback={<LoadingPanel label="Opening facility..." />}>
        <AppShell />
      </Suspense>
    );
  }

  if (selectingTeam) {
    return (
      <main className="start-screen start-screen--teams">
        <div className="start-screen__intro">
          <span className="brand-mark">FI</span>
          <h1>Choose Your Franchise</h1>
          <p>Every market is fictional, every dressing room has pressure, and every owner thinks the plan should already be working.</p>
        </div>
        <section className="team-select-grid">
          {FICTIONAL_TEAMS.map(([id, city, nickname, _abbreviation, _primaryColor, _secondaryColor, marketSize, personality]) => (
            <TeamBrandCard
              key={id}
              teamId={id}
              name={`${city} ${nickname}`}
              meta={`${marketSize} market | ${personality}`}
              onSelect={() => startNewFranchise(id)}
            />
          ))}
        </section>
      </main>
    );
  }

  const autosave = saves.find((save) => save.slotId === "autosave");
  const confirmDelete = (slotId: string) => {
    if (window.confirm("Delete this local save? This cannot be undone.")) void deleteSlot(slotId);
  };
  return (
    <main className="start-screen">
      <div className="start-screen__intro">
        <span className="brand-mark">FI</span>
        <h1>Franchise Ice</h1>
        <p>Walk the facility. Own the lineup board. Carry the press conference after the final horn.</p>
        <div className="button-row">
          <button type="button" onClick={() => setSelectingTeam(true)}>New Franchise</button>
          <button type="button" disabled={!autosave} onClick={() => autosave && void loadFromSlot("autosave")}>Continue</button>
        </div>
      </div>
      <section className="load-card">
        <h2>Load Franchise</h2>
        {loadError && <p className="error-text">{loadError}</p>}
        {saves.length ? (
          saves.map((save) => (
            <article className="save-row" key={save.slotId}>
              <div>
                <strong>{save.label}</strong>
                <span>
                  {save.teamName} | {save.record} | {getPhaseLabel(save.seasonPhase)} | {save.currentDate} | {new Date(save.lastSaved).toLocaleString()}
                </span>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void loadFromSlot(save.slotId)}>Load</button>
                <button type="button" onClick={() => confirmDelete(save.slotId)}>Delete</button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">No local saves yet.</p>
        )}
      </section>
    </main>
  );
}
