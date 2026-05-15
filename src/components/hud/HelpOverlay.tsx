import { useState } from "react";
import { getKeyboardShortcuts } from "../../game/systems/accessibility";
import { useSettingsStore } from "../../store/settingsStore";
import { GuideOverlay } from "./GuideOverlay";

export function HelpOverlay() {
  const open = useSettingsStore((state) => state.helpOpen);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
  const [tab, setTab] = useState<"quick" | "guide" | "shortcuts">("quick");
  if (!open) return null;
  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Franchise Ice help">
      <section>
        <header>
          <div>
            <small>Help</small>
            <h2>Franchise Ice Field Guide</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => setHelpOpen(false)} aria-label="Close help">
            X
          </button>
        </header>
        <nav className="segmented-tabs" aria-label="Help sections">
          <button type="button" className={tab === "quick" ? "is-selected" : ""} onClick={() => setTab("quick")}>Quick Help</button>
          <button type="button" className={tab === "guide" ? "is-selected" : ""} onClick={() => setTab("guide")}>Learn the Game</button>
          <button type="button" className={tab === "shortcuts" ? "is-selected" : ""} onClick={() => setTab("shortcuts")}>Shortcuts</button>
        </nav>
        {tab === "guide" ? (
          <GuideOverlay compact />
        ) : tab === "shortcuts" ? (
          <div className="help-grid">
            {getKeyboardShortcuts().map((shortcut) => (
              <article key={shortcut.key}>
                <h3>{shortcut.key}</h3>
                <p>{shortcut.label}: {shortcut.action}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="help-grid">
            <article>
              <h3>Start Here</h3>
              <p>Open the GM Office, read the Assistant GM report, check the Roster Office, review lines in Coach's Office, then sim from the Arena Bowl.</p>
            </article>
            <article>
              <h3>Guided Tutorial</h3>
              <p>The tutorial is dismissible and resettable in Settings. It teaches the first playable loop without blocking advanced players.</p>
            </article>
            <article>
              <h3>Achievements</h3>
              <p>Local achievements and franchise milestones celebrate first wins, trades, draft picks, playoff moments, and dynasty progress.</p>
            </article>
            <article>
              <h3>Audio</h3>
              <p>Audio uses local generated Web Audio cues only. It starts after a user gesture, respects volume settings, and fails quietly if unavailable.</p>
            </article>
            <article>
              <h3>Save Data</h3>
              <p>Saves, diagnostics, telemetry, and bug reports stay local. Bug reports exclude the full save unless you choose to include it.</p>
            </article>
            <article>
              <h3>Out of Scope</h3>
              <p>Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend services, real branding, and playable on-ice hockey are still out of scope.</p>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
