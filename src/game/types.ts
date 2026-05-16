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
export type LeagueSize = 8 | 10 | 12 | 16;
export type ScheduleFormat = "doubleRoundRobin" | "balancedShort" | "balancedStandard" | "balancedLong";
export type PlayoffFormat = "top4" | "top6WithByes" | "top8" | "top10WithPlayIn";
export type PlayoffSeriesFormat = "singleGame" | "bestOf3" | "bestOf5" | "bestOf7";

export interface DraftFormat {
  rounds: number;
  prospectsPerPickMultiplier: number;
  lotteryTeams: number;
}

export interface LeagueRuleSet {
  id: string;
  label: string;
  description: string;
  teamCount: LeagueSize;
  scheduleFormat: ScheduleFormat;
  gamesPerTeam: number;
  playoffTeamCount: number;
  playoffFormat: PlayoffFormat;
  playoffSeriesFormat: PlayoffSeriesFormat;
  playoffSeriesLength: number;
  draftRounds: number;
  draftClassSize: number;
  draftFormat: DraftFormat;
  capCeiling: number;
  capFloor: number;
  activeRosterMin: number;
  activeRosterMax: number;
  affiliateEnabled: boolean;
  tradeDeadlineDayIndex?: number;
  seasonStartDate: string;
}

export interface ScheduleGenerationReport {
  valid: boolean;
  gamesPerTeam: Record<string, number>;
  totalGames: number;
  homeAwayBalanceWarnings: string[];
  duplicateMatchupWarnings: string[];
  errors: string[];
}

export interface PlayoffFormatValidation {
  valid: boolean;
  format: PlayoffFormat;
  teamCount: number;
  playoffTeamCount: number;
  warnings: string[];
  errors: string[];
}

export interface LeagueRuleValidationReport {
  valid: boolean;
  warnings: string[];
  errors: string[];
  supported: boolean;
  normalizedRuleSet?: LeagueRuleSet;
}
export type GameDifficulty = "relaxed" | "standard" | "demanding" | "hardcore";
export type StoryFrequency = "quiet" | "normal" | "dramatic";
export type GameMode = "sandbox" | "standardDynasty" | "pressureCooker" | "rebuildChallenge" | "contenderChallenge";
export type GMBackground =
  | "Former Coach"
  | "Cap Strategist"
  | "Scout at Heart"
  | "Player Relationship Builder"
  | "Analytics Executive"
  | "Old-School Hockey Ops"
  | "Owner Favorite"
  | "Media Savvy";
export type GMAvatarStyle = "classicSuit" | "teamPolo" | "rinkJacket" | "analyticsDesk";
export type AssistantGmHelpLevel = "minimal" | "normal" | "detailed";
export type FranchiseStartPreset = "balanced" | "injuryLight" | "prospectHeavy" | "capCrunched" | "rebuild" | "contender";
export type RosterStatus = "active" | "scratched" | "affiliate" | "injuredReserve" | "prospectRights" | "retired";
export type AcquiredVia = "generated" | "draft" | "trade" | "freeAgency" | "prospectSigning" | "replacement";
export type CareerStage = "prospect" | "rookie" | "prime" | "veteran" | "decline";
export type RoomId =
  | "gm"
  | "press"
  | "ownerSuite"
  | "agents"
  | "playerMeetings"
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
  | "devTools"
  | "feedback";

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  roomId?: RoomId;
  targetAction?: string;
  completed: boolean;
  optional: boolean;
  category:
    | "movement"
    | "gmOffice"
    | "roster"
    | "lineup"
    | "simulation"
    | "frontOffice"
    | "dynasty"
    | "livingOps"
    | "saveLoad";
}

export interface TutorialState {
  active: boolean;
  mode: "firstFranchise" | "guided" | "off";
  currentStepId?: string;
  completedStepIds: string[];
  dismissedStepIds: string[];
  lastHintAt?: string;
}

export interface GuideTopic {
  id: string;
  title: string;
  category:
    | "basics"
    | "rooms"
    | "roster"
    | "contracts"
    | "trades"
    | "scouting"
    | "development"
    | "seasonLifecycle"
    | "livingOps"
    | "settings";
  summary: string;
  body: string;
  relatedRoomIds: RoomId[];
  relatedActions: string[];
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  category:
    | "team"
    | "roster"
    | "trade"
    | "draft"
    | "development"
    | "playoffs"
    | "dynasty"
    | "livingOps"
    | "management"
    | "customization";
  unlockedAt?: string;
  progress: number;
  target: number;
  hidden?: boolean;
  rewardText?: string;
}

export interface FranchiseMilestone {
  id: string;
  date: string;
  seasonYear: number;
  type:
    | "firstWin"
    | "firstTrade"
    | "firstDraftPick"
    | "firstPlayoffBerth"
    | "championship"
    | "prospectBreakout"
    | "starReSigned"
    | "rivalryWin"
    | "ownerGoalMet"
    | "majorStoryResolved"
    | "seasonCompleted"
    | "newSeasonStarted";
  headline: string;
  body: string;
  teamId: string;
  playerIds?: string[];
  relatedEventId?: string;
  importance: "minor" | "major" | "historic";
}

export interface AudioCue {
  id: string;
  previewLabel: string;
  description?: string;
  type:
    | "ui"
    | "notification"
    | "goal"
    | "finalHorn"
    | "trade"
    | "draftPick"
    | "achievement"
    | "warning"
    | "roomAmbience"
    | "broadcast";
  enabled: boolean;
  volume: number;
  reducedMotionSafe: boolean;
}

export interface LocalTelemetryEvent {
  id: string;
  timestamp: string;
  type:
    | "roomOpened"
    | "gameSimulated"
    | "phaseAdvanced"
    | "saveLoaded"
    | "saveRepaired"
    | "tutorialStepCompleted"
    | "tutorialSkipped"
    | "achievementUnlocked"
    | "errorBoundary"
    | "decisionResolved"
    | "rosterMove"
    | "simBlocked"
    | "validationError"
    | "feedbackSubmitted"
    | "resultViewed";
  label: string;
  details?: Record<string, string | number | boolean>;
}

export interface BugReport {
  id: string;
  createdAt: string;
  appVersion: string;
  releasePhase?: string;
  releaseChannel?: string;
  schemaVersion: number;
  currentPhase: SeasonPhase;
  selectedTeamId: string;
  customLeagueName?: string;
  ruleSetSummary?: string;
  dataPackMetadata?: FranchiseState["dataPackMetadata"];
  lastRoom?: RoomId;
  recentTelemetry: LocalTelemetryEvent[];
  runtimeHealthSummary?: string;
  runtimeHealthEvents?: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    severity: string;
    roomId?: RoomId;
    phase?: SeasonPhase;
    details?: string;
  }>;
  saveIntegritySummary: string;
  invariantSummary: string;
  uxFrictionSummary?: string;
  consoleNotes?: string[];
  userNote?: string;
  includeFullSave?: boolean;
  fullSaveJson?: string;
  lastDistrictId?: string;
  lastDistrictLabel?: string;
}

export type DecisionEventType =
  | "pressConference"
  | "ownerMeeting"
  | "playerMeeting"
  | "agentCall"
  | "teamMeeting"
  | "mediaQuestion"
  | "lockerRoomIssue"
  | "tradeRumor"
  | "contractStandoff"
  | "rivalryHeat"
  | "playoffPressure"
  | "draftReaction"
  | "freeAgencyRumor"
  | "prospectBuzz"
  | "injuryConcern"
  | "goalieControversy"
  | "fanBacklash"
  | "staffConcern";

export type DecisionEventStatus = "active" | "resolved" | "expired";
export type DecisionEventSeverity = "low" | "medium" | "high" | "critical";

export type DecisionOptionTone = "supportive" | "firm" | "transparent" | "deflect" | "aggressive" | "patient" | "risky" | "conservative";

export interface DecisionRequirement {
  type: "minOwnerTrust" | "minPlayerTrust" | "capSpace" | "phase" | "playerOnRoster" | "teamRecord";
  targetId?: string;
  value?: number;
}

export interface DecisionOption {
  id: string;
  label: string;
  tone: DecisionOptionTone;
  description: string;
  preview: string;
  hiddenRisk?: string;
  requirements?: DecisionRequirement[];
}

export interface DecisionOutcome {
  summary: string;
  moraleDeltaByPlayerId?: Record<string, number>;
  formDeltaByPlayerId?: Record<string, number>;
  fatigueDeltaByPlayerId?: Record<string, number>;
  roleSatisfactionDeltaByPlayerId?: Record<string, number>;
  chemistryDelta?: number;
  fanSentimentDelta?: number;
  ownerTrustDelta?: number;
  mediaPressureDelta?: number;
  agentRelationshipDeltaByAgentId?: Record<string, number>;
  contractInterestDeltaByPlayerId?: Record<string, number>;
  freeAgencyInterestDeltaByPlayerId?: Record<string, number>;
  tradeNoiseDeltaByPlayerId?: Record<string, number>;
  staffTrustDeltaByStaffId?: Record<string, number>;
  followUpEventIds?: string[];
  newsItems?: NewsItem[];
}

export interface DecisionEvent {
  id: string;
  type: DecisionEventType;
  status: DecisionEventStatus;
  severity: DecisionEventSeverity;
  createdDate: string;
  expiresDate?: string;
  phase?: SeasonPhase;
  teamId: string;
  playerIds?: string[];
  staffIds?: string[];
  prospectIds?: string[];
  relatedGameId?: string;
  relatedStoryArcId?: string;
  headline: string;
  body: string;
  sourceLabel: string;
  locationRoom?: RoomId;
  options: DecisionOption[];
  selectedOptionId?: string;
  outcome?: DecisionOutcome;
  tags: string[];
  repeatKey?: string;
}

export type StoryArcType =
  | "goalieControversy"
  | "starRoleDemand"
  | "rookieBreakout"
  | "tradeRumor"
  | "contractStandoff"
  | "rebuildTension"
  | "playoffPressure"
  | "rivalryEscalation"
  | "ownerPressure"
  | "lockerRoomSplit"
  | "prospectPromotion"
  | "freeAgencyPursuit";

export interface StoryArc {
  id: string;
  type: StoryArcType;
  status: "active" | "resolved" | "failed" | "cooldown";
  teamId: string;
  playerIds: string[];
  staffIds?: string[];
  startedDate: string;
  lastUpdatedDate: string;
  intensity: number;
  progress: number;
  headline: string;
  summary: string;
  recentEventIds: string[];
  resolution?: string;
  tags: string[];
}

export interface PlayerRelationship {
  playerId: string;
  trust: number;
  roleSatisfaction: number;
  communication: number;
  pressureTolerance: number;
  agentId?: string;
  lastMeetingDate?: string;
  notes: string[];
}

export interface AgentProfile {
  id: string;
  displayName: string;
  personality: "Collaborative" | "Hardball" | "Public Pressure" | "Loyalty First" | "Money First" | "Role First" | "Low Drama";
  clientPlayerIds: string[];
  relationship: number;
  publicPressure: number;
  negotiationStyle: string;
  notes: string[];
}

export interface TeamDynamics {
  chemistry: number;
  leadership: number;
  accountability: number;
  roomMood: "tense" | "fragile" | "steady" | "confident" | "surging";
  mediaPressure: number;
  fanSentiment: number;
  ownerTrust: number;
  rivalryHeatByTeamId: Record<string, number>;
  unresolvedIssues: string[];
}

export interface MediaState {
  pressure: number;
  narrative: "quiet" | "optimistic" | "skeptical" | "hotSeat" | "playoffBuzz" | "rebuildDebate";
  recentQuestions: string[];
  columnistTone: "friendly" | "neutral" | "critical" | "provocative";
}

export interface GMTrait {
  id: string;
  label: string;
  description: string;
  effects: {
    negotiationModifier?: number;
    scoutingModifier?: number;
    developmentModifier?: number;
    playerTrustModifier?: number;
    mediaPressureModifier?: number;
    ownerTrustModifier?: number;
    tradeEvaluationModifier?: number;
    storyFrequencyModifier?: number;
  };
}

export interface GMProfile {
  id: string;
  displayName: string;
  background: GMBackground;
  difficulty: GameDifficulty;
  gameMode: GameMode;
  storyFrequency: StoryFrequency;
  avatarStyle: GMAvatarStyle;
  traits: GMTrait[];
  createdAt: string;
}

export interface DifficultyTuning {
  difficulty: GameDifficulty;
  ownerPatienceMultiplier: number;
  mediaPressureMultiplier: number;
  fanPatienceMultiplier: number;
  tradeAiStrictness: number;
  contractDemandMultiplier: number;
  freeAgentInterestPenalty: number;
  injuryFrequencyMultiplier: number;
  developmentVarianceMultiplier: number;
  storyEventMultiplier: number;
  capPressureMultiplier: number;
  jobSecurityVolatility: number;
  assistantGmHelpLevel: AssistantGmHelpLevel;
}

export interface AssistantGmRecommendation {
  id: string;
  category:
    | "lineup"
    | "roster"
    | "trade"
    | "contract"
    | "scouting"
    | "development"
    | "freeAgency"
    | "staff"
    | "story"
    | "phase"
    | "cap";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  body: string;
  actionLabel: string;
  targetRoomId?: RoomId;
  targetDistrictLabel?: string;
  navigationHint?: string;
  targetPlayerId?: string;
  targetTeamId?: string;
  estimatedImpact: "small" | "medium" | "large";
}

export interface AssistantGmReport {
  id: string;
  date: string;
  type: "daily" | "weekly" | "phase" | "preGame" | "postGame" | "offseason";
  headline: string;
  summary: string;
  recommendations: AssistantGmRecommendation[];
  riskFlags: string[];
  opportunityFlags: string[];
  linkedRoomIds: RoomId[];
  dismissed?: boolean;
}

export interface DecisionOptionTemplate {
  tone: DecisionOptionTone;
  labelTemplate: string;
  descriptionTemplate: string;
  previewTemplate: string;
  outcomeProfile: "calm" | "honest" | "protective" | "aggressive" | "risky" | "deflecting" | "accountable";
}

export interface NarrativeTemplate {
  id: string;
  category:
    | "press"
    | "owner"
    | "agent"
    | "player"
    | "team"
    | "media"
    | "fan"
    | "rivalry"
    | "playoff"
    | "draft"
    | "freeAgency"
    | "trade"
    | "development"
    | "affiliate";
  triggerTags: string[];
  severity: DecisionEventSeverity;
  headlineTemplate: string;
  bodyTemplate: string;
  optionTemplates?: DecisionOptionTemplate[];
  cooldownDays: number;
  weight: number;
  difficultyRange?: GameDifficulty[];
  storyFrequencyRange?: StoryFrequency[];
}

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
  track: "Major Club Regular" | "Affiliate Development" | "Prospect Pipeline" | "Veteran Depth" | "Goalie Project";
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
  accentColor?: string;
  marketSize: "Small" | "Medium" | "Large";
  ownerPatience: number;
  fanConfidence: number;
  teamPersonality: string;
  arenaName?: string;
  affiliateName?: string;
  customBranding?: CustomTeamBranding;
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
  ruleSet: LeagueRuleSet;
  scheduleReport?: ScheduleGenerationReport;
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
  format: PlayoffFormat;
  seriesFormat: PlayoffSeriesFormat;
  playoffTeamCount: number;
  byes?: Record<number, string[]>;
  playInGames?: PlayoffGame[];
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
  draftRounds?: number;
  draftClassSize?: number;
  leagueRuleSetId?: string;
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
  goalOutcomeHistory?: OwnerGoalOutcome[];
}

export interface OwnerGoalOutcome {
  id: string;
  seasonYear: number;
  date: string;
  goalId: string;
  type: OwnerGoal["type"];
  label: string;
  status: OwnerGoal["status"];
  progress: number;
  target: number;
  importance: OwnerGoal["importance"];
  category: "performance" | "development" | "cap" | "draft";
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

export type ActionQueuePriority = "low" | "medium" | "high" | "urgent";

export interface ActionQueueItem {
  id: string;
  priority: ActionQueuePriority;
  label: string;
  description: string;
  roomId: RoomId;
  category:
    | "lineup"
    | "roster"
    | "trade"
    | "contract"
    | "scouting"
    | "development"
    | "freeAgency"
    | "staff"
    | "story"
    | "phase"
    | "cap"
    | "owner"
    | "news";
  blocking: boolean;
  relatedPlayerId?: string;
  relatedTeamId?: string;
  relatedEventId?: string;
}

export interface RoomBadge {
  id: string;
  label: string;
  tone: "neutral" | "info" | "warning" | "danger" | "success";
  count?: number;
}

export type DataPackType = "league" | "scenario" | "branding" | "roster" | "draftClass" | "full";

export interface DataPack {
  schemaVersion: number;
  dataPackVersion: number;
  id: string;
  type: DataPackType;
  name: string;
  description: string;
  authorLabel: string;
  createdAt: string;
  updatedAt: string;
  fictionalOnly: boolean;
  contentWarnings: string[];
  leagueTemplate?: CustomLeagueTemplate;
  scenario?: ScenarioDefinition;
  branding?: CustomBrandingPack;
  rosters?: CustomRosterPack;
  draftClass?: CustomDraftClassPack;
  validation?: DataPackValidationReport;
}

export interface CustomLeagueTemplate {
  id: string;
  name: string;
  description: string;
  seasonYear: number;
  rules?: LeagueRuleSet;
  teamCount: number;
  scheduleLength: number;
  playoffTeamCount: number;
  playoffSeriesLength: number;
  draftRounds: number;
  capCeiling: number;
  capFloor: number;
  teams: CustomTeamDefinition[];
  rulesPreset: LeagueRulesPreset;
  difficultySuggestion?: GameDifficulty;
  storySuggestion?: StoryFrequency;
}

export interface LeagueRulesPreset {
  id: string;
  label: string;
  description: string;
  teamCount: number;
  scheduleLength: number;
  playoffTeamCount: number;
  playoffSeriesLength: number;
  draftRounds: number;
  capCeiling: number;
  capFloor: number;
  rosterActiveMin: number;
  rosterActiveMax: number;
  affiliateEnabled: boolean;
  tradeDifficultyModifier: number;
  developmentPaceModifier: number;
  injuryModifier: number;
}

export type TeamRosterStrategy =
  | "balanced"
  | "contender"
  | "rebuild"
  | "youngCore"
  | "veteranHeavy"
  | "goalieFirst"
  | "defenseFirst"
  | "highOffense"
  | "random";

export interface CustomTeamDefinition {
  id: string;
  city: string;
  nickname: string;
  fullName: string;
  abbreviation: string;
  marketSize: "Small" | "Medium" | "Large";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  teamPersonality: string;
  ownerPatience: number;
  fanConfidence: number;
  arenaName: string;
  affiliateName: string;
  rivalryTeamIds: string[];
  branding: CustomTeamBranding;
  rosterSeed?: string;
  rosterStrategy?: TeamRosterStrategy;
  players?: CustomPlayerDefinition[];
}

export interface CustomTeamBranding {
  crestShape: string;
  crestInitials: string;
  jerseyPattern: string;
  homeJersey: string;
  awayJersey: string;
  alternateJersey: string;
  arenaMood: string;
  broadcastStyle: string;
  chant: string;
  colorValidationWarnings?: string[];
}

export interface CustomPlayerDefinition {
  id: string;
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
  contract?: Contract;
  rosterStatus?: RosterStatus;
  morale?: number;
  form?: number;
  fatigue?: number;
}

export interface CustomBrandingPack {
  id: string;
  name: string;
  teams: Array<Pick<CustomTeamDefinition, "id" | "fullName" | "primaryColor" | "secondaryColor" | "accentColor" | "branding">>;
}

export interface CustomRosterPack {
  id: string;
  name: string;
  teamRosters: Array<{ teamId: string; players: CustomPlayerDefinition[] }>;
}

export interface CustomDraftClassPack {
  id: string;
  seasonYear: number;
  name: string;
  prospects: Prospect[];
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  scenarioType:
    | "standardStart"
    | "rebuild"
    | "contender"
    | "capCrunch"
    | "injuryCrisis"
    | "draftHeavy"
    | "deadlinePressure"
    | "playoffPush"
    | "expansionStyle"
    | "chaos";
  selectedTeamSuggestion?: string;
  startPhase?: SeasonPhase;
  startingDayIndex?: number;
  setupNotes: string[];
  modifiers: ScenarioModifier[];
  ownerGoalOverrides?: OwnerGoal[];
  initialDecisionEvents?: DecisionEvent[];
  initialStoryArcs?: StoryArc[];
}

export interface ScenarioModifier {
  id: string;
  label: string;
  type:
    | "capAdjustment"
    | "rosterAdjustment"
    | "injury"
    | "morale"
    | "fanSentiment"
    | "ownerTrust"
    | "draftPicks"
    | "prospects"
    | "contracts"
    | "story";
  targetTeamId?: string;
  targetPlayerId?: string;
  value?: number;
  payload?: unknown;
}

export interface DataPackValidationReport {
  valid: boolean;
  supported: boolean;
  errors: string[];
  warnings: string[];
  unsupportedReasons: string[];
  suggestedFixes: string[];
  repairedFields: string[];
  realWorldContentFlags: string[];
  duplicateIdWarnings: string[];
  balanceWarnings: string[];
  generatedFallbacks: string[];
}

export interface DataPackLibraryState {
  importedPacks: DataPack[];
  selectedPackId?: string;
  recentImports: string[];
  validationHistory: DataPackValidationReport[];
}

export interface FranchiseSetupOptions {
  seed?: string;
  gmName?: string;
  gmBackground?: GMBackground;
  avatarStyle?: GMAvatarStyle;
  difficulty?: GameDifficulty;
  gameMode?: GameMode;
  storyFrequency?: StoryFrequency;
  startPreset?: FranchiseStartPreset;
}

export interface FranchiseState {
  schemaVersion: number;
  franchiseId: string;
  selectedTeamId: string;
  league: LeagueState;
  seasonPhase: SeasonPhase;
  currentSeasonId: string;
  gmProfile: GMProfile;
  difficultyTuning: DifficultyTuning;
  assistantGmReports: AssistantGmReport[];
  narrativeTemplateVersion: number;
  tutorialState: TutorialState;
  achievements: Achievement[];
  milestones: FranchiseMilestone[];
  localTelemetry: LocalTelemetryEvent[];
  playoffState?: PlayoffState;
  offseasonState?: OffseasonState;
  freeAgencyState?: FreeAgentState;
  staffState: StaffState;
  history: LeagueHistory;
  ownerState: OwnerState;
  prospectPools: Record<string, ProspectRights[]>;
  decisionEvents: DecisionEvent[];
  storyArcs: StoryArc[];
  playerRelationships: Record<string, PlayerRelationship>;
  agents: AgentProfile[];
  teamDynamics: Record<string, TeamDynamics>;
  mediaState: MediaState;
  inbox: NewsItem[];
  scouting: ScoutingState;
  development: DevelopmentState;
  tradeHistory: TradeProposal[];
  rosterMoveHistory: RosterMove[];
  transactionLog: TransactionLogItem[];
  lastResult?: GameResult;
  sourceDataPackId?: string;
  sourceScenarioId?: string;
  customLeagueName?: string;
  dataPackMetadata?: {
    dataPackId: string;
    dataPackName: string;
    scenarioName?: string;
    importedAt?: string;
  };
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
  appVersion?: string;
  releasePhase?: string;
  seasonPhase: SeasonPhase;
}
