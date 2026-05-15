import { getPlayerTrustBand } from "../../game/systems/relationships";
import type { AgentProfile, PlayerRelationship } from "../../game/types";

export function RelationshipBadge({ relationship, agent }: { relationship?: PlayerRelationship; agent?: AgentProfile }) {
  if (!relationship) return <span className="relationship-badge">Relationship rebuilding</span>;
  const tone = relationship.trust >= 65 ? "good" : relationship.trust <= 42 ? "bad" : "warn";
  return (
    <span className={`relationship-badge relationship-badge--${tone}`}>
      Trust {relationship.trust}/100 | {getPlayerTrustBand(relationship.trust)}
      {agent ? ` | Agent: ${agent.displayName}` : ""}
    </span>
  );
}
