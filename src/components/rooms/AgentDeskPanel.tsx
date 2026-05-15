import { useState } from "react";
import { getAgentPressureLevel } from "../../game/systems/agentInteractions";
import { getDecisionEventsForRoom } from "../../game/systems/decisionEvents";
import { formatMoney } from "../../game/systems/contracts";
import { createContractDemand } from "../../game/systems/contractNegotiation";
import { getPlayerRelationship, getPlayerTrustBand } from "../../game/systems/relationships";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import { DecisionEventCard } from "../hud/DecisionEventCard";
import { RelationshipBadge } from "../hud/RelationshipBadge";
import { StatBadge } from "../hud/StatBadge";

export function AgentDeskPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const resolveDecisionEvent = useFranchiseStore((state) => state.resolveDecisionEvent);
  const generateSampleDecisionEvent = useFranchiseStore((state) => state.generateSampleDecisionEvent);
  const [agentId, setAgentId] = useState<string | undefined>();
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const events = getDecisionEventsForRoom(franchise, "agents");
  const selectedAgent = franchise.agents.find((agent) => agent.id === agentId) ?? franchise.agents[0];
  const clients = selectedAgent ? team.roster.filter((player) => selectedAgent.clientPlayerIds.includes(player.id)) : [];

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <StatBadge label="Agents" value={franchise.agents.length} />
        <StatBadge label="Active Calls" value={events.length} tone={events.some((event) => event.severity === "high" || event.severity === "critical") ? "warn" : "default"} />
        <StatBadge label="Selected Pressure" value={selectedAgent ? getAgentPressureLevel(selectedAgent) : "none"} />
        <button type="button" onClick={() => generateSampleDecisionEvent("agent")}>Generate agent call</button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Agent List</h3>
          <div className="asset-list">
            {franchise.agents.map((agent) => (
              <article key={agent.id} className={selectedAgent?.id === agent.id ? "is-selected" : ""}>
                <strong>{agent.displayName}</strong>
                <span>{agent.personality} | relationship {agent.relationship}/100 | public pressure {agent.publicPressure}/100</span>
                <small>{agent.negotiationStyle}</small>
                <button type="button" onClick={() => setAgentId(agent.id)}>Review Clients</button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <h3>Active Agent Calls</h3>
          <div className="news-list">
            {events.length ? events.map((event) => <DecisionEventCard key={event.id} event={event} onResolve={resolveDecisionEvent} />) : <p className="empty-state">No agent calls are active.</p>}
          </div>
          <h4>Negotiation Impact</h4>
          <p className="muted">Agent relationship, public pressure, player trust, and role satisfaction lightly affect demand and acceptance. This stays simplified and deterministic.</p>
        </section>
      </div>

      <section className="panel-section">
        <h3>{selectedAgent?.displayName ?? "Agent"} Clients</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Player</th><th>Role</th><th>Trust</th><th>Role Sat.</th><th>Demand</th><th>Pressure</th></tr>
            </thead>
            <tbody>
              {clients.map((player) => {
                const relationship = getPlayerRelationship(franchise, player.id);
                const demand = createContractDemand(player, team, franchise);
                return (
                  <tr key={player.id}>
                    <td>{player.displayName}</td>
                    <td>{player.roleExpectation}</td>
                    <td>{relationship.trust} | {getPlayerTrustBand(relationship.trust)}</td>
                    <td>{relationship.roleSatisfaction}/100</td>
                    <td>{formatMoney(demand.demandSalary)} / {demand.demandYears} yr</td>
                    <td><RelationshipBadge relationship={relationship} agent={selectedAgent} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!clients.length && <p className="empty-state">This agent has no current clients on your roster.</p>}
      </section>
    </div>
  );
}
