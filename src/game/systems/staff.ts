import { SeededRng, clamp } from "../rng";
import { generateDisplayName, generateNationality } from "../generators/generateNames";
import type { FranchiseState, NewsItem, StaffMember, StaffModifiers, StaffRole, StaffState, Team, TransactionLogItem } from "../types";

export const STAFF_ROLES: StaffRole[] = [
  "Assistant Coach",
  "Goalie Coach",
  "Development Coach",
  "Head Scout",
  "Medical Lead",
  "Analytics Director",
  "Assistant GM"
];

const PERSONALITIES = [
  "Calm teacher",
  "Demanding tactician",
  "Player-first communicator",
  "Data-driven planner",
  "Old-school grinder",
  "Quiet specialist",
  "High-energy organizer"
];

export function generateStaffForLeague(teams: Team[], rng = new SeededRng("staff-defaults")): StaffState {
  const teamStaff: Record<string, StaffMember[]> = {};
  teams.forEach((team) => {
    teamStaff[team.id] = STAFF_ROLES.map((role) => createStaffMember(role, rng, team.id));
  });
  return {
    teamStaff,
    staffMarket: generateStaffMarket(rng),
    recentStaffMoves: []
  };
}

export function generateStaffMarket(rng = new SeededRng("staff-market"), count = 18): StaffMember[] {
  return Array.from({ length: count }, (_, index) => createStaffMember(STAFF_ROLES[index % STAFF_ROLES.length], rng));
}

export function calculateTeamStaffModifiers(staffState: StaffState | undefined, teamId: string): StaffModifiers {
  const staff = staffState?.teamStaff?.[teamId] ?? [];
  const byRole = (role: StaffRole) => staff.find((member) => member.role === role);
  const ratingMod = (value?: number) => Number((((value ?? 60) - 60) / 10).toFixed(2));
  const morale = staff.reduce((sum, member) => sum + member.moraleImpact, 0) / Math.max(1, staff.length);
  return {
    tactics: ratingMod(byRole("Assistant Coach")?.tacticalKnowledge),
    goalieDevelopment: ratingMod(byRole("Goalie Coach")?.development),
    development: ratingMod(byRole("Development Coach")?.development),
    scouting: ratingMod(byRole("Head Scout")?.scouting),
    medical: ratingMod(byRole("Medical Lead")?.medical),
    analytics: ratingMod(byRole("Analytics Director")?.analytics),
    negotiation: ratingMod(byRole("Assistant GM")?.negotiation),
    morale: Number((morale / 4).toFixed(2))
  };
}

export function hireStaff(franchise: FranchiseState, staffId: string, role?: StaffRole): FranchiseState {
  const incoming = franchise.staffState.staffMarket.find((member) => member.id === staffId);
  if (!incoming) return franchise;
  const targetRole = role ?? incoming.role;
  const teamId = franchise.selectedTeamId;
  const current = franchise.staffState.teamStaff[teamId] ?? [];
  const outgoing = current.find((member) => member.role === targetRole);
  const signed: StaffMember = { ...incoming, role: targetRole, signedTeamId: teamId };
  const teamStaff = current.filter((member) => member.role !== targetRole && member.id !== staffId);
  const move = createStaffMove("Staff hire", `${signed.displayName} joins as ${targetRole}.`, franchise.league.currentDate, teamId);
  return {
    ...franchise,
    staffState: {
      ...franchise.staffState,
      teamStaff: {
        ...franchise.staffState.teamStaff,
        [teamId]: [...teamStaff, signed].sort((a, b) => STAFF_ROLES.indexOf(a.role) - STAFF_ROLES.indexOf(b.role))
      },
      staffMarket: [
        ...franchise.staffState.staffMarket.filter((member) => member.id !== staffId),
        ...(outgoing ? [{ ...outgoing, signedTeamId: undefined, id: `${outgoing.id}-market-${Date.now()}` }] : [])
      ],
      recentStaffMoves: [move, ...franchise.staffState.recentStaffMoves].slice(0, 12)
    },
    transactionLog: [move, ...franchise.transactionLog].slice(0, 40),
    inbox: [...createStaffNews(signed, franchise.league.currentDate, teamId), ...franchise.inbox].slice(0, 50),
    updatedAt: new Date().toISOString()
  };
}

export function fireStaff(franchise: FranchiseState, staffId: string): FranchiseState {
  const teamId = franchise.selectedTeamId;
  const current = franchise.staffState.teamStaff[teamId] ?? [];
  const outgoing = current.find((member) => member.id === staffId);
  if (!outgoing) return franchise;
  const move = createStaffMove("Staff departure", `${outgoing.displayName} leaves the ${outgoing.role} post.`, franchise.league.currentDate, teamId);
  return {
    ...franchise,
    staffState: {
      ...franchise.staffState,
      teamStaff: {
        ...franchise.staffState.teamStaff,
        [teamId]: current.filter((member) => member.id !== staffId)
      },
      staffMarket: [{ ...outgoing, signedTeamId: undefined }, ...franchise.staffState.staffMarket],
      recentStaffMoves: [move, ...franchise.staffState.recentStaffMoves].slice(0, 12)
    },
    transactionLog: [move, ...franchise.transactionLog].slice(0, 40),
    updatedAt: new Date().toISOString()
  };
}

export function replaceStaff(franchise: FranchiseState, outgoingStaffId: string, incomingStaffId: string): FranchiseState {
  const outgoing = franchise.staffState.teamStaff[franchise.selectedTeamId]?.find((member) => member.id === outgoingStaffId);
  return hireStaff(franchise, incomingStaffId, outgoing?.role);
}

export function tickStaffContracts(franchise: FranchiseState): FranchiseState {
  const teamStaff = Object.fromEntries(
    Object.entries(franchise.staffState.teamStaff).map(([teamId, staff]) => [
      teamId,
      staff.map((member) => ({ ...member, yearsRemaining: Math.max(0, member.yearsRemaining - 1) }))
    ])
  );
  return {
    ...franchise,
    staffState: {
      ...franchise.staffState,
      teamStaff
    }
  };
}

export function createStaffNews(member: StaffMember, date: string, teamId: string): NewsItem[] {
  return [
    {
      id: `staff-news-${member.id}-${date}`,
      type: "staff",
      date,
      headline: `Staff Office: ${member.displayName} takes the ${member.role} chair`,
      body: `The hire should slightly shape ${staffImpactNote(member.role).toLowerCase()} through the next season.`,
      severity: member.reputation >= 78 ? "medium" : "low",
      teamId
    }
  ];
}

export function staffImpactNote(role: StaffRole): string {
  const notes: Record<StaffRole, string> = {
    "Assistant Coach": "tactics and team morale",
    "Goalie Coach": "goalie form and goalie development",
    "Development Coach": "player development progress",
    "Head Scout": "scouting certainty and report quality",
    "Medical Lead": "injury recovery and fatigue management",
    "Analytics Director": "trade reads and roster-fit clarity",
    "Assistant GM": "contract and free-agent negotiation"
  };
  return notes[role];
}

function createStaffMember(role: StaffRole, rng: SeededRng, teamId?: string): StaffMember {
  const name = generateDisplayName(rng);
  const roleBoost = (target: StaffRole) => (role === target ? rng.int(10, 20) : rng.int(-4, 9));
  const base = rng.int(48, 76);
  return {
    id: `staff-${role.toLowerCase().replace(/\W+/g, "-")}-${name.firstName.toLowerCase()}-${name.lastName.toLowerCase()}-${rng.int(100, 999)}`,
    displayName: name.displayName,
    role,
    age: rng.int(34, 66),
    nationality: generateNationality(rng),
    tacticalKnowledge: clamp(base + roleBoost("Assistant Coach"), 40, 99),
    development: clamp(base + roleBoost("Development Coach") + roleBoost("Goalie Coach") * 0.35, 40, 99),
    scouting: clamp(base + roleBoost("Head Scout"), 40, 99),
    medical: clamp(base + roleBoost("Medical Lead"), 40, 99),
    analytics: clamp(base + roleBoost("Analytics Director"), 40, 99),
    negotiation: clamp(base + roleBoost("Assistant GM"), 40, 99),
    communication: clamp(base + rng.int(-6, 17), 40, 99),
    moraleImpact: clamp(rng.int(-4, 10) + (base >= 70 ? 3 : 0), -10, 14),
    salary: Math.round((220_000 + base * 9_500 + rng.int(-40_000, 80_000)) / 5_000) * 5_000,
    yearsRemaining: rng.int(1, 3),
    reputation: clamp(base + rng.int(-5, 18), 40, 99),
    personality: rng.pick(PERSONALITIES),
    signedTeamId: teamId
  };
}

function createStaffMove(headline: string, details: string, date: string, teamId: string): TransactionLogItem {
  return {
    id: `staff-move-${teamId}-${date}-${Math.random().toString(16).slice(2)}`,
    date,
    type: "staff",
    headline,
    details,
    teamIds: [teamId]
  };
}
