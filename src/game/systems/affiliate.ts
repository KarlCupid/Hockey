import { clamp, type SeededRng } from "../rng";
import type { AffiliateReport, AffiliateTeam, FranchiseState, NewsItem, Player, StaffModifiers, Team } from "../types";
import { calculateTeamStaffModifiers } from "./staff";
import { getPlayerRosterStatus, validateRosterForGame } from "./rosterRules";

const AFFILIATE_NAMES: Record<string, { nickname: string; abbreviation: string; focus: AffiliateTeam["developmentFocus"] }> = {
  "harbor-city": { nickname: "Steel", abbreviation: "HCS", focus: "Strength & Physicality" },
  cascadia: { nickname: "Rain", abbreviation: "CSR", focus: "Skating" },
  northstar: { nickname: "Cubs", abbreviation: "NSC", focus: "Defensive Reliability" },
  prairie: { nickname: "Wings", abbreviation: "PRW", focus: "Offensive Skill" },
  "iron-valley": { nickname: "Forge", abbreviation: "IVF", focus: "Strength & Physicality" },
  metro: { nickname: "Sparks", abbreviation: "MTS", focus: "Offensive Skill" },
  summit: { nickname: "Peaks", abbreviation: "SUP", focus: "Skating" },
  atlantic: { nickname: "Watch", abbreviation: "ATW", focus: "Defensive Reliability" },
  lakeside: { nickname: "Crowns", abbreviation: "LKC", focus: "Hockey IQ" },
  bayview: { nickname: "Tide", abbreviation: "BVT", focus: "Special Teams" },
  capital: { nickname: "Rockets", abbreviation: "CPR", focus: "Skating" },
  desert: { nickname: "Sidewinders", abbreviation: "DSS", focus: "Defensive Reliability" }
};

export function generateAffiliateForTeam(team: Pick<Team, "id" | "city" | "primaryColor" | "secondaryColor">): AffiliateTeam {
  const identity = AFFILIATE_NAMES[team.id] ?? { nickname: "Reserve", abbreviation: `${team.id.slice(0, 3).toUpperCase()}R`, focus: "Hockey IQ" as const };
  return {
    id: `${team.id}-affiliate`,
    parentTeamId: team.id,
    city: team.city,
    nickname: identity.nickname,
    fullName: `${team.city} ${identity.nickname}`,
    abbreviation: identity.abbreviation,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    developmentFocus: identity.focus,
    reputation: 58,
    recentReports: []
  };
}

export function tickAffiliateDevelopment(franchise: FranchiseState, rng: SeededRng): FranchiseState {
  const news: NewsItem[] = [];
  const teams = franchise.league.teams.map((team) => {
    const staffModifiers = calculateTeamStaffModifiers(franchise.staffState, team.id);
    const affiliatePlayers = team.roster.filter((player) => getPlayerRosterStatus(player) === "affiliate");
    if (!affiliatePlayers.length) return team.affiliate ? team : { ...team, affiliate: generateAffiliateForTeam(team) };
    let report: AffiliateReport | undefined;
    const roster = team.roster.map((player) => {
      if (getPlayerRosterStatus(player) !== "affiliate") return player;
      const score = getAffiliateDevelopmentScore(player, staffModifiers);
      const progress = clamp(score + rng.int(-4, 7), 0, 100);
      const shouldGrow = player.overall < player.potential && rng.chance(progress / 240);
      const nextPlayer: Player = {
        ...player,
        overall: shouldGrow ? clamp(player.overall + 1, 40, player.potential) : player.overall,
        form: clamp(player.form + (progress >= 62 ? 1 : 0), 0, 100),
        morale: clamp(player.morale + (progress >= 70 ? 1 : progress <= 35 ? -1 : 0), 0, 100),
        affiliateSeasons: (player.affiliateSeasons ?? 0) + (rng.chance(0.04) ? 1 : 0),
        developmentPath: {
          ...(player.developmentPath ?? {
            track: "Affiliate Development",
            confidence: 50,
            lastReport: "",
            projectedRole: player.roleExpectation,
            eta: "Long Term"
          }),
          track: player.position === "G" ? "Goalie Project" : player.age <= 23 ? "Affiliate Development" : "Veteran Depth",
          confidence: clamp((player.developmentPath?.confidence ?? 50) + (shouldGrow ? 4 : progress >= 65 ? 1 : 0), 0, 100),
          lastReport: shouldGrow ? "Affiliate staff see a real step in daily habits." : "Affiliate minutes are giving the player steady reps.",
          eta: player.overall >= 72 ? "This Season" : player.potential - player.overall >= 7 ? "Next Season" : "Long Term"
        }
      };
      if (!report && (shouldGrow || rng.chance(0.06))) {
        report = createAffiliateReport(team, nextPlayer, progress);
      }
      return nextPlayer;
    });
    const reports = report ? [report, ...(team.affiliate?.recentReports ?? [])].slice(0, 10) : (team.affiliate?.recentReports ?? []);
    if (report) news.push(...createAffiliateNews(report, team));
    return {
      ...team,
      roster,
      affiliate: {
        ...(team.affiliate ?? generateAffiliateForTeam(team)),
        reputation: clamp((team.affiliate?.reputation ?? 58) + (report && report.progress >= 70 ? 1 : 0), 35, 90),
        recentReports: reports
      }
    };
  });

  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams
    },
    inbox: [...news, ...franchise.inbox].slice(0, 60)
  };
}

export function createAffiliateReport(team: Team, player: Player, progress: number): AffiliateReport {
  const headline =
    progress >= 75
      ? `${player.displayName} is pushing for a call`
      : progress >= 55
        ? `${player.displayName} stacking reliable affiliate minutes`
        : `${player.displayName} needs steadier affiliate habits`;
  return {
    id: `affiliate-${team.id}-${player.id}-${Date.now()}-${Math.round(progress)}`,
    date: new Date().toISOString().slice(0, 10),
    playerId: player.id,
    headline,
    body:
      progress >= 75
        ? `${team.affiliate?.fullName ?? "Affiliate"} staff believe the ${player.position} is close to major-club help.`
        : progress >= 55
          ? "The development staff likes the workload and role clarity."
          : "The report asks for patience before considering a promotion.",
    progress: Math.round(progress),
    severity: progress >= 78 ? "medium" : "low"
  };
}

export function getAffiliateDevelopmentScore(player: Player, staffModifiers: StaffModifiers): number {
  const upside = Math.max(0, player.potential - player.overall);
  const age = player.age <= 21 ? 18 : player.age <= 24 ? 12 : player.age <= 28 ? 5 : -5;
  const goalieDrag = player.position === "G" ? -5 + staffModifiers.goalieDevelopment * 3 : 0;
  const morale = (player.morale - 50) * 0.12;
  const fatigue = player.fatigue > 72 ? -8 : player.fatigue < 35 ? 4 : 0;
  return Math.round(clamp(42 + upside * 2 + age + morale + fatigue + staffModifiers.development * 4 + goalieDrag, 5, 95));
}

export function getAffiliatePromotionCandidates(team: Team): Player[] {
  return team.roster
    .filter((player) => getPlayerRosterStatus(player) === "affiliate" && player.injuryStatus === "healthy")
    .sort((a, b) => promotionScore(b) - promotionScore(a))
    .filter((player) => promotionScore(player) >= 72)
    .slice(0, 6);
}

export function getAffiliateRiskNotes(team: Team): string[] {
  const affiliate = team.roster.filter((player) => getPlayerRosterStatus(player) === "affiliate");
  const goalies = affiliate.filter((player) => player.position === "G").length;
  const notes: string[] = [];
  if (!affiliate.length) notes.push(`${team.affiliate?.fullName ?? "Affiliate"} has no assigned depth players.`);
  if (goalies === 0) notes.push("No affiliate goalie depth is available for emergencies.");
  const unhappy = affiliate.filter((player) => player.morale < 40);
  if (unhappy.length) notes.push(`${unhappy.length} affiliate player${unhappy.length === 1 ? "" : "s"} need morale attention.`);
  return notes;
}

export function autoPromoteAffiliatePlayerIfNeeded(team: Team): Team {
  const report = validateRosterForGame(team);
  if (!report.errors.length) return team;
  const candidates = getAffiliatePromotionCandidates(team);
  const neededGoalie = report.healthyGoalieCount < 2;
  const target =
    (neededGoalie ? candidates.find((player) => player.position === "G") : undefined) ??
    candidates.find((player) => report.healthyDefenseCount < 6 && (player.position === "LD" || player.position === "RD")) ??
    candidates.find((player) => report.healthyForwardCount < 12 && ["LW", "C", "RW"].includes(player.position));
  if (!target) return team;
  return {
    ...team,
    roster: team.roster.map((player) => (player.id === target.id ? { ...player, rosterStatus: "active" as const } : player))
  };
}

export function createAffiliateNews(report: AffiliateReport, team?: Team): NewsItem[] {
  return [
    {
      id: `affiliate-news-${report.id}`,
      type: "affiliate",
      date: report.date,
      headline: `Affiliate Report: ${report.headline}`,
      body: report.body,
      severity: report.severity,
      teamId: team?.id,
      playerId: report.playerId
    }
  ];
}

function promotionScore(player: Player): number {
  return player.overall + Math.max(0, player.potential - player.overall) * 0.75 + (player.developmentPath?.confidence ?? 50) * 0.08 - player.fatigue * 0.08;
}
