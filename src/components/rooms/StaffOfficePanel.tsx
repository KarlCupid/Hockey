import { useState } from "react";
import { calculateTeamStaffModifiers, STAFF_ROLES, staffImpactNote } from "../../game/systems/staff";
import type { StaffRole } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

export function StaffOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const hireStaff = useFranchiseStore((state) => state.hireStaff);
  const fireStaff = useFranchiseStore((state) => state.fireStaff);
  const [roleFilter, setRoleFilter] = useState<StaffRole | "All">("All");

  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const staff = franchise.staffState.teamStaff[team.id] ?? [];
  const market = franchise.staffState.staffMarket.filter((member) => roleFilter === "All" || member.role === roleFilter);
  const mods = calculateTeamStaffModifiers(franchise.staffState, team.id);

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <div><small>Current Staff</small><strong>{staff.length}/{STAFF_ROLES.length}</strong></div>
        <div><small>Staff Market</small><strong>{franchise.staffState.staffMarket.length}</strong></div>
        <div><small>Scouting Boost</small><strong>{mods.scouting >= 0 ? "+" : ""}{mods.scouting}</strong></div>
        <div><small>Development Boost</small><strong>{mods.development >= 0 ? "+" : ""}{mods.development}</strong></div>
        <p className="muted">Staff ratings slightly improve related systems. Salaries are tracked lightly for prototype flavor.</p>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Current Staff</h3>
          <div className="asset-list">
            {STAFF_ROLES.map((role) => {
              const member = staff.find((candidate) => candidate.role === role);
              return (
                <article key={role}>
                  <strong>{role}: {member?.displayName ?? "Vacant"}</strong>
                  <span>{staffImpactNote(role)}</span>
                  {member ? (
                    <>
                      <small>
                        Tactics {member.tacticalKnowledge} | Dev {member.development} | Scout {member.scouting} | Med {member.medical} | Neg {member.negotiation}
                      </small>
                      <button type="button" onClick={() => fireStaff(member.id)}>Release</button>
                    </>
                  ) : (
                    <small>Hire from the market to fill this chair.</small>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel-section">
          <h3>Staff Market</h3>
          <label className="compact-select">
            <span>Role filter</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as StaffRole | "All")}>
              <option value="All">All</option>
              {STAFF_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <div className="asset-list">
            {market.map((member) => (
              <article key={member.id}>
                <strong>{member.displayName}</strong>
                <span>{member.role} | rep {member.reputation} | {member.personality}</span>
                <small>
                  Tactics {member.tacticalKnowledge} | Dev {member.development} | Scout {member.scouting} | Med {member.medical} | Analytics {member.analytics} | Negotiation {member.negotiation}
                </small>
                <button type="button" onClick={() => hireStaff(member.id, member.role)}>Hire / Replace {member.role}</button>
              </article>
            ))}
          </div>

          <h3>Staff Impact Summary</h3>
          <div className="season-pulse">
            <span>Scouting <strong>{mods.scouting >= 0 ? "+" : ""}{mods.scouting}</strong></span>
            <span>Development <strong>{mods.development >= 0 ? "+" : ""}{mods.development}</strong></span>
            <span>Medical <strong>{mods.medical >= 0 ? "+" : ""}{mods.medical}</strong></span>
            <span>Negotiation <strong>{mods.negotiation >= 0 ? "+" : ""}{mods.negotiation}</strong></span>
          </div>

          <h3>Recent Staff Moves</h3>
          <div className="asset-list asset-list--compact">
            {franchise.staffState.recentStaffMoves.length ? (
              franchise.staffState.recentStaffMoves.map((move) => (
                <article key={move.id}>
                  <strong>{move.headline}</strong>
                  <span>{move.details}</span>
                </article>
              ))
            ) : (
              <p className="empty-state">No staff moves yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
