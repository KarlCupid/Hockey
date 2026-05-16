import type { DecisionOptionTemplate, NarrativeTemplate } from "../types";

export const NARRATIVE_TEMPLATE_VERSION = 2;

const CALM_OPTION: DecisionOptionTemplate = {
  tone: "transparent",
  labelTemplate: "Name the standard",
  descriptionTemplate: "Give {team} a clear, measured answer without escalating the room.",
  previewTemplate: "Small trust gain if the answer matches the moment.",
  outcomeProfile: "honest"
};

const PROTECT_OPTION: DecisionOptionTemplate = {
  tone: "supportive",
  labelTemplate: "Protect the room",
  descriptionTemplate: "Keep pressure away from {player} and put the focus on the club.",
  previewTemplate: "Can help chemistry, but may invite follow-up questions.",
  outcomeProfile: "protective"
};

const FIRM_OPTION: DecisionOptionTemplate = {
  tone: "firm",
  labelTemplate: "Set the expectation",
  descriptionTemplate: "Make the standard public and ask the group to meet it.",
  previewTemplate: "Can help accountability, with some relationship risk.",
  outcomeProfile: "accountable"
};

const RISK_OPTION: DecisionOptionTemplate = {
  tone: "risky",
  labelTemplate: "Push the moment",
  descriptionTemplate: "Use a sharper message to jolt {team} into action.",
  previewTemplate: "Higher upside, higher pressure.",
  outcomeProfile: "risky"
};

const DEFAULT_OPTIONS = [CALM_OPTION, PROTECT_OPTION, FIRM_OPTION];

interface TemplateSeed {
  headline: string;
  body: string;
  tags: string[];
  options?: DecisionOptionTemplate[];
}

function buildTemplates(category: NarrativeTemplate["category"], seeds: TemplateSeed[], cooldownDays = 8): NarrativeTemplate[] {
  return seeds.map((seed, index) => ({
    id: `${category}-${String(index + 1).padStart(2, "0")}`,
    category,
    triggerTags: seed.tags,
    severity: index % 9 === 0 ? "high" : index % 3 === 0 ? "medium" : "low",
    headlineTemplate: seed.headline,
    bodyTemplate: seed.body,
    optionTemplates: seed.options ?? DEFAULT_OPTIONS,
    cooldownDays: cooldownDays + (index % 4),
    weight: 8 + (index % 5)
  }));
}

function buildPrefixedTemplates(prefix: string, category: NarrativeTemplate["category"], seeds: TemplateSeed[], cooldownDays = 6): NarrativeTemplate[] {
  return buildTemplates(category, seeds, cooldownDays).map((template, index) => ({
    ...template,
    id: `${category}-${prefix}-${String(index + 1).padStart(2, "0")}`,
    weight: template.weight + 1
  }));
}

const press = buildTemplates("press", [
  { headline: "{team} faces questions after {streak}", body: "The postgame room wants a clearer answer on whether the recent {streak} is a blip or a warning sign before {opponent}.", tags: ["press", "streak"] },
  { headline: "{player} becomes the podium topic", body: "Reporters keep circling back to {player}'s minutes and whether the role still fits the club's plan.", tags: ["press", "player"] },
  { headline: "A quiet quote turns loud", body: "A clipped answer about {phase} has become the lead note across the local show panels.", tags: ["press", "media"] },
  { headline: "{team} asked to define the standard", body: "The room wants to know what accountability looks like after the latest uneven stretch.", tags: ["press", "accountability"] },
  { headline: "Goalie usage draws a second wave", body: "With {record} on the board, every question seems to come back to the crease plan.", tags: ["press", "goalie"] },
  { headline: "Practice tempo becomes the story", body: "A hard skate before {opponent} raised questions about whether the club needs rest or a reset.", tags: ["press", "practice"] },
  { headline: "{rival} week lights up the microphones", body: "The rivalry angle is easy content, and the next quote could feed the whole week.", tags: ["press", "rivalry"] },
  { headline: "Line changes need an explanation", body: "The latest combinations left reporters asking whether {player} is being challenged or protected.", tags: ["press", "lineup"] },
  { headline: "The room wants a trade-deadline clue", body: "A roster question about {position} depth quickly turned into a broader ask about the market.", tags: ["press", "trade"] },
  { headline: "Prospect patience gets tested", body: "A question about {prospect} is really a question about whether the front office trusts its pipeline.", tags: ["press", "prospect"] },
  { headline: "The owner suite quote follows you", body: "A public comment about expectations put your next media availability under a brighter light.", tags: ["press", "owner"] },
  { headline: "Fans want the plan in plain words", body: "The call-in shows are asking whether {team} is chasing the present or building for the next wave.", tags: ["press", "fan"] },
  { headline: "Special teams pressure reaches the podium", body: "The first question is blunt: does the staff need a new answer before the next game?", tags: ["press", "staff"] },
  { headline: "The captain's tone becomes the headline", body: "A careful comment from the room captain has reporters asking whether the group is aligned.", tags: ["press", "team"] },
  { headline: "Draft patience meets market impatience", body: "The room wants to know if pick {pick} can matter soon enough for the current roster.", tags: ["press", "draft"] },
  { headline: "A road trip becomes a referendum", body: "The upcoming swing through {opponent} territory is being framed as a test of the whole operation.", tags: ["press", "travel"] },
  { headline: "Free agency buzz gets ahead of the room", body: "A rumored target has the microphones pointed toward your current players.", tags: ["press", "freeAgency"] },
  { headline: "A simple injury update needs care", body: "The question is medical on the surface, but the room hears it as a depth and trust issue.", tags: ["press", "injury"] }
]);

const owner = buildTemplates("owner", [
  { headline: "Owner asks for a cleaner direction", body: "The owner wants a short answer on how {team} gets from {record} to a credible next step.", tags: ["owner", "goals"] },
  { headline: "Budget confidence gets reviewed", body: "A cap-space question turns into a broader discussion about whether the spending plan matches the results.", tags: ["owner", "cap"] },
  { headline: "Prospect timeline reaches the suite", body: "The owner is hearing about {prospect} and wants to know whether patience is still the right pitch.", tags: ["owner", "prospect"] },
  { headline: "A playoff promise needs oxygen", body: "Expectations around {round} are back in the conversation after a tense week.", tags: ["owner", "playoff"] },
  { headline: "The owner wants less drift", body: "The message is not panic, but the suite wants fewer soft weeks and clearer checkpoints.", tags: ["owner", "pressure"] },
  { headline: "Veteran direction gets challenged", body: "The owner asks whether {player} is part of the climb or a contract you need to manage.", tags: ["owner", "veteran"] },
  { headline: "Fan noise reaches ownership", body: "A rise in public frustration has the owner asking what the club can say and actually do.", tags: ["owner", "fan"] },
  { headline: "Staff trust gets a direct question", body: "The owner asks whether the current staff has the answers or just the same explanations.", tags: ["owner", "staff"] },
  { headline: "A rebuild pitch needs proof", body: "The suite can accept pain, but wants evidence in draft position, prospect usage, and development reports.", tags: ["owner", "rebuild"] },
  { headline: "A contender pitch needs results", body: "The owner wants to know why a win-now club is still leaving points on the table.", tags: ["owner", "contender"] },
  { headline: "Market confidence becomes a goal", body: "The suite sees fan sentiment as part of the job now, not a cosmetic number.", tags: ["owner", "media"] },
  { headline: "The next ten games matter", body: "Ownership quietly marks the next stretch as a read on the direction of {team}.", tags: ["owner", "schedule"] }
], 12);

const agent = buildTemplates("agent", [
  { headline: "{agent} wants role clarity", body: "The ask is not just money. {agent} wants to hear where {player} fits before talks move forward.", tags: ["agent", "role"] },
  { headline: "A camp promise gets revisited", body: "{agent} says the player's camp remembers the last conversation differently.", tags: ["agent", "promise"] },
  { headline: "Extension patience wears thin", body: "The agent camp is still professional, but the next offer needs to feel intentional.", tags: ["agent", "contract"] },
  { headline: "A public rumor changes the temperature", body: "{agent} does not like seeing {player}'s name become market chatter without a call first.", tags: ["agent", "trade"] },
  { headline: "Free-agent leverage arrives early", body: "The market around {player} is forming before the official window opens.", tags: ["agent", "freeAgency"] },
  { headline: "A young player asks for a path", body: "{agent} wants to know whether development means real opportunity or another vague report.", tags: ["agent", "development"] },
  { headline: "Hardball tone from the camp", body: "The relationship is intact, but the next move may set the negotiation posture for weeks.", tags: ["agent", "hardball"] },
  { headline: "A loyalty pitch is available", body: "{agent} hints that a respectful path could matter almost as much as the final number.", tags: ["agent", "loyalty"] },
  { headline: "The role promise becomes currency", body: "The camp is asking whether the club can back its money with ice-time trust.", tags: ["agent", "role"] },
  { headline: "A depth player's camp wants honesty", body: "The call is direct: does the player have a future here, or should everyone plan accordingly?", tags: ["agent", "depth"] },
  { headline: "A bonus of respect is on the table", body: "{agent} opens the conversation calmly, giving you room to keep it that way.", tags: ["agent", "relationship"] },
  { headline: "A deadline starts to feel real", body: "The camp says it will listen, but not forever.", tags: ["agent", "deadline"] }
]);

const player = buildTemplates("player", [
  { headline: "{player} asks for a direct conversation", body: "The player says the right things publicly, but wants to know where the trust really stands.", tags: ["player", "trust"] },
  { headline: "Role satisfaction dips below the surface", body: "{player} is not causing trouble, yet the room can tell the current usage is wearing on him.", tags: ["player", "role"] },
  { headline: "A young player wants the next step", body: "{prospect} has put in the work and wants to know what more is required.", tags: ["player", "prospect"] },
  { headline: "A veteran asks about the direction", body: "{player} wants to understand whether this is still a push or already a reset.", tags: ["player", "veteran"] },
  { headline: "The captain asks for help reading the room", body: "Leadership senses the group needs a clearer message before frustration hardens.", tags: ["player", "captain"] },
  { headline: "A scratch decision lingers", body: "The lineup call made sense on paper, but {player} needs the reason delivered with care.", tags: ["player", "scratch"] },
  { headline: "A goalie wants the crease plan", body: "The next answer could settle the tandem or turn every start into a headline.", tags: ["player", "goalie"] },
  { headline: "A top-six forward wants accountability", body: "{player} believes standards are uneven and asks whether production buys too much leash.", tags: ["player", "accountability"] },
  { headline: "A defensive pair feels unstable", body: "The player wants to know whether the constant changes are tactical or a vote of no confidence.", tags: ["player", "lineup"] },
  { headline: "A prospect worries about being parked", body: "{prospect} is learning, but the development path needs a visible next rung.", tags: ["player", "affiliate"] },
  { headline: "A quiet player finally speaks up", body: "The conversation is low-volume, but the concern is real enough to matter.", tags: ["player", "trust"] },
  { headline: "A contract year sharpens every word", body: "{player} hears every usage decision through the lens of the next negotiation.", tags: ["player", "contract"] },
  { headline: "A player wants the trade noise addressed", body: "The room is professional, but the rumor has started to change how teammates talk.", tags: ["player", "trade"] },
  { headline: "A leadership group asks for consistency", body: "The veterans want one standard for meetings, media, and lineup accountability.", tags: ["player", "leadership"] },
  { headline: "A returning injured player needs patience", body: "{player} wants to help now, but the medical path and the emotional path are not identical.", tags: ["player", "injury"] },
  { headline: "A high-skill winger wants more touches", body: "The request is about usage, but the answer will be heard as trust.", tags: ["player", "role"] },
  { headline: "A young defender needs a steady message", body: "Mistakes are part of the curve, but mixed feedback is starting to slow the growth.", tags: ["player", "development"] },
  { headline: "A room voice challenges the mood", body: "{player} asks whether the club is acting like a group chasing something or surviving something.", tags: ["player", "chemistry"] }
]);

const team = buildTemplates("team", [
  { headline: "The room needs a reset meeting", body: "The group has not fractured, but the tone after {streak} suggests silence would be a choice.", tags: ["team", "meeting"] },
  { headline: "Practice ends with mixed signals", body: "Some players see urgency. Others see panic. The next message needs to land cleanly.", tags: ["team", "practice"] },
  { headline: "Leadership asks for one voice", body: "Players want clarity from the front office and staff before the next stretch.", tags: ["team", "leadership"] },
  { headline: "The bench feels thin on patience", body: "Role players are absorbing pressure, and chemistry could wobble if no one names it.", tags: ["team", "chemistry"] },
  { headline: "A winning streak needs humility", body: "Success has lifted the room, but the staff worries about shortcuts before {opponent}.", tags: ["team", "streak"] },
  { headline: "A hard loss tests accountability", body: "The group can own it together or let the story splinter by line and role.", tags: ["team", "loss"] },
  { headline: "Veterans want the kids protected", body: "The room sees the promise in {prospect}, but wants expectations handled responsibly.", tags: ["team", "prospect"] },
  { headline: "A trade rumor reaches the room", body: "No one says it loudly, but players know who might be moved.", tags: ["team", "trade"] },
  { headline: "The next game feels bigger than one night", body: "A routine matchup has become a temperature check on the club.", tags: ["team", "pressure"] },
  { headline: "The room asks for a simple standard", body: "Players want to know what matters most: result, effort, role, or patience.", tags: ["team", "standard"] }
], 9);

const media = buildTemplates("media", [
  { headline: "Panel chatter turns skeptical", body: "The local shows are starting to frame {team} as interesting but incomplete.", tags: ["media", "pressure"] },
  { headline: "A column questions the timeline", body: "The piece never names panic, but every paragraph points toward impatience.", tags: ["media", "column"] },
  { headline: "The market wants a villain", body: "After {streak}, the easiest story is to pin the blame on one room.", tags: ["media", "fan"] },
  { headline: "A positive story needs protecting", body: "{prospect}'s rise is good news, but the coverage is already jumping ahead.", tags: ["media", "prospect"] },
  { headline: "Trade talk floods the week", body: "Every radio segment has a new idea for fixing {position}.", tags: ["media", "trade"] },
  { headline: "The quiet market gets loud", body: "Even patient fans are beginning to ask for a visible response.", tags: ["media", "pressure"] },
  { headline: "Playoff math enters the conversation", body: "The standings board is now part of every question, even in casual coverage.", tags: ["media", "playoff"] },
  { headline: "A clean win shifts the tone", body: "The media room is still skeptical, but it has to acknowledge the response.", tags: ["media", "win"] },
  { headline: "A quiet practice gets interpreted", body: "The beat is turning small details into clues about confidence and fatigue.", tags: ["media", "practice"] },
  { headline: "A depth move gets bigger coverage", body: "The transaction is modest, but the market is reading it as a statement about {position}.", tags: ["media", "roster"] },
  { headline: "The morning show wants a promise", body: "Hosts are pressing for one clean declaration about where {team} is headed.", tags: ["media", "owner"] },
  { headline: "A prospect feature changes pressure", body: "The story on {prospect} is positive, but it also raises the call-up temperature.", tags: ["media", "prospect"] }
], 7);

const fan = buildTemplates("fan", [
  { headline: "Fan sentiment splits by timeline", body: "Some want patience for {prospect}; others want a move before the season slips.", tags: ["fan", "timeline"] },
  { headline: "The building asks for urgency", body: "The next home game could either settle the crowd or sharpen the whistles.", tags: ["fan", "home"] },
  { headline: "Jersey-night optimism returns", body: "A strong player moment has given fans something specific to believe in.", tags: ["fan", "optimism"] },
  { headline: "A star rumor shakes the base", body: "Even a soft rumor around {player} is enough to change the mood.", tags: ["fan", "trade"] },
  { headline: "Patience for the rebuild gets tested", body: "Fans can accept development, but they want to see the next wave moving.", tags: ["fan", "rebuild"] },
  { headline: "Contender expectations get loud", body: "A win-now roster does not get many quiet losses in this market.", tags: ["fan", "contender"] },
  { headline: "A rivalry week sells itself", body: "The crowd is ready for {rival}, and anything flat will feel personal.", tags: ["fan", "rivalry"] },
  { headline: "A prospect call-up sparks hope", body: "{prospect} gives the fan base a fresh reason to check the lineup first.", tags: ["fan", "prospect"] },
  { headline: "The concourse wants a direction", body: "Fans can explain the standings, but they still want the front office to explain the plan.", tags: ["fan", "direction"] },
  { headline: "A home loss leaves a mark", body: "The building emptied with a mood that will not reset by itself.", tags: ["fan", "loss"] },
  { headline: "A gritty win buys goodwill", body: "The crowd liked the details, not just the final score.", tags: ["fan", "win"] },
  { headline: "A deadline rumor pulls attention", body: "Fans are refreshing the market board more than the lineup sheet.", tags: ["fan", "trade"] }
], 7);

const rivalry = buildTemplates("rivalry", [
  { headline: "{rival} week gets an edge", body: "The last meeting left enough friction that every quote is being saved for game night.", tags: ["rivalry", "opponent"] },
  { headline: "A rivalry hit still echoes", body: "The room remembers the previous game, and the media wants someone to say it out loud.", tags: ["rivalry", "physical"] },
  { headline: "Two benches, one old argument", body: "The matchup has become a contest of style as much as standings.", tags: ["rivalry", "identity"] },
  { headline: "The crowd has marked this one", body: "The rivalry story can boost the room or drag it into needless noise.", tags: ["rivalry", "fan"] },
  { headline: "A familiar opponent tests discipline", body: "The staff wants emotion without penalties. The players want the game to mean something.", tags: ["rivalry", "discipline"] },
  { headline: "A playoff memory returns early", body: "Even in {phase}, this matchup carries postseason language.", tags: ["rivalry", "playoff"] },
  { headline: "A star matchup owns the preview", body: "{player} is being framed against the other bench's best answer.", tags: ["rivalry", "star"] },
  { headline: "The rematch needs a message", body: "The team can chase revenge or treat the night as a standard-setting chance.", tags: ["rivalry", "rematch"] }
], 10);

const playoff = buildTemplates("playoff", [
  { headline: "{round} pressure reaches the room", body: "The series frame has changed how every lineup decision is being judged.", tags: ["playoff", "round"] },
  { headline: "A series swing needs a response", body: "The group can either tighten up or start carrying the last game into the next one.", tags: ["playoff", "momentum"] },
  { headline: "The goalie decision gets magnified", body: "In the playoffs, a normal crease question becomes an organizational statement.", tags: ["playoff", "goalie"] },
  { headline: "Depth scoring becomes the story", body: "The top of the lineup has done enough. The room now waits on the next layer.", tags: ["playoff", "depth"] },
  { headline: "A young player gets playoff attention", body: "{prospect} is learning fast, but the spotlight has less patience now.", tags: ["playoff", "prospect"] },
  { headline: "The owner asks about the moment", body: "The suite wants to know whether the club is managing pressure or being managed by it.", tags: ["playoff", "owner"] },
  { headline: "A rivalry series sharpens every quote", body: "{rival} has turned this series into a nightly referendum on identity.", tags: ["playoff", "rivalry"] },
  { headline: "The staff faces adjustment pressure", body: "The opposing bench has found a lever. The next answer belongs to your room.", tags: ["playoff", "staff"] },
  { headline: "Elimination language arrives early", body: "No one is out yet, but the market is already using survival words.", tags: ["playoff", "pressure"] },
  { headline: "A breakthrough win changes belief", body: "One result has not finished the job, but it has changed the oxygen around {team}.", tags: ["playoff", "win"] }
], 10);

const draft = buildTemplates("draft", [
  { headline: "Pick {pick} becomes a philosophy test", body: "The board has options: safer floor, bigger upside, or a direct answer at {position}.", tags: ["draft", "pick"] },
  { headline: "A scout pounds the table", body: "The room has one voice pushing hard for {prospect}, and the confidence is contagious.", tags: ["draft", "scouting"] },
  { headline: "A public ranking creates tension", body: "The outside board likes a different name than your scouts do.", tags: ["draft", "board"] },
  { headline: "A rebuild needs a signature pick", body: "The owner wants the draft to feel like progress, not just patience.", tags: ["draft", "rebuild"] },
  { headline: "A contender weighs need over upside", body: "The staff sees a faster path with a lower ceiling, and the scouts are not convinced.", tags: ["draft", "contender"] },
  { headline: "A goalie prospect divides the room", body: "The upside is real, but the timeline asks the franchise to wait.", tags: ["draft", "goalie"] },
  { headline: "A late pick gets louder", body: "A scout's final note on {prospect} has made a quiet selection feel important.", tags: ["draft", "late"] },
  { headline: "The draft board asks for nerve", body: "The best value and the cleanest story are not the same player.", tags: ["draft", "value"] }
], 11);

const freeAgency = buildTemplates("freeAgency", [
  { headline: "Free agency opens with a fit question", body: "The best available player is not necessarily the cleanest fit for {team}.", tags: ["freeAgency", "fit"] },
  { headline: "A target wants conviction", body: "{agent} says the player wants to feel wanted before the market gets loud.", tags: ["freeAgency", "agent"] },
  { headline: "Cap space burns a hole in the plan", body: "There is room to move, but the wrong deal could turn tomorrow's flexibility into noise.", tags: ["freeAgency", "cap"] },
  { headline: "A value winger waits out the board", body: "The market has not moved yet, giving {team} a small window for patience.", tags: ["freeAgency", "value"] },
  { headline: "A veteran wants a defined role", body: "The ask is modest money and real usage, not a vague depth promise.", tags: ["freeAgency", "role"] },
  { headline: "A bidding pocket forms quickly", body: "Two clubs are circling the same target, and waiting may turn the price.", tags: ["freeAgency", "market"] }
], 9);

const trade = buildTemplates("trade", [
  { headline: "A trade fit appears at {position}", body: "The market has one clean match, but the ask may test your valuation discipline.", tags: ["trade", "position"] },
  { headline: "{player} enters rumor orbit", body: "The name has not come from your room, but the league has started connecting dots.", tags: ["trade", "rumor"] },
  { headline: "A rival calls with an uncomfortable fit", body: "The deal could help both teams, which is exactly why it feels hard to trust.", tags: ["trade", "rival"] },
  { headline: "A cap-pressure deal opens", body: "Another club needs relief, and the first call rewards preparedness.", tags: ["trade", "cap"] },
  { headline: "A prospect price divides the office", body: "The trade helps now, but the room knows {prospect} could be the bill later.", tags: ["trade", "prospect"] },
  { headline: "A quiet seller changes the board", body: "One team has started listening, and the window may not stay open.", tags: ["trade", "market"] }
], 9);

const development = buildTemplates("development", [
  { headline: "{prospect} needs a development call", body: "The reports show progress, but the next focus could decide how soon the player looks ready.", tags: ["development", "prospect"] },
  { headline: "A young defender needs a simpler path", body: "The tools are there. The question is whether the plan is asking for too much at once.", tags: ["development", "defense"] },
  { headline: "The development staff wants patience", body: "A short-term call-up might excite the room, but the staff sees a longer runway.", tags: ["development", "staff"] },
  { headline: "A skill jump asks for opportunity", body: "{prospect} has earned a louder conversation about role, not just reports.", tags: ["development", "breakout"] },
  { headline: "A plateau needs a new focus", body: "The plan is not failing, but the next month should not simply repeat the last one.", tags: ["development", "plateau"] },
  { headline: "A goalie project needs calm hands", body: "The talent is visible, but volatility makes the next development note important.", tags: ["development", "goalie"] },
  { headline: "A strength plan changes the projection", body: "{prospect} is close enough that one focused block could make the role more believable.", tags: ["development", "strength"] },
  { headline: "A confidence report asks for care", body: "The player is improving, but the message needs to protect belief as much as skill.", tags: ["development", "confidence"] }
], 10);

const affiliate = buildTemplates("affiliate", [
  { headline: "The affiliate sends a real candidate", body: "{prospect} is not a finished answer, but the latest report says the gap is closing.", tags: ["affiliate", "promotion"] },
  { headline: "Affiliate usage becomes a question", body: "The development staff wants a clearer role before another month drifts by.", tags: ["affiliate", "role"] },
  { headline: "A call-up could jolt the room", body: "The big club needs energy, and the affiliate has one player forcing the question.", tags: ["affiliate", "callup"] },
  { headline: "The pipeline wants recognition", body: "A strong affiliate week has given the organization something constructive to talk about.", tags: ["affiliate", "pipeline"] },
  { headline: "A veteran depth piece wants clarity", body: "The affiliate role is professional, but the player still needs to know if a path exists.", tags: ["affiliate", "veteran"] },
  { headline: "A young center earns extra minutes", body: "{prospect} is handling harder matchups and asking for a bigger internal conversation.", tags: ["affiliate", "center"] },
  { headline: "The affiliate staff flags fatigue", body: "A useful prospect is taking heavy minutes, and the next decision is workload more than hype.", tags: ["affiliate", "fatigue"] },
  { headline: "A defensive prospect steadies the report", body: "{prospect} has fewer loud moments but more reliable habits than last month.", tags: ["affiliate", "defense"] }
], 10);

const closedBetaPolish = [
  ...buildPrefixedTemplates("closed-beta", "press", [
    { headline: "A postgame detail becomes the question", body: "The room is less interested in the score than the sequence that tilted the bench after {opponent}.", tags: ["press", "postgame"] },
    { headline: "The next answer needs fewer slogans", body: "Reporters are asking for one practical change, not a broad promise about compete level.", tags: ["press", "clarity"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "owner", [
    { headline: "The owner wants a playable plan", body: "The suite asks for a plan the hockey staff can actually execute this week, not a season-long speech.", tags: ["owner", "clarity"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "agent", [
    { headline: "{agent} asks for a cleaner signal", body: "The camp can live with patience, but mixed usage and quiet phones are starting to feel like a message.", tags: ["agent", "clarity"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "player", [
    { headline: "{player} wants the why", body: "The player is not challenging the decision, but needs the reasoning before the next practice.", tags: ["player", "clarity"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "team", [
    { headline: "The room needs one next step", body: "The group has heard enough big-picture language. The next meeting needs one clear action.", tags: ["team", "guidance"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "media", [
    { headline: "The local read turns practical", body: "The coverage has moved from outrage to a simple question: what changes before the next puck drop?", tags: ["media", "practical"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "fan", [
    { headline: "Fans respond to a visible adjustment", body: "The crowd may not agree with every move, but it notices when the club explains the hockey reason.", tags: ["fan", "clarity"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "rivalry", [
    { headline: "The rivalry asks for discipline first", body: "The room wants edge, but the staff knows the first mistake could hand {rival} the story.", tags: ["rivalry", "discipline"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "playoff", [
    { headline: "A playoff note becomes the clipboard", body: "The staff has one adjustment it trusts, and the room needs to hear it before the noise fills in.", tags: ["playoff", "adjustment"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "draft", [
    { headline: "The draft table checks the risk", body: "The scouts like the upside, but the room wants to know which flaw it is actually accepting.", tags: ["draft", "risk"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "freeAgency", [
    { headline: "The market rewards a clean fit", body: "The best pitch is not the loudest offer; it is the role that makes sense the moment camp opens.", tags: ["freeAgency", "fit"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "trade", [
    { headline: "The offer needs one more check", body: "The board likes the hockey fit, but the staff wants the cap and role ripple reviewed first.", tags: ["trade", "review"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "development", [
    { headline: "The development plan asks for fewer targets", body: "{prospect} has enough notes. The next block needs one priority and a clear check-in.", tags: ["development", "focus"] }
  ]),
  ...buildPrefixedTemplates("closed-beta", "affiliate", [
    { headline: "The affiliate report gets specific", body: "The staff does not ask for a call-up yet; it asks for one skill to be tested harder.", tags: ["affiliate", "focus"] }
  ])
];

export const NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
  ...press,
  ...owner,
  ...agent,
  ...player,
  ...team,
  ...media,
  ...fan,
  ...rivalry,
  ...playoff,
  ...draft,
  ...freeAgency,
  ...trade,
  ...development,
  ...affiliate,
  ...closedBetaPolish
];
