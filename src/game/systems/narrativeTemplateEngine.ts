import { SeededRng } from "../rng";
import type {
  DecisionEvent,
  DecisionEventType,
  DecisionOption,
  FranchiseState,
  GameDifficulty,
  NarrativeTemplate,
  NewsItem,
  NewsType,
  RoomId,
  StoryFrequency
} from "../types";

export interface TemplateContext {
  team?: string;
  teamId?: string;
  opponent?: string;
  opponentId?: string;
  player?: string;
  playerId?: string;
  position?: string;
  agent?: string;
  agentId?: string;
  prospect?: string;
  prospectId?: string;
  coach?: string;
  record?: string;
  phase?: string;
  streak?: string;
  rival?: string;
  rivalId?: string;
  round?: string;
  pick?: string;
  date?: string;
  difficulty?: GameDifficulty;
  storyFrequency?: StoryFrequency;
  category?: NarrativeTemplate["category"];
  tags?: string[];
}

const CATEGORY_TO_EVENT_TYPE: Record<NarrativeTemplate["category"], DecisionEventType> = {
  press: "pressConference",
  owner: "ownerMeeting",
  agent: "agentCall",
  player: "playerMeeting",
  team: "teamMeeting",
  media: "mediaQuestion",
  fan: "fanBacklash",
  rivalry: "rivalryHeat",
  playoff: "playoffPressure",
  draft: "draftReaction",
  freeAgency: "freeAgencyRumor",
  trade: "tradeRumor",
  development: "prospectBuzz",
  affiliate: "prospectBuzz"
};

const CATEGORY_TO_ROOM: Record<NarrativeTemplate["category"], RoomId> = {
  press: "press",
  owner: "ownerSuite",
  agent: "agents",
  player: "playerMeetings",
  team: "locker",
  media: "press",
  fan: "gm",
  rivalry: "arena",
  playoff: "standings",
  draft: "scouting",
  freeAgency: "freeAgency",
  trade: "trades",
  development: "development",
  affiliate: "roster"
};

const CATEGORY_TO_NEWS: Record<NarrativeTemplate["category"], NewsType> = {
  press: "media",
  owner: "owner",
  agent: "contract",
  player: "morale",
  team: "morale",
  media: "media",
  fan: "pressure",
  rivalry: "rival",
  playoff: "playoffs",
  draft: "draft",
  freeAgency: "freeAgency",
  trade: "trade",
  development: "development",
  affiliate: "affiliate"
};

const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;
const PROHIBITED_REAL_HOCKEY_TERMS = [
  "NHL",
  "National Hockey League",
  "Maple Leafs",
  "Canadiens",
  "Bruins",
  "Rangers",
  "Blackhawks",
  "Red Wings",
  "Penguins",
  "Oilers",
  "Flames",
  "Canucks",
  "Kraken",
  "Golden Knights",
  "Avalanche",
  "Flyers",
  "Islanders",
  "Devils",
  "Kings",
  "Ducks",
  "Sharks",
  "Stars",
  "Wild",
  "Jets",
  "Senators",
  "Sabres",
  "Lightning",
  "Panthers",
  "Predators",
  "Hurricanes",
  "Blue Jackets",
  "Capitals",
  "Coyotes"
];

function contextValue(context: TemplateContext, key: string): string {
  const value = context[key as keyof TemplateContext];
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return fallbackByPlaceholder(key, context);
}

function fallbackByPlaceholder(key: string, context: TemplateContext): string {
  if (key === "team") return context.team ?? "the club";
  if (key === "opponent" || key === "rival") return context.rival ?? context.opponent ?? "the next opponent";
  if (key === "player") return context.player ?? "a key player";
  if (key === "prospect") return context.prospect ?? "a top prospect";
  if (key === "agent") return context.agent ?? "the player's agent";
  if (key === "position") return context.position ?? "a thin position";
  if (key === "record") return context.record ?? "an uneven record";
  if (key === "phase") return context.phase ?? "this phase";
  if (key === "streak") return context.streak ?? "the recent stretch";
  if (key === "round") return context.round ?? "the next round";
  if (key === "pick") return context.pick ?? "the next pick";
  if (key === "coach") return context.coach ?? "the coaching staff";
  return "the room";
}

export function renderTemplate(template: NarrativeTemplate | string, context: TemplateContext): string {
  const raw = typeof template === "string" ? template : template.headlineTemplate;
  return raw.replace(PLACEHOLDER_PATTERN, (_match, key) => contextValue(context, key));
}

function matchesTemplate(template: NarrativeTemplate, context: TemplateContext): boolean {
  if (context.category && template.category !== context.category) return false;
  if (template.difficultyRange && context.difficulty && !template.difficultyRange.includes(context.difficulty)) return false;
  if (template.storyFrequencyRange && context.storyFrequency && !template.storyFrequencyRange.includes(context.storyFrequency)) return false;
  if (context.tags?.length) {
    return context.tags.some((tag) => template.triggerTags.includes(tag));
  }
  return true;
}

export function selectNarrativeTemplate(
  templates: NarrativeTemplate[],
  context: TemplateContext,
  rng: SeededRng
): NarrativeTemplate {
  const candidates = templates.filter((template) => matchesTemplate(template, context));
  const pool = candidates.length > 0 ? candidates : templates;
  return rng.weighted(pool, (template) => template.weight);
}

function buildOptions(template: NarrativeTemplate, context: TemplateContext, rng: SeededRng): DecisionOption[] {
  const optionTemplates = template.optionTemplates?.length ? template.optionTemplates : [];
  return optionTemplates.slice(0, 3).map((option, index) => ({
    id: `${template.id}-option-${index + 1}-${rng.int(100, 999)}`,
    label: renderTemplate(option.labelTemplate, context),
    tone: option.tone,
    description: renderTemplate(option.descriptionTemplate, context),
    preview: renderTemplate(option.previewTemplate, context)
  }));
}

export function createDecisionEventFromTemplate(
  template: NarrativeTemplate,
  context: TemplateContext,
  rng: SeededRng
): DecisionEvent {
  const date = context.date ?? new Date().toISOString();
  const teamId = context.teamId ?? "user-team";
  return {
    id: `template-event-${template.id}-${rng.int(100000, 999999)}`,
    type: CATEGORY_TO_EVENT_TYPE[template.category],
    status: "active",
    severity: template.severity,
    createdDate: date,
    phase: undefined,
    teamId,
    playerIds: context.playerId ? [context.playerId] : undefined,
    prospectIds: context.prospectId ? [context.prospectId] : undefined,
    headline: renderTemplate(template.headlineTemplate, context),
    body: renderTemplate(template.bodyTemplate, context),
    sourceLabel: sourceForCategory(template.category),
    locationRoom: CATEGORY_TO_ROOM[template.category],
    options: buildOptions(template, context, rng),
    tags: [...template.triggerTags, "template"],
    repeatKey: template.id
  };
}

export function createNewsFromTemplate(template: NarrativeTemplate, context: TemplateContext, rng: SeededRng): NewsItem {
  return {
    id: `template-news-${template.id}-${rng.int(100000, 999999)}`,
    type: CATEGORY_TO_NEWS[template.category],
    date: context.date ?? new Date().toISOString(),
    headline: renderTemplate(template.headlineTemplate, context),
    body: renderTemplate(template.bodyTemplate, context),
    severity: template.severity === "critical" ? "high" : template.severity,
    teamId: context.teamId,
    playerId: context.playerId
  };
}

export function validateNarrativeTemplates(templates: NarrativeTemplate[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const template of templates) {
    if (ids.has(template.id)) issues.push(`Duplicate template id ${template.id}.`);
    ids.add(template.id);
    if (!template.headlineTemplate.trim()) issues.push(`${template.id} is missing a headline.`);
    if (!template.bodyTemplate.trim()) issues.push(`${template.id} is missing a body.`);
    if (template.weight <= 0) issues.push(`${template.id} has a non-positive weight.`);
    if (template.cooldownDays < 0) issues.push(`${template.id} has a negative cooldown.`);
    const text = `${template.headlineTemplate} ${template.bodyTemplate} ${template.optionTemplates
      ?.map((option) => `${option.labelTemplate} ${option.descriptionTemplate} ${option.previewTemplate}`)
      .join(" ")}`;
    for (const term of PROHIBITED_REAL_HOCKEY_TERMS) {
      if (new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").test(text)) {
        issues.push(`${template.id} contains prohibited real hockey term: ${term}.`);
      }
    }
  }
  return issues;
}

export function getTemplateContextFromFranchise(franchise: FranchiseState, trigger: Partial<TemplateContext> = {}): TemplateContext {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId) ?? franchise.league.teams[0];
  const opponentId = trigger.opponentId ?? franchise.league.schedule.find((game) => !game.played && (game.homeTeamId === team.id || game.awayTeamId === team.id))
    ?.homeTeamId;
  const opponent = franchise.league.teams.find((candidate) => candidate.id === opponentId && candidate.id !== team.id) ?? franchise.league.teams.find((candidate) => candidate.id !== team.id);
  const player = team.roster
    .filter((candidate) => candidate.rosterStatus !== "retired")
    .sort((a, b) => b.overall - a.overall)[0];
  const prospect = franchise.scouting.draftClass[0] ?? undefined;
  const record = `${team.record.wins}-${team.record.losses}-${team.record.overtimeLosses}`;
  const rival = opponent ?? franchise.league.teams.find((candidate) => candidate.id !== team.id);
  return {
    team: team.fullName,
    teamId: team.id,
    opponent: opponent?.fullName,
    opponentId: opponent?.id,
    rival: rival?.fullName,
    rivalId: rival?.id,
    player: player?.displayName,
    playerId: player?.id,
    position: player?.position,
    agent: franchise.agents[0]?.displayName,
    agentId: franchise.agents[0]?.id,
    prospect: prospect?.displayName,
    prospectId: prospect?.id,
    coach: franchise.staffState.teamStaff[team.id]?.find((staff) => staff.role === "Assistant Coach")?.displayName ?? "the coaching staff",
    record,
    phase: franchise.seasonPhase,
    streak: team.record.streak,
    round: franchise.playoffState ? `Round ${franchise.playoffState.currentRound}` : "the next round",
    pick: franchise.offseasonState?.draftState ? `${franchise.offseasonState.draftState.round}.${franchise.offseasonState.draftState.pickNumber}` : "the next pick",
    date: franchise.league.currentDate,
    difficulty: franchise.gmProfile.difficulty,
    storyFrequency: franchise.gmProfile.storyFrequency,
    ...trigger
  };
}

function sourceForCategory(category: NarrativeTemplate["category"]): string {
  if (category === "owner") return "Owner Suite";
  if (category === "agent") return "Agent Desk";
  if (category === "player") return "Player Meeting Room";
  if (category === "team") return "Locker Room";
  if (category === "media" || category === "press") return "Press Room";
  if (category === "fan") return "Fan Pulse";
  return "Hockey Ops";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
