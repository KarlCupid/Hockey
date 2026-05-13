import { useState } from "react";
import { PlayerCard } from "../hud/PlayerCard";
import { StatBadge } from "../hud/StatBadge";
import { fatigueBand, formBand, moraleBand } from "../../game/systems/morale";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import type { Player } from "../../game/types";
import { useUiStore } from "../../store/uiStore";

type RosterFilter = "all" | "forwards" | "defense" | "goalies" | "injured" | "tired" | "unhappy" | "hot";
type RosterSort = "overall" | "name" | "points" | "fatigue";

const FILTERS: Array<{ id: RosterFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "forwards", label: "Forwards" },
  { id: "defense", label: "Defense" },
  { id: "goalies", label: "Goalies" },
  { id: "injured", label: "Injured" },
  { id: "tired", label: "Tired" },
  { id: "unhappy", label: "Unhappy" },
  { id: "hot", label: "Hot form" }
];

export function LockerRoomPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [sort, setSort] = useState<RosterSort>("overall");
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const selected = team.roster.find((player) => player.id === selectedId) ?? team.roster[0];
  const filtered = filterRoster(team.roster, filter).sort((a, b) => sortRoster(a, b, sort));
  const average = (selector: (player: Player) => number) => Math.round(team.roster.reduce((sum, player) => sum + selector(player), 0) / team.roster.length);
  const selectPlayer = (playerId: string) => {
    setSelectedId(playerId);
    markChecklistItem("openPlayerCard");
  };

  return (
    <div className="room-grid room-grid--locker">
      <section className="panel-section">
        <h3>Room Temperature</h3>
        <div className="badge-row">
          <StatBadge label="Morale" value={moraleBand(average((player) => player.morale))} />
          <StatBadge label="Form" value={formBand(average((player) => player.form))} />
          <StatBadge label="Fatigue" value={fatigueBand(average((player) => player.fatigue))} />
        </div>
        <div className="toolbar-row">
          <div className="segmented-control" aria-label="Roster filters">
            {FILTERS.map((item) => (
              <button className={filter === item.id ? "is-active" : ""} key={item.id} type="button" onClick={() => setFilter(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <label className="compact-select">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as RosterSort)}>
              <option value="overall">Overall</option>
              <option value="name">Name</option>
              <option value="points">Points</option>
              <option value="fatigue">Fatigue</option>
            </select>
          </label>
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
              {filtered.map((player) => (
                <tr key={player.id} className={player.id === selected.id ? "is-selected" : ""} onClick={() => selectPlayer(player.id)}>
                  <td>{player.displayName}</td>
                  <td>{player.position}</td>
                  <td>{player.overall}</td>
                  <td>{player.roleExpectation}</td>
                  <td>{moraleBand(player.morale)}</td>
                  <td>{formBand(player.form)}</td>
                  <td>{fatigueBand(player.fatigue)}</td>
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
        {!filtered.length && <p className="empty-state">No players match that filter.</p>}
      </section>
      <PlayerCard player={selected} />
    </div>
  );
}

function filterRoster(players: Player[], filter: RosterFilter): Player[] {
  switch (filter) {
    case "forwards":
      return players.filter((player) => ["LW", "C", "RW"].includes(player.position));
    case "defense":
      return players.filter((player) => player.position === "LD" || player.position === "RD");
    case "goalies":
      return players.filter((player) => player.position === "G");
    case "injured":
      return players.filter((player) => player.injuryStatus !== "healthy");
    case "tired":
      return players.filter((player) => player.fatigue >= 65);
    case "unhappy":
      return players.filter((player) => player.morale <= 45);
    case "hot":
      return players.filter((player) => player.form >= 72);
    case "all":
    default:
      return [...players];
  }
}

function sortRoster(a: Player, b: Player, sort: RosterSort): number {
  if (sort === "name") return a.displayName.localeCompare(b.displayName);
  if (sort === "points") return b.stats.points - a.stats.points || b.overall - a.overall;
  if (sort === "fatigue") return b.fatigue - a.fatigue || b.overall - a.overall;
  return b.overall - a.overall || a.displayName.localeCompare(b.displayName);
}
