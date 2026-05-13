export type Position = "LW" | "C" | "RW" | "LD" | "RD" | "G";
export type SkaterPosition = Exclude<Position, "G">;
export type Handedness = "L" | "R";
export type InjuryStatus = "healthy" | "day-to-day" | "out";
export type MoraleBand = "unhappy" | "concerned" | "stable" | "positive" | "thriving";
export type FormBand = "cold" | "struggling" | "steady" | "hot" | "excellent";
export type FatigueBand = "fresh" | "normal" | "tired" | "exhausted";
export type SimulationMode = "instant" | "period" | "broadcast";
export type RoomId = "gm" | "coach" | "locker" | "medical" | "arena" | "standings" | "saves";

export type PlayerArchetype =
  | "Sniper"
  | "Playmaker"
  | "Two-Way Forward"
  | "Power Forward"
  | "Grinder"
  | "Offensive Defenseman"
  | "Defensive Defenseman"
  | "Puck-Moving Defenseman"
  | "Enforcer-lite"
  | "Reflex Goalie"
  | "Positional Goalie"
  | "Hybrid Goalie";

export type Personality =
  | "Leader"
  | "Professional"
  | "Quiet Worker"
  | "Competitive"
  | "Streaky Confidence Player"
  | "Locker-Room Glue"
  | "High-Maintenance Star"
  | "Rookie Sponge"
  | "Veteran Mentor";

export type RoleExpectation =
  | "Franchise Driver"
  | "Top Line"
  | "Top Six"
  | "Middle Six"
  | "Checking Line"
  | "Top Pair"
  | "Second Pair"
  | "Third Pair"
  | "Starter"
  | "Backup"
  | "Depth";

export interface SkaterAttributes {
  skating: number;
  shooting: number;
  passing: number;
  puckHandling: number;
  defense: number;
  physicality: number;
  hockeyIQ: number;
  discipline: number;
  consistency: number;
  leadership: number;
  stamina: number;
}

export interface GoalieAttributes {
  reflexes: number;
  positioning: number;
  reboundControl: number;
  puckTracking: number;
  athleticism: number;
  mentalToughness: number;
  consistency: number;
  stamina: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  penaltyMinutes: number;
  shots: number;
  hits: number;
  blocks: number;
  goalieWins: number;
  goalieLosses: number;
  saves: number;
  goalsAgainst: number;
  shutouts: number;
}

export interface Player {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  age: number;
  position: Position;
  handedness: Handedness;
  nationality: string;
  archetype: PlayerArchetype;
  personality: Personality;
  overall: number;
  potential: number;
  roleExpectation: RoleExpectation;
  morale: number;
  form: number;
  fatigue: number;
  injuryStatus: InjuryStatus;
  injuryGamesRemaining: number;
  attributes: SkaterAttributes | GoalieAttributes;
  stats: PlayerStats;
  contractSummary: string;
}

export interface ForwardLine {
  lw?: string;
  c?: string;
  rw?: string;
}

export interface DefensePair {
  ld?: string;
  rd?: string;
}

export interface GoalieLineup {
  starter?: string;
  backup?: string;
}

export interface Lineup {
  forwardLines: [ForwardLine, ForwardLine, ForwardLine, ForwardLine];
  defensePairs: [DefensePair, DefensePair, DefensePair];
  goalies: GoalieLineup;
}

export interface Tactics {
  forecheckIntensity: number;
  defensiveStructure: number;
  offensiveRisk: number;
  physicality: number;
  pace: number;
  shotVolume: number;
  specialTeamsAggression: number;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  overtimeLosses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  streak: string;
}

export interface TeamStats {
  gamesPlayed: number;
  shotsFor: number;
  shotsAgainst: number;
  powerPlayGoals: number;
  powerPlayAttempts: number;
  penaltyKillGoalsAgainst: number;
  penaltyKillAttempts: number;
}

export interface Team {
  id: string;
  city: string;
  nickname: string;
  fullName: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  marketSize: "Small" | "Medium" | "Large";
  ownerPatience: number;
  fanConfidence: number;
  teamPersonality: string;
  roster: Player[];
  lines: Lineup;
  tactics: Tactics;
  record: TeamRecord;
  stats: TeamStats;
}

export interface ScheduleGame {
  id: string;
  dayIndex: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  result?: {
    homeGoals: number;
    awayGoals: number;
    overtime: boolean;
  };
}

export interface LeagueState {
  id: string;
  seasonYear: number;
  currentDayIndex: number;
  currentDate: string;
  teams: Team[];
  schedule: ScheduleGame[];
  recentResults: string[];
  completed: boolean;
}

export type NewsType =
  | "gameRecap"
  | "injury"
  | "morale"
  | "owner"
  | "media"
  | "rival"
  | "standings"
  | "goalie"
  | "breakout"
  | "pressure"
  | "excitement";

export interface NewsItem {
  id: string;
  type: NewsType;
  date: string;
  headline: string;
  body: string;
  severity: "low" | "medium" | "high";
  teamId?: string;
  playerId?: string;
}

export type GameEvent =
  | {
      id: string;
      type: "shot" | "save" | "bigHit" | "momentumSwing" | "goalieHighlight";
      period: number;
      time: string;
      teamId: string;
      playerId?: string;
      description: string;
    }
  | {
      id: string;
      type: "goal" | "powerPlayGoal";
      period: number;
      time: string;
      teamId: string;
      scorerId: string;
      assistIds: string[];
      description: string;
    }
  | {
      id: string;
      type: "penalty" | "powerPlayStart";
      period: number;
      time: string;
      teamId: string;
      playerId?: string;
      minutes: number;
      description: string;
    }
  | {
      id: string;
      type: "injury";
      period: number;
      time: string;
      teamId: string;
      playerId: string;
      gamesRemaining: number;
      description: string;
    }
  | {
      id: string;
      type: "intermission" | "finalHorn";
      period: number;
      time: string;
      description: string;
    };

export interface GoalSummary {
  period: number;
  time: string;
  teamId: string;
  scorerId: string;
  assistIds: string[];
  powerPlay: boolean;
}

export interface PenaltySummary {
  period: number;
  time: string;
  teamId: string;
  playerId?: string;
  minutes: number;
}

export interface GoalieGameStats {
  goalieId: string;
  teamId: string;
  shotsAgainst: number;
  saves: number;
  goalsAgainst: number;
  win: boolean;
  shutout: boolean;
}

export interface BoxScoreTeam {
  teamId: string;
  goals: number;
  shots: number;
  powerPlayGoals: number;
  powerPlayAttempts: number;
  penaltyMinutes: number;
}

export interface BoxScore {
  home: BoxScoreTeam;
  away: BoxScoreTeam;
  scoringSummary: GoalSummary[];
  penaltySummary: PenaltySummary[];
}

export interface PlayerStatUpdate {
  playerId: string;
  teamId: string;
  gamesPlayed?: number;
  goals?: number;
  assists?: number;
  plusMinus?: number;
  penaltyMinutes?: number;
  shots?: number;
  hits?: number;
  blocks?: number;
  goalieWins?: number;
  goalieLosses?: number;
  saves?: number;
  goalsAgainst?: number;
  shutouts?: number;
}

export interface GameResult {
  id: string;
  gameId: string;
  seed: string;
  homeTeamId: string;
  awayTeamId: string;
  finalScore: { home: number; away: number; overtime: boolean };
  periodScores: Array<{ period: number; home: number; away: number }>;
  shots: { home: number; away: number };
  goals: GoalSummary[];
  penalties: PenaltySummary[];
  powerPlayAttempts: { home: number; away: number };
  powerPlayGoals: { home: number; away: number };
  goalieStats: GoalieGameStats[];
  threeStars: Array<{ playerId: string; teamId: string; reason: string }>;
  injuries: Array<{ playerId: string; teamId: string; gamesRemaining: number; note: string }>;
  eventTimeline: GameEvent[];
  momentumSummary: string;
  boxScore: BoxScore;
  coachNotes: string[];
  playerStatUpdates: PlayerStatUpdate[];
  moraleChanges: Array<{ playerId: string; amount: number; reason: string }>;
  fatigueChanges: Array<{ playerId: string; amount: number; reason: string }>;
  newsEvents: NewsItem[];
}

export interface PeriodSimulationResult {
  period: number;
  homeGoals: number;
  awayGoals: number;
  homeShots: number;
  awayShots: number;
  homePowerPlayAttempts: number;
  awayPowerPlayAttempts: number;
  homePowerPlayGoals: number;
  awayPowerPlayGoals: number;
  goals: GoalSummary[];
  penalties: PenaltySummary[];
  injuries: Array<{ playerId: string; teamId: string; gamesRemaining: number; note: string }>;
  events: GameEvent[];
  playerStatUpdates: PlayerStatUpdate[];
  momentum: string;
}

export interface FranchiseState {
  schemaVersion: number;
  franchiseId: string;
  selectedTeamId: string;
  league: LeagueState;
  inbox: NewsItem[];
  lastResult?: GameResult;
  saveStatus: "idle" | "saving" | "saved" | "error";
  createdAt: string;
  updatedAt: string;
}

export interface SaveSlotMetadata {
  slotId: string;
  label: string;
  teamName: string;
  currentDate: string;
  gameNumber: number;
  record: string;
  lastSaved: string;
  seasonYear: number;
  schemaVersion: number;
}
