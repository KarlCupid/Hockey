import { useState } from "react";
import { StatBadge } from "../hud/StatBadge";
import { calculateCapSpace, calculateTeamCapHit, contractRiskNote, contractValueRisk, formatMoney, getCapWarnings, getExpiringContracts } from "../../game/systems/contracts";
import { createContractDemand, getPendingExpiringPlayers } from "../../game/systems/contractNegotiation";
import { formatPickLabel, getTeamPicks } from "../../game/systems/draftPicks";
import type { RoleExpectation } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

const ROLES: RoleExpectation[] = [
  "Franchise Driver",
  "Top Line",
  "Top Six",
  "Middle Six",
  "Checking Line",
  "Top Pair",
  "Second Pair",
  "Third Pair",
  "Starter",
  "Backup",
  "Depth"
];

export function ContractCapOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const submitContractOffer = useFranchiseStore((state) => state.submitContractOffer);
  const advanceSeasonPhase = useFranchiseStore((state) => state.advanceSeasonPhase);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [salary, setSalary] = useState(1_500_000);
  const [years, setYears] = useState(2);
  const [role, setRole] = useState<RoleExpectation>("Depth");
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const capHit = calculateTeamCapHit(team);
  const capSpace = calculateCapSpace(team);
  const warnings = getCapWarnings(team);
  const expiring = getExpiringContracts(team);
  const picks = getTeamPicks(team);
  const risks = team.roster
    .map((player) => ({ player, note: contractRiskNote(player), risk: contractValueRisk(player) }))
    .filter((item) => item.risk !== "Low" || item.note.includes("surplus") || item.note.includes("raise"))
    .slice(0, 8);
  const pending = getPendingExpiringPlayers(franchise, team.id);
  const selected = pending.find((player) => player.id === selectedPlayerId) ?? pending[0];
  const demand = selected ? createContractDemand(selected, team, franchise) : undefined;

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <StatBadge label="Cap Ceiling" value={formatMoney(team.capCeiling)} />
        <StatBadge label="Current Hit" value={formatMoney(capHit)} tone={capSpace < 0 ? "bad" : capSpace < 3_000_000 ? "warn" : "default"} />
        <StatBadge label="Cap Space" value={formatMoney(capSpace)} tone={capSpace < 0 ? "bad" : capSpace < 3_000_000 ? "warn" : "good"} />
        <StatBadge label="Roster Size" value={team.roster.length} />
        <p className="muted">Cap space affects whether trades can be completed. Full negotiations arrive later.</p>
      </section>

      {warnings.length > 0 && (
        <section className="panel-section panel-section--warning">
          <h3>Cap Warnings</h3>
          {warnings.map((warning) => (
            <p className={warning.includes("over") ? "error-text" : "warning-text"} key={warning}>
              {warning}
            </p>
          ))}
        </section>
      )}

      {franchise.seasonPhase === "reSigning" && (
        <section className="panel-section">
          <h3>Re-Signing Board</h3>
          <p className="muted">Unsigned UFAs enter the open market if not re-signed. RFAs remain controlled but need a new deal to play.</p>
          <div className="room-grid room-grid--two">
            <div className="asset-list">
              {pending.length ? (
                pending.map((player) => {
                  const playerDemand = createContractDemand(player, team, franchise);
                  return (
                    <article key={player.id} className={selected?.id === player.id ? "is-selected" : ""}>
                      <strong>{player.displayName}</strong>
                      <span>
                        {player.position} | {player.overall} OVR | {player.contract.expiryStatus} | demand {formatMoney(playerDemand.demandSalary)} / {playerDemand.demandYears} yr
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlayerId(player.id);
                          setSalary(playerDemand.demandSalary);
                          setYears(playerDemand.demandYears);
                          setRole(player.roleExpectation);
                        }}
                      >
                        Build Offer
                      </button>
                    </article>
                  );
                })
              ) : (
                <p className="empty-state">No unsigned expiring players need a decision.</p>
              )}
            </div>
            <div className="line-editor line-editor--pair">
              <label className="select-field">
                <span>Salary / cap hit</span>
                <input type="number" min="775000" step="25000" value={salary} onChange={(event) => setSalary(Number(event.target.value))} />
              </label>
              <label className="select-field">
                <span>Years</span>
                <input type="number" min="1" max="8" value={years} onChange={(event) => setYears(Number(event.target.value))} />
              </label>
              <label className="select-field">
                <span>Role promise</span>
                <select value={role} onChange={(event) => setRole(event.target.value as RoleExpectation)}>
                  {ROLES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <div>
                <strong>{selected?.displayName ?? "No player selected"}</strong>
                <p className="muted">{demand?.headline ?? "Select an expiring player to see demand."}</p>
                <p className={calculateCapSpace(team) + (selected?.contract.capHit ?? 0) - salary < 0 ? "error-text" : "muted"}>
                  Projected cap space after offer: {formatMoney(calculateCapSpace(team) + (selected?.contract.capHit ?? 0) - salary)}
                </p>
              </div>
              <button type="button" disabled={!selected} onClick={() => selected && submitContractOffer(selected.id, salary, years, role)}>
                Submit Offer
              </button>
              <button type="button" onClick={() => window.confirm("Advance to free agency? Unsigned UFAs will leave for the market.") && advanceSeasonPhase()}>
                Advance to Free Agency
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Contract Table</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Age</th>
                  <th>OVR</th>
                  <th>POT</th>
                  <th>Role</th>
                  <th>Cap Hit</th>
                  <th>Salary</th>
                  <th>Years</th>
                  <th>Expiry</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {[...team.roster].sort((a, b) => b.contract.capHit - a.contract.capHit).map((player) => (
                  <tr key={player.id}>
                    <td>{player.displayName}</td>
                    <td>{player.position}</td>
                    <td>{player.age}</td>
                    <td>{player.overall}</td>
                    <td>{player.potential}</td>
                    <td>{player.roleExpectation}</td>
                    <td>{formatMoney(player.contract.capHit)}</td>
                    <td>{formatMoney(player.contract.salary)}</td>
                    <td>{player.contract.yearsRemaining}</td>
                    <td>{player.contract.expiryStatus}</td>
                    <td>{contractValueRisk(player)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-section">
          <h3>Expiring Contracts</h3>
          {expiring.length ? (
            <div className="asset-list">
              {expiring.slice(0, 8).map((player) => (
                <article key={player.id}>
                  <strong>{player.displayName}</strong>
                  <span>
                    {player.position} | {player.overall} OVR | {formatMoney(player.contract.capHit)} | {player.contract.expiryStatus}
                  </span>
                  <small>Extension negotiation coming later.</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No urgent expiries on the board.</p>
          )}

          <h3>Contract Risk Notes</h3>
          <div className="asset-list">
            {risks.map(({ player, note, risk }) => (
              <article key={player.id}>
                <strong>{player.displayName} | {risk}</strong>
                <span>{note}</span>
              </article>
            ))}
          </div>

          <h3>Draft Pick Inventory</h3>
          <div className="asset-list">
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
