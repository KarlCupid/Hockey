import { SCHEMA_VERSION } from "../constants";

export type ReleaseChannel = "local" | "beta" | "dev";

export const APP_VERSION = "0.1.0";
export const BUILD_PHASE = "Phase 13 Facility Masterplan";
export const SAVE_SCHEMA_VERSION = SCHEMA_VERSION;
export const BUILD_DATE = "2026-05-16";
export const RELEASE_CHANNEL: ReleaseChannel = "beta";

export interface VersionSummary {
  appVersion: string;
  buildPhase: string;
  saveSchemaVersion: number;
  buildDate: string;
  releaseChannel: ReleaseChannel;
  releaseLabel: string;
}

export interface CompatibilitySummary {
  desktopBrowsers: string[];
  requiredCapabilities: string[];
  storage: string;
  pwa: string;
  offline: string;
  limitations: string[];
}

export function getReleaseLabel(): string {
  return `Franchise Ice v${APP_VERSION} | ${BUILD_PHASE} | schema v${SAVE_SCHEMA_VERSION} | ${RELEASE_CHANNEL}`;
}

export function getVersionSummary(): VersionSummary {
  return {
    appVersion: APP_VERSION,
    buildPhase: BUILD_PHASE,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
    buildDate: BUILD_DATE,
    releaseChannel: RELEASE_CHANNEL,
    releaseLabel: getReleaseLabel()
  };
}

export function getCompatibilitySummary(): CompatibilitySummary {
  return {
    desktopBrowsers: ["Chrome/Edge 120+", "Firefox 120+", "Safari 17+"],
    requiredCapabilities: ["WebGL", "IndexedDB/localForage", "ES2020 modules"],
    storage: "Local IndexedDB saves, snapshots, data packs, settings, diagnostics, and closed-beta feedback only.",
    pwa: "Install-friendly manifest with first-party icons and static app metadata.",
    offline: "Static app shell is offline-friendly when the service worker is available; saves are never cached by the service worker.",
    limitations: [
      "Desktop browser recommended.",
      "Closed-beta feedback and telemetry are local/export-only.",
      "Web Audio cues are generated locally and can no-op when blocked.",
      "The Three/R3F bundle remains the largest known production chunk."
    ]
  };
}
