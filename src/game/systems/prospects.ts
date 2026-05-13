import { contractSummary, createContractForPlayer, calculateCapSpace } from "./contracts";
import { autoFillBestLineup } from "./lineupValidation";
import { SeededRng, clamp } from "../rng";
import type { FranchiseState, NewsItem, Player, Prospect, ProspectRights, SkaterAttributes, GoalieAttributes, Team, DraftSelection } from "../types";

const ENTRY_CAP_HIT = 950_000;
const ACTIVE_ROSTER_LIMIT = 30;

export function convertProspectToRights(selection: DraftSelection, prospect: Prospect): ProspectRights {
  return {
    prospectId: prospect.id,
    teamId: selection.teamId,
    acquiredYear: selection.year,
    acquiredRound: selection.round,
    acquiredPickNumber: selection.pickNumber,
    displayName: prospect.displayName,
    position: prospect.position,
    age: prospect.age,
    nationality: prospect.nationality,
    archetype: prospect.archetype,
    potentialRangeLabel: `${Math.max(40, prospect.scouting.estimatedPotentialLow)}-${Math.min(99, prospect.scouting.estimatedPotentialHigh)} POT`,
    signed: false,
    rightsExpireYear: selection.year + 4,
    source: "draft"
  };
}

export function createPlayerFromProspectRights(rights: ProspectRights, rng = new SeededRng(`${rights.prospectId}-entry`)): Player {
  const estimatedPotential = Number.parseInt(rights.potentialRangeLabel, 10);
  const potential = clamp((Number.isFinite(estimatedPotential) ? estimatedPotential + rng.int(2, 10) : rng.int(72, 88)), 60, 96);
  const overall = clamp(Math.min(potential - 2, rng.int(55, 70) + (rights.acquiredRound === 1 ? 4 : 0)), 48, 82);
  const [firstName = rights.displayName, ...lastParts] = rights.displayName.split(" ");
  const lastName = lastParts.join(" ") || "Prospect";
  const playerBase = {
    age: rights.age,
    overall,
    potential,
    position: rights.position,
    roleExpectation: inferEntryRole(rights.position, overall)
  };
  const contract = {
    ...createContractForPlayer(playerBase, rng),
    salary: ENTRY_CAP_HIT,
    capHit: ENTRY_CAP_HIT,
    yearsRemaining: 3,
    expiryStatus: "RFA" as const,
    signedAtAge: rights.age,
    rolePromise: playerBase.roleExpectation
  };
  return {
    id: `player-${rights.prospectId}`,
    teamId: rights.teamId,
    firstName,
    lastName,
    displayName: rights.displayName,
    age: rights.age,
    position: rights.position,
    handedness: rng.chance(0.6) ? "L" : "R",
    nationality: rights.nationality,
    archetype: rights.archetype,
    personality: "Rookie Sponge",
    overall,
    potential,
    roleExpectation: playerBase.roleExpectation,
    morale: rng.int(55, 74),
    form: rng.int(45, 62),
    fatigue: rng.int(8, 24),
    injuryStatus: "healthy",
    injuryGamesRemaining: 0,
    attributes: rights.position === "G" ? goalieAttributes(overall, rng) : skaterAttributes(overall, rng),
    stats: emptyStats(),
    contract,
    contractSummary: contractSummary(contract)
  };
}

export function signProspect(franchise: FranchiseState, prospectId: string): FranchiseState {
  const teamId = franchise.selectedTeamId;
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const rights = franchise.prospectPools[teamId]?.find((candidate) => candidate.prospectId === prospectId);
  if (!team || !rights || rights.signed) return franchise;
  if (team.roster.length >= ACTIVE_ROSTER_LIMIT || calculateCapSpace(team) < ENTRY_CAP_HIT) {
    return {
      ...franchise,
      inbox: [
        {
          id: `prospect-blocked-${prospectId}-${franchise.league.currentDate}`,
          type: "prospect" as const,
          date: franchise.league.currentDate,
          headline: "Pipeline Desk: Prospect signing blocked",
          body:
            team.roster.length >= ACTIVE_ROSTER_LIMIT
              ? "Active roster is at the 30-player prototype limit."
              : "The entry contract would not fit under the cap.",
          severity: "medium" as const,
          teamId
        },
        ...franchise.inbox
      ].slice(0, 60)
    };
  }
  const player = createPlayerFromProspectRights(rights, new SeededRng(`${franchise.franchiseId}-${prospectId}-sign`));
  const nextTeam = normalizeTeam({
    ...team,
    roster: [...team.roster, player]
  });
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) => (candidate.id === teamId ? nextTeam : candidate))
    },
    prospectPools: {
      ...franchise.prospectPools,
      [teamId]: (franchise.prospectPools[teamId] ?? []).map((candidate) =>
        candidate.prospectId === prospectId ? { ...candidate, signed: true } : candidate
      )
    },
    inbox: [...createProspectSigningNews(player, team), ...franchise.inbox].slice(0, 60),
    transactionLog: [
      {
        id: `prospect-sign-${prospectId}`,
        date: franchise.league.currentDate,
        type: "prospect" as const,
        headline: "Prospect signed",
        details: `${player.displayName} signed a three-year entry contract.`,
        teamIds: [teamId],
        playerIds: [player.id]
      },
      ...franchise.transactionLog
    ].slice(0, 50),
    updatedAt: new Date().toISOString()
  };
}

export function getProspectPoolSummary(franchise: FranchiseState, teamId: string): string[] {
  const pool = franchise.prospectPools[teamId] ?? [];
  const byPosition = new Map<string, number>();
  pool.filter((rights) => !rights.signed).forEach((rights) => byPosition.set(rights.position, (byPosition.get(rights.position) ?? 0) + 1));
  return [
    `${pool.filter((rights) => !rights.signed).length} unsigned prospects`,
    ...Array.from(byPosition.entries()).map(([position, count]) => `${position}: ${count}`)
  ];
}

export function rankProspectPool(franchise: FranchiseState, teamId: string): ProspectRights[] {
  return [...(franchise.prospectPools[teamId] ?? [])].sort((a, b) => {
    if (a.signed !== b.signed) return a.signed ? 1 : -1;
    return a.acquiredRound - b.acquiredRound || a.acquiredPickNumber - b.acquiredPickNumber;
  });
}

export function createProspectSigningNews(player: Player, team: Team): NewsItem[] {
  return [
    {
      id: `prospect-signing-${player.id}`,
      type: "prospect",
      date: new Date().toISOString().slice(0, 10),
      headline: `Pipeline Desk: ${player.displayName} signs with ${team.nickname}`,
      body: `${player.position} prospect joins the active roster on a low-cost entry deal. Minor-league development remains a later system.`,
      severity: player.potential >= 84 ? "medium" : "low",
      teamId: team.id,
      playerId: player.id
    }
  ];
}

function normalizeTeam(team: Team): Team {
  return {
    ...team,
    lines: autoFillBestLineup(team).lineup
  };
}

function emptyStats(): Player["stats"] {
  return {
    gamesPlayed: 0,
    goals: 0,
    assists: 0,
    points: 0,
    plusMinus: 0,
    penaltyMinutes: 0,
    shots: 0,
    hits: 0,
    blocks: 0,
    goalieWins: 0,
    goalieLosses: 0,
    saves: 0,
    goalsAgainst: 0,
    shutouts: 0
  };
}

function inferEntryRole(position: Player["position"], overall: number): Player["roleExpectation"] {
  if (position === "G") return overall >= 72 ? "Backup" : "Depth";
  if (position === "LD" || position === "RD") return overall >= 73 ? "Third Pair" : "Depth";
  return overall >= 73 ? "Middle Six" : "Depth";
}

function skaterAttributes(overall: number, rng: SeededRng): SkaterAttributes {
  const attr = () => clamp(overall + rng.int(-8, 9), 40, 99);
  return {
    skating: attr(),
    shooting: attr(),
    passing: attr(),
    puckHandling: attr(),
    defense: attr(),
    physicality: attr(),
    hockeyIQ: attr(),
    discipline: attr(),
    consistency: attr(),
    leadership: attr(),
    stamina: attr()
  };
}

function goalieAttributes(overall: number, rng: SeededRng): GoalieAttributes {
  const attr = () => clamp(overall + rng.int(-8, 9), 40, 99);
  return {
    reflexes: attr(),
    positioning: attr(),
    reboundControl: attr(),
    puckTracking: attr(),
    athleticism: attr(),
    mentalToughness: attr(),
    consistency: attr(),
    stamina: attr()
  };
}
