import { useState } from "react";
import { calculateCapSpace, formatMoney } from "../../game/systems/contracts";
import { defaultRosterStatusForIncomingPlayer } from "../../game/systems/rosterManagement";
import { activeRosterCount, getRosterStatusLabel } from "../../game/systems/rosterRules";
import type { FreeAgentPlayer, RoleExpectation } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

const FILTERS = ["All", "Forwards", "Defense", "Goalies", "Top Overall", "Affordable", "Interested"] as const;
const ROLES: RoleExpectation[] = ["Top Line", "Top Six", "Middle Six", "Checking Line", "Top Pair", "Second Pair", "Third Pair", "Starter", "Backup", "Depth"];

export function FreeAgencyOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const submitFreeAgentOffer = useFranchiseStore((state) => state.submitFreeAgentOffer);
  const advanceFreeAgencyDay = useFranchiseStore((state) => state.advanceFreeAgencyDay);
  const completeFreeAgency = useFranchiseStore((state) => state.completeFreeAgency);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [selectedId, setSelectedId] = useState<string>("");
  const [salary, setSalary] = useState(1_500_000);
  const [years, setYears] = useState(2);
  const [role, setRole] = useState<RoleExpectation>("Depth");

  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const state = franchise.freeAgencyState;
  const market = filterMarket(state?.market ?? [], filter, team.id, calculateCapSpace(team));
  const selected = (state?.market ?? []).find((item) => item.player.id === selectedId) ?? market[0];

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <div>
          <small>Free Agency Day</small>
          <strong>{state ? `${state.currentDay}/${state.maxDays}` : "Not open"}</strong>
        </div>
        <div>
          <small>Market</small>
          <strong>{state?.market.length ?? 0} players</strong>
        </div>
        <div>
          <small>Cap Space</small>
          <strong>{formatMoney(calculateCapSpace(team))}</strong>
        </div>
        <div>
          <small>Roster</small>
          <strong>{activeRosterCount(team)}/{team.activeRosterLimit}</strong>
        </div>
        <button type="button" onClick={advanceFreeAgencyDay} disabled={!state || state.completed}>Advance Day</button>
        <button type="button" onClick={() => window.confirm("Auto-resolve free agency?") && completeFreeAgency()} disabled={!state || state.completed}>Auto-resolve</button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Market Overview</h3>
          <p className="muted">Free agency is a simplified seven-day fictional market. Incoming players are classified into active, scratches, or affiliate depth based on roster need and cap fit.</p>
          <div className="segmented-control">
            {FILTERS.map((item) => (
              <button className={filter === item ? "is-active" : ""} key={item} type="button" onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Age</th>
                  <th>OVR</th>
                  <th>Demand</th>
                  <th>Interest</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {market.map((item) => (
                  <tr key={item.player.id} className={selected?.player.id === item.player.id ? "is-selected" : ""} onClick={() => {
                    setSelectedId(item.player.id);
                    setSalary(item.demandSalary);
                    setYears(item.demandYears);
                    setRole(item.player.roleExpectation);
                  }}>
                    <td>{item.player.displayName}</td>
                    <td>{item.player.position}</td>
                    <td>{item.player.age}</td>
                    <td>{item.player.overall}</td>
                    <td>{formatMoney(item.demandSalary)} / {item.demandYears} yr</td>
                    <td>{item.interestByTeam[team.id] ?? 50}%</td>
                    <td><button type="button">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-section">
          <h3>Free Agent Detail</h3>
          {selected ? (
            <article className="prospect-detail">
              <header>
                <strong>{selected.player.displayName}</strong>
                <span>{selected.player.position} | {selected.player.age} yrs | {selected.player.roleExpectation}</span>
              </header>
              <p>{selected.marketBuzz}</p>
              <dl className="mini-grid">
                <div><dt>Overall</dt><dd>{selected.player.overall}</dd></div>
                <div><dt>Potential</dt><dd>{selected.player.potential}</dd></div>
                <div><dt>Demand</dt><dd>{formatMoney(selected.demandSalary)} / {selected.demandYears} yr</dd></div>
                <div><dt>Interest</dt><dd>{selected.interestByTeam[team.id] ?? 50}%</dd></div>
                <div><dt>Default destination</dt><dd>{getRosterStatusLabel(defaultRosterStatusForIncomingPlayer(team, selected.player))}</dd></div>
              </dl>
            </article>
          ) : (
            <p className="empty-state">No free agents on the market.</p>
          )}

          <h3>Offer Builder</h3>
          <div className="line-editor line-editor--pair">
            <label className="select-field">
              <span>Salary / cap hit</span>
              <input type="number" min="775000" step="25000" value={salary} onChange={(event) => setSalary(Number(event.target.value))} />
            </label>
            <label className="select-field">
              <span>Years</span>
              <input type="number" min="1" max="7" value={years} onChange={(event) => setYears(Number(event.target.value))} />
            </label>
            <label className="select-field">
              <span>Role promise</span>
              <select value={role} onChange={(event) => setRole(event.target.value as RoleExpectation)}>
                {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <p className={calculateCapSpace(team) - salary < 0 ? "error-text" : "muted"}>
              Projected cap space: {formatMoney(calculateCapSpace(team) - salary)}
            </p>
            <button type="button" disabled={!selected || calculateCapSpace(team) < salary || (activeRosterCount(team) >= team.activeRosterLimit && (selected?.player.overall ?? 0) >= 72)} onClick={() => selected && submitFreeAgentOffer(selected.player.id, salary, years, role)}>
              Submit Offer
            </button>
          </div>

          <h3>AI Signings / Market News</h3>
          <div className="asset-list">
            {state?.aiSignings.length ? (
              state.aiSignings.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <strong>{item.headline}</strong>
                  <span>{item.details}</span>
                </article>
              ))
            ) : (
              <p className="empty-state">Rumors and AI signings appear as days advance.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function filterMarket(market: FreeAgentPlayer[], filter: (typeof FILTERS)[number], teamId: string, capSpace: number) {
  const items = [...market];
  if (filter === "Forwards") return items.filter((item) => ["LW", "C", "RW"].includes(item.player.position));
  if (filter === "Defense") return items.filter((item) => ["LD", "RD"].includes(item.player.position));
  if (filter === "Goalies") return items.filter((item) => item.player.position === "G");
  if (filter === "Top Overall") return items.sort((a, b) => b.player.overall - a.player.overall);
  if (filter === "Affordable") return items.filter((item) => item.demandSalary <= capSpace);
  if (filter === "Interested") return items.filter((item) => (item.interestByTeam[teamId] ?? 0) >= 60);
  return items.sort((a, b) => b.player.overall - a.player.overall);
}
