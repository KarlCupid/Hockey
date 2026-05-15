import { createFanPulse, createMediaNarrative, getFanSentimentBand } from "../../game/systems/fanMedia";
import { getMediaPressureBand, getTeamChemistryBand, getTeamDynamics } from "../../game/systems/relationships";
import type { FranchiseState } from "../../game/types";
import { StatBadge } from "./StatBadge";

export function TeamDynamicsPanel({ franchise }: { franchise: FranchiseState }) {
  const dynamics = getTeamDynamics(franchise, franchise.selectedTeamId);
  return (
    <section className="panel-section">
      <h3>Team Dynamics</h3>
      <div className="badge-row">
        <StatBadge label="Chemistry" value={`${dynamics.chemistry} | ${getTeamChemistryBand(dynamics.chemistry)}`} tone={dynamics.chemistry >= 62 ? "good" : dynamics.chemistry <= 42 ? "bad" : "warn"} />
        <StatBadge label="Room Mood" value={dynamics.roomMood} />
        <StatBadge label="Media" value={`${dynamics.mediaPressure} | ${getMediaPressureBand(dynamics.mediaPressure)}`} tone={dynamics.mediaPressure >= 70 ? "bad" : dynamics.mediaPressure >= 55 ? "warn" : "good"} />
        <StatBadge label="Fans" value={`${dynamics.fanSentiment} | ${getFanSentimentBand(dynamics.fanSentiment)}`} tone={dynamics.fanSentiment >= 62 ? "good" : dynamics.fanSentiment <= 42 ? "bad" : "warn"} />
        <StatBadge label="Owner" value={`${dynamics.ownerTrust}/100`} tone={dynamics.ownerTrust >= 62 ? "good" : dynamics.ownerTrust <= 42 ? "bad" : "warn"} />
      </div>
      <p className="muted">{createMediaNarrative(franchise)}</p>
      <p className="muted">{createFanPulse(franchise)}</p>
    </section>
  );
}
