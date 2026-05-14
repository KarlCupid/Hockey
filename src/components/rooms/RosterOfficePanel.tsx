import { useMemo } from "react";
import type { ReactNode } from "react";
import { calculateActiveRosterCapHit, calculateAffiliateCommitments, calculateCapSpace, calculateOrganizationCapCommitments, formatMoney } from "../../game/systems/contracts";
import { getDepthChart } from "../../game/systems/rosterManagement";
import { getPlayerRosterStatus, getRosterStatusLabel, validateRosterForGame, validateRosterForSeason } from "../../game/systems/rosterRules";
import type { Player } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import { StatBadge } from "../hud/StatBadge";

export function RosterOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const callUpPlayer = useFranchiseStore((state) => state.callUpPlayer);
  const sendDownPlayer = useFranchiseStore((state) => state.sendDownPlayer);
  const scratchPlayer = useFranchiseStore((state) => state.scratchPlayer);
  const activatePlayer = useFranchiseStore((state) => state.activatePlayer);
  const placePlayerOnIR = useFranchiseStore((state) => state.placePlayerOnIR);
  const removePlayerFromIR = useFranchiseStore((state) => state.removePlayerFromIR);

  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const gameReport = validateRosterForGame(team);
  const seasonReport = validateRosterForSeason(team);
  const depth = useMemo(() => getDepthChart(team), [team]);
  const activePlayers = team.roster.filter((player) => getPlayerRosterStatus(player) === "active");
  const scratchedPlayers = team.roster.filter((player) => getPlayerRosterStatus(player) === "scratched");
  const affiliatePlayers = team.roster.filter((player) => getPlayerRosterStatus(player) === "affiliate");
  const irPlayers = team.roster.filter((player) => getPlayerRosterStatus(player) === "injuredReserve");

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <StatBadge label="Active Count" value={`${gameReport.activeCount}/${team.activeRosterLimit}`} tone={gameReport.activeCount > team.activeRosterLimit ? "bad" : "default"} />
        <StatBadge label="Healthy F/D/G" value={`${gameReport.healthyForwardCount}/${gameReport.healthyDefenseCount}/${gameReport.healthyGoalieCount}`} tone={gameReport.errors.length ? "warn" : "good"} />
        <StatBadge label="Active Cap" value={formatMoney(calculateActiveRosterCapHit(team))} tone={calculateCapSpace(team) < 0 ? "bad" : "default"} />
        <StatBadge label="Cap Space" value={formatMoney(calculateCapSpace(team))} tone={calculateCapSpace(team) < 0 ? "bad" : "good"} />
        <StatBadge label="Game" value={gameReport.errors.length ? "Invalid" : "Ready"} tone={gameReport.errors.length ? "bad" : "good"} />
        <StatBadge label="Season" value={seasonReport.errors.length ? "Needs work" : "Stable"} tone={seasonReport.errors.length ? "warn" : "good"} />
      </section>

      <section className="panel-section">
        <h3>Roster Health Summary</h3>
        <div className="season-pulse">
          <span>Forwards <strong>{gameReport.forwardCount}</strong></span>
          <span>Defense <strong>{gameReport.defenseCount}</strong></span>
          <span>Goalies <strong>{gameReport.goalieCount}</strong></span>
          <span>Organization commitments <strong>{formatMoney(calculateOrganizationCapCommitments(team))}</strong></span>
          <span>Affiliate commitments <strong>{formatMoney(calculateAffiliateCommitments(team))}</strong></span>
        </div>
        <p className="muted">Affiliate players are cap-exempt in this simplified fictional ruleset. Waivers and retained salary are not implemented.</p>
        {[...gameReport.errors, ...gameReport.warnings, ...gameReport.recommendations].map((message) => (
          <p className={gameReport.errors.includes(message) ? "error-text" : "warning-text"} key={message}>{message}</p>
        ))}
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Depth Chart</h3>
          <DepthColumn title="LW" players={depth.forwards.LW} />
          <DepthColumn title="C" players={depth.forwards.C} />
          <DepthColumn title="RW" players={depth.forwards.RW} />
          <DepthColumn title="LD" players={depth.defense.LD} />
          <DepthColumn title="RD" players={depth.defense.RD} />
          <DepthColumn title="G" players={depth.goalies} />
        </section>

        <section className="panel-section">
          <h3>Roster Move Log</h3>
          <div className="asset-list asset-list--compact">
            {(team.rosterMoveLog ?? []).slice(0, 12).map((move) => {
              const player = team.roster.find((candidate) => candidate.id === move.playerId);
              return (
                <article key={move.id}>
                  <strong>{player?.displayName ?? "Roster move"}</strong>
                  <span>{move.date} | {getRosterStatusLabel(move.fromStatus)} to {getRosterStatusLabel(move.toStatus)}</span>
                  <small>{move.reason}</small>
                </article>
              );
            })}
            {!team.rosterMoveLog?.length && <p className="empty-state">Roster moves will appear here after call-ups, scratches, IR moves, and AI repairs.</p>}
          </div>
        </section>
      </div>

      <RosterTable
        title="Active Roster"
        players={activePlayers}
        actions={(player) => (
          <>
            <button type="button" onClick={() => scratchPlayer(team.id, player.id)}>Scratch</button>
            <button type="button" onClick={() => sendDownPlayer(team.id, player.id)}>Send Down</button>
            <button type="button" disabled={player.injuryStatus === "healthy"} onClick={() => placePlayerOnIR(team.id, player.id)}>IR</button>
          </>
        )}
      />

      <RosterTable
        title="Scratches / Reserve"
        players={scratchedPlayers}
        actions={(player) => (
          <>
            <button type="button" onClick={() => activatePlayer(team.id, player.id)}>Activate</button>
            <button type="button" onClick={() => sendDownPlayer(team.id, player.id)}>Send Down</button>
          </>
        )}
      />

      <RosterTable
        title={`${team.affiliate.fullName} Affiliate Roster`}
        players={affiliatePlayers}
        actions={(player) => (
          <>
            <button type="button" onClick={() => callUpPlayer(team.id, player.id)}>Call Up</button>
            <span className="muted">{player.developmentPath?.track ?? "Affiliate Development"}</span>
          </>
        )}
      />

      <RosterTable
        title="Injured Reserve"
        players={irPlayers}
        actions={(player) => (
          <button type="button" disabled={player.injuryStatus !== "healthy"} onClick={() => removePlayerFromIR(team.id, player.id)}>
            Remove from IR
          </button>
        )}
      />
    </div>
  );
}

function DepthColumn({ title, players }: { title: string; players: Player[] }) {
  return (
    <div className="asset-list asset-list--compact">
      <strong>{title}</strong>
      {players.slice(0, 7).map((player) => (
        <article key={player.id}>
          <strong>{player.displayName}</strong>
          <span>{player.overall} OVR | {player.potential} POT | {getRosterStatusLabel(getPlayerRosterStatus(player))}</span>
        </article>
      ))}
    </div>
  );
}

function RosterTable({ title, players, actions }: { title: string; players: Player[]; actions: (player: Player) => ReactNode }) {
  return (
    <section className="panel-section">
      <h3>{title}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th>OVR</th>
              <th>POT</th>
              <th>Age</th>
              <th>Role</th>
              <th>Status</th>
              <th>Cap</th>
              <th>Fatigue</th>
              <th>Injury</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id}>
                <td>{player.displayName}</td>
                <td>{player.position}</td>
                <td>{player.overall}</td>
                <td>{player.potential}</td>
                <td>{player.age}</td>
                <td>{player.roleExpectation}</td>
                <td>{getRosterStatusLabel(getPlayerRosterStatus(player))}</td>
                <td>{formatMoney(player.contract.capHit)}</td>
                <td>{player.fatigue}</td>
                <td>{player.injuryStatus === "healthy" ? "-" : `${player.injuryStatus} (${player.injuryGamesRemaining})`}</td>
                <td><div className="button-row">{actions(player)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!players.length && <p className="empty-state">No players in this group.</p>}
    </section>
  );
}
