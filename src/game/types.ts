export type Position = "LW" | "C" | "RW" | "LD" | "RD" | "G";
export type SkaterPosition = Exclude<Position, "G">;
export type Handedness = "L" | "R";
export type InjuryStatus = "healthy" | "day-to-day" | "out";
export type MoraleBand = "unhappy" | "concerned" | "stable" | "positive" | "thriving";
export type FormBand = "cold" | "struggling" | "steady" | "hot" | "excellent";
export type FatigueBand = "fresh" | "normal" | "tired" | "exhausted";
export type SimulationMode = "instant" | "period" | "broadcast";
export type SeasonPhase =
  | "regularSeason"
  | "playoffs"
  | "seasonReview"
  | "retirements"
  | "draftLottery"
  | "draft"
  | "reSigning"
  | "freeAgency"
  | "staffHiring"
  | "trainingCamp"
  | "preseason"
  | "completed";
export type RosterStatus = "active" | "scratched" | "affiliate" | "injuredReserve" | "prospectRights" | "retired";
export type AcquiredVia = "generated" | "draft" | "trade" | "freeAgency" | "prospectSigning" | "replacement";
export type CareerStage = "prospect" | "rookie" | "prime" | "veteran" | "decline";
export type RoomId =
  | "gm"
  | "roster"
  | "coach"
  | "locker"
  | "medical"
  | "arena"
  | "standings"
  | "saves"
  | "contracts"
  | "trades"
  | "scouting"
  | "development"
  | "freeAgency"
  | "staff"
  | "draft"
  | "settings"
  | "devTools";

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

export interface Contract {
  salary: number;
  capHit: number;
  yearsRemaining: number;
  expiryStatus: "UFA" | "RFA" | "Prospect";
  rolePromise?: RoleExpectation;
  signedAtAge?: number;
}

export interface PlayerDevelopmentPath {
  track: "NHL Regular" | "Affiliate Development" | "Prospect Pipeline" | "Veteran Depth" | "Goalie Project";
  confidence: number;
  lastReport: string;
  projectedRole: RoleExpectation;
  eta: "Now" | "This Season" | "Next Season" | "Long Term";
}

export interface AffiliateReport {
  id: string;
  date: string;
  playerId: string;
  headline: string;
  body: string;
  progress: number;
  severity: "low" | "medium" | "high";
}

export interface AffiliateTeam {
  id: string;
  parentTeamId: string;
  city: string;
  nickname: string;
  fullName: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  developmentFocus: DevelopmentFocus;
  reputation: number;
  recentReports: AffiliateReport[];
}

export interface OrganizationDepth {
  teamId: string;
  activeRosterIds: string[];
  scratchedRosterIds: string[];
  affiliateRosterIds: string[];
  injuredReserveIds: string[];
  prospectRightsIds: string[];
  positionCounts: Record<Position, number>;
  warnings: string[];
  validForGame: boolean;
  validForSeason: boolean;
}

export type RosterMoveType =
  | "callUp"
  | "sendDown"
  | "scratch"
  | "activate"
  | "placeOnIR"
  | "removeFromIR"
  | "signProspect"
  | "releaseDepth"
  | "aiTopUp";

export interface RosterMove {
  id: string;
  date: string;
  teamId: string;
  playerId: string;
  fromStatus: RosterStatus;
  toStatus: RosterStatus;
  type: RosterMoveType;
  reason: string;
  capImpact: number;
  userInitiated: boolean;
}

export interface RosterValidationReport {
  teamId: string;
  activeCount: number;
  forwardCount: number;
  defenseCount: number;
  goalieCount: number;
  healthyForwardCount: number;
  healthyDefenseCount: number;
  healthyGoalieCount: number;
  capHit: number;
  capSpace: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  autoFixAvailable: boolean;
}

export interface DepthChart {
  forwards: Record<"LW" | "C" | "RW", Player[]>;
  defense: Record<"LD" | "RD", Player[]>;
  goalies: Player[];
  active: Player[];
  scratched: Player[];
  affiliate: Player[];
  injuredReserve: Player[];
  recommendations: string[];
}

export interface TeamRosterRepairResult {
  teamId: string;
  team: Team;
  prospectPool?: ProspectRights[];
  moves: RosterMove[];
  warnings: string[];
  emergencyReplacementCount: number;
  affiliatePromotions: number;
  prospectSignings: number;
  freeAgentSignedIds?: string[];
}

export interface TrainingCampBattle {
  id: string;
  teamId: string;
  position: Position;
  headline: string;
  contenders: string[];
  recommendation: string;
}

export interface DraftPick {
  id: string;
  originalTeamId: string;
  ownerTeamId: string;
  seasonYear: number;
  round: number;
  label: string;
  projectedValue: number;
}

export interface TeamNeed {
  position: Position;
  urgency: number;
  description: string;
}

export type ScoutingRegion = "Domestic" | "Nordic" | "Central Europe" | "Eastern Europe" | "US College" | "Junior";
export type ScoutingPriority = "Balanced" | "High Upside" | "Goalies" | "Defense" | "Forwards" | "Safe Picks";
export type ProspectRisk = "Low" | "Medium" | "High" | "Boom/Bust";
export type DraftBoardStrategy = "Best Player Available" | "High Upside" | "Safe Floor" | "Need: Forwards" | "Need: Defense" | "Need: Goalies";

export interface ProspectScoutingInfo {
  viewings: number;
  certainty: number;
  estimatedOverallLow: number;
  estimatedOverallHigh: number;
  estimatedPotentialLow: number;
  estimatedPotentialHigh: number;
  scoutNotes: string[];
  lastUpdatedDayIndex?: number;
}

export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  age: number;
  position: Position;
  handedness: Handedness;
  nationality: string;
  archetype: PlayerArchetype;
  league: string;
  publicRank: number;
  projectedRound: number;
  actualOverall: number;
  actualPotential: number;
  risk: ProspectRisk;
  personality: Personality;
  strengths: string[];
  weaknesses: string[];
  combineScore: number;
  scouting: ProspectScoutingInfo;
}

export interface ScoutingAssignment {
  id: string;
  region: ScoutingRegion;
  priority: ScoutingPriority;
  assignedProspectId?: string;
  progress: number;
  active: boolean;
}

export interface ScoutingState {
  draftClass: Prospect[];
  assignments: ScoutingAssignment[];
  watchlist: string[];
  teamDraftBoard: string[];
  lastScoutingTickDayIndex: number;
}

export type DevelopmentFocus =
  | "Offensive Skill"
  | "Defensive Reliability"
  | "Skating"
  | "Strength & Physicality"
  | "Hockey IQ"
  | "Special Teams"
  | "Goalie Technique"
  | "Leadership";

export type DevelopmentIntensity = "Light" | "Normal" | "Aggressive";

export interface DevelopmentPlan {
  playerId: string;
  focus: DevelopmentFocus;
  intensity: DevelopmentIntensity;
  progress: number;
  lastUpdatedDayIndex: number;
  note: string;
}

export interface DevelopmentUpdate {
  id: string;
  playerId: string;
  date: string;
  headline: string;
  body: string;
  attributeChanged?: string;
  amount?: number;
}

export interface DevelopmentState {
  plans: DevelopmentPlan[];
  recentUpdates: DevelopmentUpdate[];
}

export interface TradeAsset {
  type: "player" | "pick";
  teamId: string;
  assetId: string;
}

export interface TradeProposal {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  assetsFrom: TradeAsset[];
  assetsTo: TradeAsset[];
  createdDayIndex: number;
  status: "draft" | "accepted" | "rejected";
}

export interface TradeEvaluation {
  accepted: boolean;
  scoreForOtherTeam: number;
  scoreForUserTeam: number;
  otherTeamNeedFit: number;
  capValid: boolean;
  reasons: string[];
  warnings: string[];
}

export interface TransactionLogItem {
  id: string;
  date: string;
  type:
    | "trade"
    | "contract"
    | "scouting"
    | "development"
    | "playoffs"
    | "draft"
    | "freeAgency"
    | "staff"
    | "retirement"
    | "owner"
    | "prospect"
    | "roster"
    | "affiliate"
    | "season";
  headline: string;
  details: string;
  teamIds?: string[];
  playerIds?: string[];
  pickIds?: string[];
}

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

export interface PlayerCareerSeason {
  seasonYear: number;
  teamId: string;
  stats: PlayerStats;
  overallAtEnd: number;
  contractSummary: string;
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
  contract: Contract;
  contractSummary: string;
  careerHistory?: PlayerCareerSeason[];
  rosterStatus?: RosterStatus;
  acquiredVia?: AcquiredVia;
  waiverEligible?: boolean;
  affiliateSeasons?: number;
  lastRosterMoveDayIndex?: number;
  developmentPath?: PlayerDevelopmentPath;
  careerStage?: CareerStage;
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
  capCeiling: number;
  capFloor: number;
  draftPicks: DraftPick[];
  tradeBlock: string[];
  untouchables: string[];
  teamNeeds: TeamNeed[];
  affiliate: AffiliateTeam;
  rosterMoveLog: RosterMove[];
  activeRosterLimit: number;
  activeRosterMinimum: number;
  reserveRosterLimit?: number;
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
  | "excitement"
  | "trade"
  | "contract"
  | "scouting"
  | "development"
  | "cap"
  | "playoffs"
  | "draft"
  | "freeAgency"
  | "staff"
  | "retirement"
  | "prospect"
  | "history"
  | "roster"
  | "affiliate"
  | "trainingCamp";

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

export interface PlayoffGame {
  id: string;
  seriesId: string;
  gameNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  played: boolean;
  result?: {
    homeGoals: number;
    awayGoals: number;
    overtime: boolean;
  };
}

export interface PlayoffSeries {
  id: string;
  round: number;
  homeSeedTeamId: string;
  awaySeedTeamId: string;
  homeWins: number;
  awayWins: number;
  bestOf: number;
  games: PlayoffGame[];
  winnerTeamId?: string;
  completed: boolean;
}

export interface PlayoffState {
  qualifiedTeamIds: string[];
  bracket: PlayoffSeries[];
  currentRound: number;
  championTeamId?: string;
  completed: boolean;
  recentPlayoffResults: string[];
}

export interface DraftSelection {
  id: string;
  year: number;
  round: number;
  pickNumber: number;
  teamId: string;
  prospectId: string;
  prospectName: string;
  position: Position;
  actualOverall: number;
  actualPotential: number;
  visibleGrade: string;
  signed: boolean;
}

export interface DraftState {
  year: number;
  round: number;
  pickNumber: number;
  draftOrder: string[];
  pickContexts?: DraftPickContext[];
  selections: DraftSelection[];
  userPickPending: boolean;
  completed: boolean;
}

export interface DraftPickContext {
  year: number;
  round: number;
  pickNumber: number;
  teamId: string;
  originalTeamId: string;
  ownerTeamId: string;
  pickId: string;
}

export interface ProspectRights {
  prospectId: string;
  teamId: string;
  acquiredYear: number;
  acquiredRound: number;
  acquiredPickNumber: number;
  displayName: string;
  position: Position;
  age: number;
  nationality: string;
  archetype: PlayerArchetype;
  potentialRangeLabel: string;
  signed: boolean;
  rightsExpireYear: number;
  source: "draft" | "trade" | "freeAgent";
}

export interface ContractOfferEvaluation {
  accepted: boolean;
  playerInterest: number;
  demandSalary: number;
  demandYears: number;
  reasons: string[];
  warnings: string[];
}

export interface ContractOffer {
  id: string;
  playerId: string;
  teamId: string;
  salary: number;
  capHit: number;
  years: number;
  rolePromise?: RoleExpectation;
  offerType: "extension" | "freeAgent" | "prospectEntry";
  status: "draft" | "accepted" | "rejected";
  evaluation?: ContractOfferEvaluation;
}

export interface ContractDemand {
  playerId: string;
  demandSalary: number;
  demandYears: number;
  minimumRole: RoleExpectation;
  patience: number;
  headline: string;
  reasons: string[];
}

export interface FreeAgentPlayer {
  player: Player;
  demandSalary: number;
  demandYears: number;
  interestByTeam: Record<string, number>;
  marketBuzz: string;
  signedByTeamId?: string;
}

export interface FreeAgentState {
  market: FreeAgentPlayer[];
  currentDay: number;
  maxDays: number;
  userSignings: string[];
  aiSignings: TransactionLogItem[];
  completed: boolean;
}

export type StaffRole =
  | "Assistant Coach"
  | "Goalie Coach"
  | "Development Coach"
  | "Head Scout"
  | "Medical Lead"
  | "Analytics Director"
  | "Assistant GM";

export interface StaffMember {
  id: string;
  displayName: string;
  role: StaffRole;
  age: number;
  nationality: string;
  tacticalKnowledge: number;
  development: number;
  scouting: number;
  medical: number;
  analytics: number;
  negotiation: number;
  communication: number;
  moraleImpact: number;
  salary: number;
  yearsRemaining: number;
  reputation: number;
  personality: string;
  signedTeamId?: string;
}

export interface StaffState {
  teamStaff: Record<string, StaffMember[]>;
  staffMarket: StaffMember[];
  recentStaffMoves: TransactionLogItem[];
}

export interface StaffModifiers {
  tactics: number;
  goalieDevelopment: number;
  development: number;
  scouting: number;
  medical: number;
  analytics: number;
  negotiation: number;
  morale: number;
}

export interface OwnerGoal {
  id: string;
  type: "makePlayoffs" | "winRound" | "developProspect" | "stayUnderCap" | "improveRecord" | "sellVeteran" | "buildThroughDraft";
  label: string;
  target: number;
  progress: number;
  status: "active" | "met" | "failed";
  importance: "low" | "medium" | "high";
}

export interface OwnerState {
  jobSecurity: number;
  patience: number;
  seasonGoals: OwnerGoal[];
  messages: NewsItem[];
  lastEvaluationDate?: string;
}

export interface SeasonHistory {
  seasonYear: number;
  championTeamId?: string;
  selectedTeamRecord: string;
  selectedTeamFinish: string;
  selectedTeamPlayoffResult: string;
  standingsSnapshot: Array<{
    teamId: string;
    rank: number;
    wins: number;
    losses: number;
    overtimeLosses: number;
    points: number;
    goalDifferential: number;
  }>;
  topScorer: string;
  bestGoalie: string;
  majorStories: string[];
}

export interface ChampionEntry {
  seasonYear: number;
  teamId: string;
  teamName: string;
}

export interface AwardEntry {
  id: string;
  seasonYear: number;
  award: "Most Valuable Player" | "Top Goalie" | "Top Rookie" | "Best Defenseman" | "Coach/GM Story";
  playerId?: string;
  teamId?: string;
  displayName: string;
  reason: string;
}

export interface LeagueHistory {
  seasons: SeasonHistory[];
  champions: ChampionEntry[];
  awards: AwardEntry[];
  draftHistory: DraftSelection[];
  transactionHistory: TransactionLogItem[];
}

export interface OffseasonState {
  year: number;
  draftState?: DraftState;
  retiredPlayerIds: string[];
  retiredPlayerNames: string[];
  reSigningCompleted: boolean;
  trainingCampCompleted: boolean;
  phaseLog: string[];
}

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  body: string;
  type: "season" | "playoffs" | "draft" | "contract" | "freeAgency" | "staff" | "retirement" | "owner";
}

export interface FranchiseState {
  schemaVersion: number;
  franchiseId: string;
  selectedTeamId: string;
  league: LeagueState;
  seasonPhase: SeasonPhase;
  currentSeasonId: string;
  playoffState?: PlayoffState;
  offseasonState?: OffseasonState;
  freeAgencyState?: FreeAgentState;
  staffState: StaffState;
  history: LeagueHistory;
  ownerState: OwnerState;
  prospectPools: Record<string, ProspectRights[]>;
  inbox: NewsItem[];
  scouting: ScoutingState;
  development: DevelopmentState;
  tradeHistory: TradeProposal[];
  rosterMoveHistory: RosterMove[];
  transactionLog: TransactionLogItem[];
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
  seasonPhase: SeasonPhase;
}
