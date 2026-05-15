import { useSettingsStore } from "../../store/settingsStore";

export function HelpOverlay() {
  const open = useSettingsStore((state) => state.helpOpen);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
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
        <div className="help-grid">
          <article>
            <h3>Controls</h3>
            <p>Move with WASD, orbit with the mouse, press E near a glowing marker, M for map, H for help, and Escape to close overlays.</p>
          </article>
          <article>
            <h3>Rooms</h3>
            <p>GM Office drives phase flow. Press Room, Owner Suite, Agent Desk, and Player Meeting Room handle the living organization layer.</p>
          </article>
          <article>
            <h3>Season Phases</h3>
            <p>Regular season feeds playoffs, review, retirements, draft lottery, draft, re-signing, free agency, staff hiring, and training camp.</p>
          </article>
          <article>
            <h3>Simulation</h3>
            <p>Instant sim applies a result immediately. Period sim lets you adjust tactics. Broadcast sim plays the event feed before applying.</p>
          </article>
          <article>
            <h3>Front Office</h3>
            <p>Cap, morale, fatigue, form, scouting certainty, staff ratings, and owner goals are simplified but persistent across seasons.</p>
          </article>
          <article>
            <h3>Relationships</h3>
            <p>Players track trust, role satisfaction, communication, and agent context. Meetings and public comments move those values in small, bounded steps.</p>
          </article>
          <article>
            <h3>Decision Events</h3>
            <p>Press conferences, owner meetings, agent calls, rumors, and locker-room issues present choices with previews and simplified consequences.</p>
          </article>
          <article>
            <h3>Difficulty & Modes</h3>
            <p>Relaxed through Hardcore adjust pressure, negotiations, cadence, and guidance. Sandbox is forgiving; Pressure Cooker, Rebuild, and Contender saves reshape expectations.</p>
          </article>
          <article>
            <h3>GM Backgrounds</h3>
            <p>Your background adds small trait modifiers to meetings, media, contracts, scouting, development, trade reads, or owner trust.</p>
          </article>
          <article>
            <h3>Assistant GM</h3>
            <p>The Assistant GM is advisory. Reports call out roster, cap, contract, story, phase, staff, scouting, and development risks with room links.</p>
          </article>
          <article>
            <h3>Action Queue</h3>
            <p>The GM Office queue and TopBar count identify blocking work, urgent decisions, and the next useful room without automating the save.</p>
          </article>
          <article>
            <h3>Narrative Frequency</h3>
            <p>Quiet, Normal, and Dramatic story settings change how often fictional template events surface while keeping active-event caps in place.</p>
          </article>
          <article>
            <h3>Story Arcs</h3>
            <p>Goalie controversy, role demands, rookie buzz, trade rumors, owner pressure, rivalries, and playoff pressure can escalate or cool down over time.</p>
          </article>
          <article>
            <h3>Consequences</h3>
            <p>Choices can affect morale, form, fatigue, role satisfaction, chemistry, fan sentiment, owner trust, media pressure, agents, and contract interest.</p>
          </article>
          <article>
            <h3>Save Data</h3>
            <p>Saves are local-only. Export JSON before risky experiments, and use repair when an old save needs schema hydration.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
