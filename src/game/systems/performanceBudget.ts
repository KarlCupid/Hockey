export type BundleBudgetCategory = "appShell" | "roomPanel" | "threeR3f" | "editor" | "devTools" | "unknown";

export interface BundleBudgetDefinition {
  category: BundleBudgetCategory;
  warningKb: number;
  errorKb: number;
  knownException?: boolean;
  note: string;
}

export interface BundleBudgetChunk {
  name: string;
  file: string;
  sizeKb: number;
  category: BundleBudgetCategory;
  status: "ok" | "warning" | "error" | "knownException";
  note?: string;
}

export interface PerformanceBudgetReport {
  generatedAt: string;
  chunks: BundleBudgetChunk[];
  totalJsKb: number;
  totalStatus: "ok" | "warning" | "error";
  warnings: string[];
  knownExceptions: string[];
}

export interface RuntimePerformanceSettingsSummary {
  lowSpecRecommended: boolean;
  activePerformanceFlags: string[];
  recommendedLowSpecSettings: string[];
  notes: string[];
}

export const BUNDLE_BUDGETS: Record<BundleBudgetCategory, BundleBudgetDefinition> = {
  appShell: {
    category: "appShell",
    warningKb: 220,
    errorKb: 360,
    note: "React app shell, store wiring, and shared UI should stay quick to parse."
  },
  roomPanel: {
    category: "roomPanel",
    warningKb: 180,
    errorKb: 300,
    note: "Lazy room panels should remain below the core shell where possible."
  },
  threeR3f: {
    category: "threeR3f",
    warningKb: 500,
    errorKb: 1200,
    knownException: true,
    note: "Known exception: Three.js, React Three Fiber, and Drei are isolated so the large 3D dependency chunk is explicit."
  },
  editor: {
    category: "editor",
    warningKb: 220,
    errorKb: 340,
    note: "Custom League Lab and editor helpers are beta tools and should stay split from routine play."
  },
  devTools: {
    category: "devTools",
    warningKb: 220,
    errorKb: 360,
    note: "Developer-only reports and dry-run harnesses should stay isolated from player-first chunks."
  },
  unknown: {
    category: "unknown",
    warningKb: 250,
    errorKb: 420,
    note: "Unclassified chunks should be reviewed if they grow."
  }
};

export const TOTAL_JS_WARNING_KB = 1800;
export const TOTAL_JS_ERROR_KB = 2600;

export function categorizeChunk(fileOrName: string): BundleBudgetCategory {
  const value = fileOrName.toLowerCase();
  if (value.includes("three-r3f") || value.includes("three") || value.includes("fiber")) return "threeR3f";
  if (value.includes("datapack") || value.includes("editor") || value.includes("custom")) return "editor";
  if (value.includes("devtools") || value.includes("dev-tools") || value.includes("qa-report")) return "devTools";
  if (value.includes("panel") || value.includes("room")) return "roomPanel";
  if (value.includes("index") || value.includes("react-vendor") || value.includes("state-storage")) return "appShell";
  return "unknown";
}

export function isKnownBundleException(fileOrName: string): boolean {
  return categorizeChunk(fileOrName) === "threeR3f";
}

export function checkBundleBudgetFromManifest(manifest: unknown): PerformanceBudgetReport {
  const chunks = extractManifestChunks(manifest);
  const totalJsKb = Number(chunks.reduce((sum, chunk) => sum + chunk.sizeKb, 0).toFixed(2));
  const totalStatus = totalJsKb >= TOTAL_JS_ERROR_KB ? "error" : totalJsKb >= TOTAL_JS_WARNING_KB ? "warning" : "ok";
  const warnings = chunks
    .filter((chunk) => chunk.status === "warning" || chunk.status === "error")
    .map((chunk) => `${chunk.name}: ${chunk.sizeKb} kB exceeds ${BUNDLE_BUDGETS[chunk.category].warningKb} kB target.`);
  const knownExceptions = chunks.filter((chunk) => chunk.status === "knownException").map((chunk) => `${chunk.name}: ${chunk.note ?? BUNDLE_BUDGETS[chunk.category].note}`);
  if (totalStatus !== "ok") warnings.push(`Total JS ${totalJsKb} kB exceeds ${TOTAL_JS_WARNING_KB} kB warning threshold.`);
  return {
    generatedAt: new Date().toISOString(),
    chunks,
    totalJsKb,
    totalStatus,
    warnings,
    knownExceptions
  };
}

export function summarizeRuntimePerformanceSettings(settings: {
  reduced3DDetail?: boolean;
  reduceMotion?: boolean;
  reduceFlashes?: boolean;
  broadcastSpeedDefault?: string;
  highContrastMode?: boolean;
  largerText?: boolean;
  tableDensity?: string;
}): RuntimePerformanceSettingsSummary {
  const activePerformanceFlags = [
    settings.reduced3DDetail ? "Reduced 3D detail" : undefined,
    settings.reduceMotion ? "Reduced motion" : undefined,
    settings.reduceFlashes ? "Reduced flashes" : undefined,
    settings.broadcastSpeedDefault === "fast" ? "Fast broadcast playback" : undefined,
    settings.tableDensity === "compact" ? "Compact table density" : undefined
  ].filter(Boolean) as string[];
  const lowSpecRecommended = !settings.reduced3DDetail || !settings.reduceMotion || !settings.reduceFlashes || settings.tableDensity !== "compact";
  return {
    lowSpecRecommended,
    activePerformanceFlags,
    recommendedLowSpecSettings: [
      "Reduced 3D detail",
      "Reduced motion",
      "Reduced flashes",
      "Compact table density",
      "Disable ambience audio",
      "Fast broadcast default"
    ],
    notes: [
      settings.highContrastMode || settings.largerText ? "Accessibility display flags are enabled; these improve readability but are not primary performance levers." : "Accessibility flags can be combined with low-spec mode safely.",
      lowSpecRecommended ? "Low-spec preset is recommended for older laptops or integrated GPUs." : "Low-spec-friendly settings are already active."
    ]
  };
}

function extractManifestChunks(manifest: unknown): BundleBudgetChunk[] {
  if (!manifest || typeof manifest !== "object") return [];
  return Object.entries(manifest as Record<string, { file?: string; name?: string; size?: number; bytes?: number; isEntry?: boolean }>).flatMap(([name, entry]) => {
    const file = entry.file ?? name;
    if (!file.endsWith(".js")) return [];
    const sizeKb = Number(((entry.size ?? entry.bytes ?? 0) / 1024).toFixed(2));
    const category = categorizeChunk(`${name} ${file} ${entry.name ?? ""}`);
    const budget = BUNDLE_BUDGETS[category];
    const status =
      budget.knownException && sizeKb >= budget.warningKb
        ? "knownException"
        : sizeKb >= budget.errorKb
          ? "error"
          : sizeKb >= budget.warningKb
            ? "warning"
            : "ok";
    return [{ name: entry.name ?? name, file, sizeKb, category, status, note: budget.note }];
  });
}
