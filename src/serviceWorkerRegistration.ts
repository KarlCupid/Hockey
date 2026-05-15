import { registerServiceWorker } from "./game/systems/pwa";

export function registerFranchiseIceServiceWorker() {
  if (!import.meta.env.PROD) return;
  void registerServiceWorker({ enabled: true });
}
