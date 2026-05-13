import { useState } from "react";
import { formatPickLabel, getTeamPicks } from "../../game/systems/draftPicks";
import { getVisibleProspectReport, rankDraftBoard } from "../../game/systems/scouting";
import type { DraftBoardStrategy, ScoutingPriority, ScoutingRegion } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

const STRATEGIES: DraftBoardStrategy[] = ["Best Player Available", "High Upside", "Safe Floor", "Need: Forwards", "Need: Defense", "Need: Goalies"];
const REGIONS: ScoutingRegion[] = ["Domestic", "Nordic", "Central Europe", "Eastern Europe", "US College", "Junior"];
const PRIORITIES: ScoutingPriority[] = ["Balanced", "High Upside", "Goalies", "Defense", "Forwards", "Safe Picks"];

export function ScoutingDepartmentPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const setScoutingAssignment = useFranchiseStore((state) => state.setScoutingAssignment);
  const toggleProspectWatchlist = useFranchiseStore((state) => state.toggleProspectWatchlist);
  const moveProspectOnDraftBoard = useFranchiseStore((state) => state.moveProspectOnDraftBoard);
  const [strategy, setStrategy] = useState<DraftBoardStrategy>("Best Player Available");
  const [selectedId, setSelectedId] = useState<string | undefined>();

  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const boardIds = strategy === "Best Player Available" ? franchise.scouting.teamDraftBoard : rankDraftBoard(franchise.scouting.draftClass, strategy);
  const board = boardIds
    .map((id) => franchise.scouting.draftClass.find((prospect) => prospect.id === id))
    .filter((prospect): prospect is NonNullable<typeof prospect> => Boolean(prospect));
  const selected = franchise.scouting.draftClass.find((prospect) => prospect.id === selectedId) ?? board[0];
  const visible = selected ? getVisibleProspectReport(selected) : undefined;
  const picks = getTeamPicks(team, franchise.league.seasonYear);

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <div>
          <small>Draft Class</small>
          <strong>{franchise.scouting.draftClass.length} prospects</strong>
        </div>
        <div>
          <small>Watchlist</small>
          <strong>{franchise.scouting.watchlist.length}</strong>
        </div>
        <div>
          <small>Current Picks</small>
          <strong>{picks.length}</strong>
        </div>
        <label className="compact-select">
          <span>Draft Strategy</span>
          <select value={strategy} onChange={(event) => setStrategy(event.target.value as DraftBoardStrategy)}>
            {STRATEGIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">Scouting certainty improves as assignments progress after games.</p>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Draft Board</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Prospect</th>
                  <th>Pos</th>
                  <th>Age</th>
                  <th>Nat.</th>
                  <th>Public</th>
                  <th>Round</th>
                  <th>OVR Est.</th>
                  <th>POT Est.</th>
                  <th>Risk</th>
                  <th>Cert.</th>
                  <th>Watch</th>
                </tr>
              </thead>
              <tbody>
                {board.map((prospect, index) => {
                  const report = getVisibleProspectReport(prospect);
                  const watched = franchise.scouting.watchlist.includes(prospect.id);
                  return (
                    <tr key={prospect.id} className={selected?.id === prospect.id ? "is-selected" : ""} onClick={() => setSelectedId(prospect.id)}>
                      <td>{index + 1}</td>
                      <td>{report.displayName}</td>
                      <td>{report.position}</td>
                      <td>{report.age}</td>
                      <td>{report.nationality}</td>
                      <td>{report.publicRank}</td>
                      <td>{report.projectedRound}</td>
                      <td>
                        {report.scouting.estimatedOverallLow}-{report.scouting.estimatedOverallHigh}
                      </td>
                      <td>
                        {report.scouting.estimatedPotentialLow}-{report.scouting.estimatedPotentialHigh}
                      </td>
                      <td>{report.risk}</td>
                      <td>{report.scouting.certainty}%</td>
                      <td>
                        <button type="button" onClick={(event) => {
                          event.stopPropagation();
                          toggleProspectWatchlist(prospect.id);
                        }}>
                          {watched ? "Watching" : "Watch"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-section">
          <h3>Prospect Detail</h3>
          {visible ? (
            <div className="prospect-detail">
              <header>
                <strong>{visible.displayName}</strong>
                <span>
                  {visible.position} | {visible.archetype} | {visible.league}
                </span>
              </header>
              <p>{visible.projectionSummary}</p>
              <dl className="mini-grid">
                <div>
                  <dt>Strengths</dt>
                  <dd>{visible.strengths.join(", ")}</dd>
                </div>
                <div>
                  <dt>Weaknesses</dt>
                  <dd>{visible.weaknesses.join(", ")}</dd>
                </div>
                <div>
                  <dt>Personality read</dt>
                  <dd>{visible.personality}</dd>
                </div>
                <div>
                  <dt>Viewings</dt>
                  <dd>{visible.scouting.viewings}</dd>
                </div>
              </dl>
              <div className="button-row">
                <button type="button" onClick={() => moveProspectOnDraftBoard(visible.id, "up")}>
                  Move Up
                </button>
                <button type="button" onClick={() => moveProspectOnDraftBoard(visible.id, "down")}>
                  Move Down
                </button>
                <button type="button" onClick={() => toggleProspectWatchlist(visible.id)}>
                  {franchise.scouting.watchlist.includes(visible.id) ? "Remove Watch" : "Add Watch"}
                </button>
              </div>
              <h4>Scout Notes</h4>
              <ul className="compact-list">
                {visible.scouting.scoutNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="empty-state">No prospect selected.</p>
          )}

          <h3>Assignments</h3>
          <div className="asset-list">
            {franchise.scouting.assignments.map((assignment) => (
              <article key={assignment.id}>
                <strong>Scout Slot {assignment.id.replace("scout-", "")}</strong>
                <label className="compact-select">
                  <span>Region</span>
                  <select value={assignment.region} onChange={(event) => setScoutingAssignment(assignment.id, { region: event.target.value as ScoutingRegion })}>
                    {REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="compact-select">
                  <span>Priority</span>
                  <select value={assignment.priority} onChange={(event) => setScoutingAssignment(assignment.id, { priority: event.target.value as ScoutingPriority })}>
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="compact-select">
                  <span>Focused Prospect</span>
                  <select value={assignment.assignedProspectId ?? ""} onChange={(event) => setScoutingAssignment(assignment.id, { assignedProspectId: event.target.value || undefined })}>
                    <option value="">No focus</option>
                    {board.slice(0, 36).map((prospect) => (
                      <option key={prospect.id} value={prospect.id}>
                        {prospect.displayName} | {prospect.position}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={assignment.active} onChange={(event) => setScoutingAssignment(assignment.id, { active: event.target.checked })} />
                  Active | Progress {assignment.progress}%
                </label>
              </article>
            ))}
          </div>

          <h3>Pick Context</h3>
          <div className="asset-list asset-list--compact">
            {picks.map((pick) => (
              <article key={pick.id}>
                <strong>{formatPickLabel(pick, franchise.league.teams)}</strong>
                <span>Projected value {pick.projectedValue}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
