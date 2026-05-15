export interface PwaMetadata {
  name: string;
  shortName: string;
  display: "standalone";
  startUrl: string;
  themeColor: string;
  backgroundColor: string;
  manifestPath: string;
  serviceWorkerPath: string;
  installNotes: string[];
}

export interface ServiceWorkerRegistrationResult {
  supported: boolean;
  registered: boolean;
  scope?: string;
  reason?: string;
}

export function getPwaMetadata(): PwaMetadata {
  return {
    name: "Franchise Ice",
    shortName: "Franchise Ice",
    display: "standalone",
    startUrl: ".",
    themeColor: "#07111f",
    backgroundColor: "#040914",
    manifestPath: "/manifest.webmanifest",
    serviceWorkerPath: "/sw.js",
    installNotes: [
      "Use the browser install action when available.",
      "Saves, snapshots, diagnostics, and data packs remain local IndexedDB data.",
      "The service worker caches only static app-shell assets and never user save data."
    ]
  };
}

export function canUseServiceWorker(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerServiceWorker(options: { enabled?: boolean; path?: string } = {}): Promise<ServiceWorkerRegistrationResult> {
  if (options.enabled === false) {
    return { supported: canUseServiceWorker(), registered: false, reason: "disabled" };
  }
  if (!canUseServiceWorker()) {
    return { supported: false, registered: false, reason: "service-worker-unavailable" };
  }
  try {
    const registration = await navigator.serviceWorker.register(options.path ?? getPwaMetadata().serviceWorkerPath);
    return { supported: true, registered: true, scope: registration.scope };
  } catch (error) {
    return {
      supported: true,
      registered: false,
      reason: error instanceof Error ? error.message : "registration-failed"
    };
  }
}

export function getInstallGuideText(): string {
  return [
    "Franchise Ice can be installed from supported desktop browsers using the address-bar install action or browser app menu.",
    "The beta build is local-only: no account, cloud save, backend sync, or network telemetry.",
    "For reliable playtests, use a modern desktop browser with WebGL and IndexedDB enabled."
  ].join(" ");
}
