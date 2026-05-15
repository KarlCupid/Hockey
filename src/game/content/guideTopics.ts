import type { GuideTopic, RoomId } from "../types";

const roomGuide = (id: string, title: string, roomId: RoomId, summary: string, body: string, actions: string[] = []): GuideTopic => ({
  id,
  title,
  category: "rooms",
  summary,
  body,
  relatedRoomIds: [roomId],
  relatedActions: actions
});

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "basics-what-is-franchise-ice",
    title: "What is Franchise Ice?",
    category: "basics",
    summary: "A fictional hockey operations dynasty where you run the bench and the front office.",
    body:
      "Franchise Ice is a client-only hockey operations prototype. You guide a fictional club through games, roster choices, contracts, trades, scouting, development, staff, owner expectations, and story events. The goal is not perfect rule simulation; the goal is a readable dynasty sandbox that lets you make meaningful hockey-ops decisions season after season.",
    relatedRoomIds: ["gm"],
    relatedActions: ["startFranchise", "assistantReport"]
  },
  {
    id: "basics-your-role",
    title: "Your role: GM + Head Coach",
    category: "basics",
    summary: "You make front-office choices and set the lineup/tactics for game day.",
    body:
      "You are both general manager and head coach. In the office you respond to owner, media, agent, and player pressure. In the hockey rooms you manage roster status, lines, tactics, development, scouting, and contracts. The Assistant GM report and Master Action Queue are the safest first checks when you are unsure what matters next.",
    relatedRoomIds: ["gm", "coach", "roster"],
    relatedActions: ["assistantReport", "actionQueue"]
  },
  {
    id: "basics-moving-around",
    title: "Moving around the facility",
    category: "basics",
    summary: "Use the third-person hub, room prompts, map, and keyboard shortcuts.",
    body:
      "Move through the facility with the regular movement controls, enter nearby rooms from the prompt, or open the map for direct navigation. Keyboard shortcuts can jump to the busiest rooms when enabled, and Esc closes the current panel.",
    relatedRoomIds: ["gm", "settings"],
    relatedActions: ["moveFacility", "openMap", "keyboardShortcuts"]
  },
  {
    id: "basics-saving-loading",
    title: "Saving and loading",
    category: "basics",
    summary: "Saves are local, repairable, exportable, and never sent to a server.",
    body:
      "The Save Desk stores franchise state locally in your browser. Saves include serializable game state only. You can export/import JSON, validate integrity, repair old saves, and export a local bug report without including the full save by default.",
    relatedRoomIds: ["saves", "settings"],
    relatedActions: ["saveFranchise", "loadFranchise", "exportBugReport"]
  },
  {
    id: "basics-assistant-gm-action-queue",
    title: "Assistant GM and action queue",
    category: "basics",
    summary: "Use recommendations and room badges to find the next useful action.",
    body:
      "Assistant GM reports summarize risks, opportunities, and linked rooms. The action queue prioritizes lineup, roster, cap, contract, scouting, owner, story, and phase tasks. It is advisory, so advanced players can ignore it, but new players should read it at the start of each session.",
    relatedRoomIds: ["gm"],
    relatedActions: ["assistantReport", "actionQueue", "roomBadges"]
  },
  roomGuide("room-gm-office", "GM Office", "gm", "Your command center.", "Read the inbox, Assistant GM reports, owner pressure, action queue, tutorial progress, recent milestones, and next-phase guidance here.", [
    "assistantReport",
    "advancePhase"
  ]),
  roomGuide("room-roster-office", "Roster Office", "roster", "Manage roster status.", "Move players between active roster, scratches, affiliate, injured reserve, and prospect rights. Use auto-repair only as a safety net; a healthy active roster keeps simulation reliable.", [
    "rosterMove",
    "repairRoster"
  ]),
  roomGuide("room-coach-office", "Coach's Office", "coach", "Set lines and tactics.", "Auto-fill lines for a quick playable setup, then adjust combinations and tactical sliders. Line chemistry, goalie choices, fatigue, and active roster legality matter most before simming.", [
    "autoFillLineup",
    "adjustTactic"
  ]),
  roomGuide("room-locker-room", "Locker Room", "locker", "Read morale and form.", "The locker room shows player morale, form, fatigue, stats, relationships, and team pulse. Use it after games or story decisions to see who needs attention.", ["playerPulse"]),
  roomGuide("room-medical", "Medical Room", "medical", "Track injuries and workload.", "Review injury status, recovery notes, and fatigue concerns. Keep heavily fatigued players away from repeated high-pressure usage when possible.", ["injuryReview"]),
  roomGuide("room-arena-bowl", "Arena Bowl", "arena", "Sim games and review presentation.", "Preview matchups, choose instant, period, or broadcast simulation, then review the score, three stars, turning point, fan reaction, and follow-up story hooks.", [
    "simulateGame",
    "broadcastMode"
  ]),
  roomGuide("room-contract-cap", "Contract & Cap Office", "contracts", "Handle cap and expiries.", "Review salary cap space, contract years, expiry pressure, role promises, and extension candidates. The cap model is simplified and intentionally avoids retained salary, clauses, buyouts, arbitration, and offer sheets.", [
    "contractOffer",
    "capReview"
  ]),
  roomGuide("room-trade-war-room", "Trade War Room", "trades", "Build simplified trades.", "Create two-team player/pick packages and read AI evaluation feedback. Trades remain fictional, local, and simplified; multi-team trades and retained salary stay out of scope.", [
    "proposeTrade",
    "submitTrade"
  ]),
  roomGuide("room-scouting", "Scouting Department", "scouting", "Scout and draft prospects.", "Assign scouts, refine certainty, maintain a watchlist, move prospects on your draft board, and make simplified draft selections during the draft phase.", [
    "scoutingAssignment",
    "draftPick"
  ]),
  roomGuide("room-development", "Development Office", "development", "Shape player growth.", "Assign player development plans and monitor update notes. Development is simplified, but growth, regression, and prospect pathways create dynasty texture.", [
    "developmentPlan"
  ]),
  roomGuide("room-free-agency", "Free Agency Office", "freeAgency", "Sign open-market players.", "Use free agency to patch needs, add depth, or make a fan-friendly splash. Watch cap fit and roster limits before offering deals.", [
    "freeAgentOffer"
  ]),
  roomGuide("room-staff-office", "Staff Office", "staff", "Hire staff with small operation effects.", "Staff ratings gently affect tactics, scouting, development, medical, analytics, negotiation, and morale outcomes.", ["hireStaff"]),
  roomGuide("room-press-room", "Press Room", "press", "Answer media pressure.", "Resolve press conferences and media questions. Transparent, firm, or evasive answers can shift fans, media pressure, owner trust, and relationships.", [
    "decisionResolved",
    "pressConference"
  ]),
  roomGuide("room-owner-suite", "Owner Suite", "ownerSuite", "Manage owner trust.", "Review job security, patience, seasonal goals, owner meetings, and goal outcomes before they reset into a new season.", [
    "ownerGoals",
    "ownerMeeting"
  ]),
  roomGuide("room-agent-desk", "Agent Desk", "agents", "Watch agent pressure.", "Agents represent player interests and can push for role, money, communication, or public pressure. Keep key relationships from boiling over.", [
    "agentCall"
  ]),
  roomGuide("room-player-meetings", "Player Meeting Room", "playerMeetings", "Resolve player conversations.", "Talk through role, morale, team, and relationship issues. The consequences are simplified but can affect trust, chemistry, and future story arcs.", [
    "playerMeeting"
  ]),
  roomGuide("room-standings-trophy", "Standings/Trophy Hall", "standings", "Review standings, history, achievements, and milestones.", "Check standings, recent results, league history, achievements, and your franchise milestone timeline.", [
    "viewAchievements",
    "viewMilestones"
  ]),
  roomGuide("room-save-desk", "Save Desk", "saves", "Save, import, repair, and export diagnostics.", "Manage local saves, export/import JSON, run save integrity checks, and create local bug reports for playtesting.", [
    "saveFranchise",
    "exportBugReport"
  ]),
  roomGuide("room-dev-tools", "Dev Tools", "devTools", "Development-only QA tools.", "In local development, Dev Tools expose invariant checks, deterministic playtest harnesses, balance reports, and debugging actions for release-candidate validation.", [
    "runInvariants",
    "playtestHarness"
  ]),
  {
    id: "system-roster-statuses",
    title: "Roster statuses",
    category: "roster",
    summary: "Active, scratched, affiliate, injured reserve, prospect rights, and retired players each mean different things.",
    body:
      "Active players can dress for games. Scratched players stay with the club but are not in the lineup. Affiliate players develop outside the active roster. Injured reserve tracks injured players. Prospect rights represent unsigned drafted players. Retired players are preserved for history.",
    relatedRoomIds: ["roster", "coach", "medical"],
    relatedActions: ["rosterMove", "lineupReview"]
  },
  {
    id: "system-lines-tactics",
    title: "Lines and tactics",
    category: "roster",
    summary: "Line legality and tactical identity are the last checks before game simulation.",
    body:
      "Use auto-fill to produce a valid lineup quickly, then tune roles manually. Tactical sliders shape forecheck, structure, risk, physicality, pace, shot volume, and special teams aggression. The system is simplified but gives your club a readable identity.",
    relatedRoomIds: ["coach", "arena"],
    relatedActions: ["autoFillLineup", "adjustTactic", "simulateGame"]
  },
  {
    id: "system-game-simulation",
    title: "Game simulation modes",
    category: "seasonLifecycle",
    summary: "Instant, period, and broadcast modes all use the same underlying result model.",
    body:
      "Instant mode resolves the game quickly. Period mode gives you staged updates. Broadcast mode adds presentation beats, scorebug, arena atmosphere, goals, final horn, three stars, and follow-up media prompts without adding playable on-ice hockey.",
    relatedRoomIds: ["arena"],
    relatedActions: ["simulateGame", "broadcastMode"]
  },
  {
    id: "system-morale-form-fatigue",
    title: "Morale, form, and fatigue",
    category: "roster",
    summary: "Player state gives context to lineup and relationship decisions.",
    body:
      "Morale reflects player satisfaction, form reflects recent performance, and fatigue reflects workload. These values are not meant to be a black box; they are quick signals for who needs rest, minutes, or a conversation.",
    relatedRoomIds: ["locker", "coach", "playerMeetings"],
    relatedActions: ["playerPulse", "playerMeeting"]
  },
  {
    id: "system-contracts-cap",
    title: "Contracts and cap",
    category: "contracts",
    summary: "Simplified contracts, cap space, and expiry pressure support front-office planning.",
    body:
      "Contracts track salary, cap hit, years, expiry status, and role promise. Cap rules are intentionally light. The release candidate focuses on clarity, not advanced legal/rule complexity.",
    relatedRoomIds: ["contracts", "freeAgency", "trades"],
    relatedActions: ["contractOffer", "capReview"]
  },
  {
    id: "system-trades",
    title: "Trades",
    category: "trades",
    summary: "Use simplified two-team trades to adjust the roster and future picks.",
    body:
      "The Trade War Room evaluates package value, needs, and cap validity. Accepted trades can move players and draft picks. Fan and story systems may react to star trades or public rumors.",
    relatedRoomIds: ["trades", "roster"],
    relatedActions: ["proposeTrade", "submitTrade"]
  },
  {
    id: "system-scouting-draft",
    title: "Scouting and draft",
    category: "scouting",
    summary: "Certainty, draft boards, and prospect rights shape the pipeline.",
    body:
      "Scouting improves confidence in draft information. Draft selections become prospect rights, which can later be signed into the organization. The draft is simplified but supports multi-season planning.",
    relatedRoomIds: ["scouting", "draft", "development"],
    relatedActions: ["scoutingAssignment", "draftPick", "signProspect"]
  },
  {
    id: "system-development",
    title: "Development plans",
    category: "development",
    summary: "Plans give players a focused pathway and readable update notes.",
    body:
      "Development plans target broad skills and workload intensity. Staff, age, potential, fatigue, and role context influence the reports and outcomes over time.",
    relatedRoomIds: ["development", "locker"],
    relatedActions: ["developmentPlan"]
  },
  {
    id: "system-free-agency-staff",
    title: "Free agency and staff",
    category: "seasonLifecycle",
    summary: "Offseason signings and staff hires help patch problems between seasons.",
    body:
      "Free agency adds players to your club when cap and roster fit allow it. Staff hiring adds small organizational modifiers. Both systems are intentionally approachable for beta playtests.",
    relatedRoomIds: ["freeAgency", "staff"],
    relatedActions: ["freeAgentOffer", "hireStaff"]
  },
  {
    id: "system-playoffs-offseason",
    title: "Playoffs and offseason",
    category: "seasonLifecycle",
    summary: "Advance through playoffs, review, retirements, draft, re-signing, free agency, staff, and camp.",
    body:
      "The season lifecycle is broad and simplified. Use phase guidance, owner goals, and the action queue to know when to simulate, draft, sign, hire, and open a new season.",
    relatedRoomIds: ["gm", "standings", "scouting", "contracts", "freeAgency", "staff"],
    relatedActions: ["advancePhase"]
  },
  {
    id: "system-owner-goals",
    title: "Owner goals",
    category: "livingOps",
    summary: "Seasonal goals shape trust and job security.",
    body:
      "Owner goals can focus on performance, cap, draft, or development. Phase 8 records goal outcomes before seasonal refresh so playtest reports can show what actually happened.",
    relatedRoomIds: ["ownerSuite", "gm"],
    relatedActions: ["ownerGoals", "advancePhase"]
  },
  {
    id: "system-relationships-stories",
    title: "Relationships and story arcs",
    category: "livingOps",
    summary: "Fictional conversations add pressure and consequences around hockey-ops choices.",
    body:
      "Press, owner, agent, player, team, and rivalry events create simplified consequences for trust, morale, fans, media, and chemistry. They are local-only narrative layers, not online services.",
    relatedRoomIds: ["press", "ownerSuite", "agents", "playerMeetings", "locker"],
    relatedActions: ["decisionResolved"]
  },
  {
    id: "system-difficulty-modes",
    title: "Difficulty and game modes",
    category: "settings",
    summary: "Difficulty, game mode, story cadence, and start presets alter pressure without changing the core rules.",
    body:
      "Relaxed, standard, demanding, and hardcore settings adjust pressure and tolerance. Game modes and GM background traits add starting flavor and operational modifiers.",
    relatedRoomIds: ["settings", "gm"],
    relatedActions: ["difficultySettings"]
  },
  {
    id: "system-achievements-milestones",
    title: "Achievements and milestones",
    category: "basics",
    summary: "Local-only rewards and timeline entries help playtests feel complete.",
    body:
      "Achievements celebrate first wins, trades, draft picks, playoff progress, owner success, development, and dynasty depth. Milestones create a franchise timeline in the Trophy Hall and GM Office.",
    relatedRoomIds: ["gm", "standings"],
    relatedActions: ["viewAchievements", "viewMilestones"]
  },
  {
    id: "system-custom-league-lab",
    title: "Custom League Lab",
    category: "basics",
    summary: "Create local fictional leagues, scenarios, rosters, draft classes, and data packs.",
    body:
      "Phase 9 adds a Custom League Lab for local-only fictional content. Data packs are JSON files you can validate, repair, import, export, and start from. The current full-dynasty custom start supports 12-team fictional leagues; other sizes are flagged until broader lifecycle support is added. The real-world content filter catches obvious restricted terms but is not a legal guarantee.",
    relatedRoomIds: ["saves", "devTools", "gm"],
    relatedActions: ["customLeague", "dataPack", "scenarioStart"]
  }
];

export const GUIDE_TOPIC_IDS = GUIDE_TOPICS.map((topic) => topic.id);
