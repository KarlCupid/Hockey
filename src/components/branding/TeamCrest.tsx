import { getTeamBranding } from "../../game/assets/teamBranding";

export function TeamCrest({ teamId, size = 56, title }: { teamId: string; size?: number; title?: string }) {
  const brand = getTeamBranding(teamId);
  const shape = crestShape(brand.logoShape);
  return (
    <svg className="team-crest" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title ?? `${brand.crestInitials} fictional crest`}>
      <defs>
        <linearGradient id={`crest-${teamId}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={brand.primaryColor} />
          <stop offset="100%" stopColor={brand.secondaryColor} />
        </linearGradient>
      </defs>
      <path d="M32 4 L56 15 L52 45 L32 60 L12 45 L8 15 Z" fill={`url(#crest-${teamId})`} stroke={brand.accentColor} strokeWidth="3" />
      <path d={shape} fill="none" stroke={brand.accentColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <text x="32" y="38" textAnchor="middle" fontSize="15" fontWeight="900" fill="#f5fbff">
        {brand.crestInitials}
      </text>
    </svg>
  );
}

function crestShape(shape: string): string {
  const shapes: Record<string, string> = {
    blade: "M18 45 L46 17 M24 48 L50 30",
    storm: "M22 16 L42 16 L32 30 L46 30 L24 50 L31 34 L20 34",
    wolf: "M17 43 L25 17 L32 31 L39 17 L47 43 L34 36 L30 36 Z",
    wing: "M15 40 C25 26 37 20 50 18 C43 30 32 39 15 40 Z",
    ore: "M18 36 L28 18 L45 22 L50 40 L32 50 Z",
    column: "M22 45 L22 19 M32 45 L32 14 M42 45 L42 19",
    peak: "M14 43 L30 18 L36 29 L43 18 L52 43",
    shield: "M18 19 L46 19 L42 43 L32 50 L22 43 Z",
    crown: "M17 39 L20 22 L29 32 L32 20 L36 32 L45 22 L48 39 Z",
    fin: "M18 45 C32 19 42 16 50 17 C42 29 36 42 18 45 Z",
    comet: "M19 42 C30 20 44 14 51 16 M17 45 L41 39",
    coil: "M45 21 C28 10 16 26 29 35 C39 42 44 31 34 28"
  };
  return shapes[shape] ?? shapes.shield;
}
