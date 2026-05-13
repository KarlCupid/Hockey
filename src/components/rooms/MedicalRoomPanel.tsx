import { activeInjuries, fatigueRisks } from "../../game/systems/injuries";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

export function MedicalRoomPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const injuries = activeInjuries(team.roster);
  const risks = fatigueRisks(team.roster);

  return (
    <div className="room-grid room-grid--two">
      <section className="panel-section">
        <h3>Injury Board</h3>
        {injuries.length ? (
          <div className="news-list">
            {injuries.map((player) => (
              <article className="medical-row" key={player.id}>
                <strong>{player.displayName}</strong>
                <span>
                  {player.position} | {player.injuryStatus} | {player.injuryGamesRemaining} game(s) remaining
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No active injuries. Training staff reports normal workload.</p>
        )}
      </section>
      <section className="panel-section">
        <h3>Fatigue Risk</h3>
        {risks.length ? (
          risks.map((player) => (
            <article className="medical-row" key={player.id}>
              <strong>{player.displayName}</strong>
              <span>
                {player.position} | Fatigue {player.fatigue} | {player.roleExpectation}
              </span>
            </article>
          ))
        ) : (
          <p className="empty-state">No red flags. Recovery loads are under control.</p>
        )}
        <h3>Team Health Summary</h3>
        <p className="muted">
          {injuries.length} active injury case(s), {risks.length} fatigue watch player(s). High pace and physicality increase risk in the sim.
        </p>
      </section>
    </div>
  );
}
