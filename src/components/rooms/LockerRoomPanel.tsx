import { useState } from "react";
import { PlayerCard } from "../hud/PlayerCard";
import { StatBadge } from "../hud/StatBadge";
import { fatigueBand, formBand, moraleBand } from "../../game/systems/morale";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import type { Player } from "../../game/types";

export function LockerRoomPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const selected = team.roster.find((player) => player.id === selectedId) ?? team.roster[0];
  const average = (selector: (player: Player) => number) => Math.round(team.roster.reduce((sum, player) => sum + selector(player), 0) / team.roster.length);

  return (
    <div className="room-grid room-grid--locker">
      <section className="panel-section">
        <h3>Room Temperature</h3>
        <div className="badge-row">
          <StatBadge label="Morale" value={moraleBand(average((player) => player.morale))} />
          <StatBadge label="Form" value={formBand(average((player) => player.form))} />
          <StatBadge label="Fatigue" value={fatigueBand(average((player) => player.fatigue))} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Pos</th>
                <th>OVR</th>
                <th>Role</th>
                <th>Morale</th>
                <th>Form</th>
                <th>Fatigue</th>
                <th>Injury</th>
                <th>Stats</th>
              </tr>
            </thead>
            <tbody>
              {team.roster.map((player) => (
                <tr key={player.id} className={player.id === selected.id ? "is-selected" : ""} onClick={() => setSelectedId(player.id)}>
                  <td>{player.displayName}</td>
                  <td>{player.position}</td>
                  <td>{player.overall}</td>
                  <td>{player.roleExpectation}</td>
                  <td>{player.morale}</td>
                  <td>{player.form}</td>
                  <td>{player.fatigue}</td>
                  <td>{player.injuryStatus === "healthy" ? "-" : `${player.injuryStatus} (${player.injuryGamesRemaining})`}</td>
                  <td>
                    {player.position === "G"
                      ? `${player.stats.goalieWins}-${player.stats.goalieLosses}, ${player.stats.saves} SV`
                      : `${player.stats.goals}-${player.stats.assists}-${player.stats.points}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <PlayerCard player={selected} />
    </div>
  );
}
