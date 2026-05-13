import { StatBadge } from "../hud/StatBadge";
import { calculateCapSpace, calculateTeamCapHit, contractRiskNote, contractValueRisk, formatMoney, getCapWarnings, getExpiringContracts } from "../../game/systems/contracts";
import { formatPickLabel, getTeamPicks } from "../../game/systems/draftPicks";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

export function ContractCapOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
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
