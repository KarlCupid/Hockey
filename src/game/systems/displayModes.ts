export type DisplayMode = "desktop" | "desktopCompact" | "desktopRecommended";

export interface DisplayModeRecommendation {
  mode: DisplayMode;
  supported: boolean;
  compact: boolean;
  message: string;
}

export interface LowSpecSettingsPreset {
  reduced3DDetail: true;
  reduceMotion: true;
  reduceFlashes: true;
  tableDensity: "compact";
  ambienceVolume: 0;
  audioEnabled: false;
  broadcastSpeedDefault: "fast";
}

export function getRecommendedDisplayMode(width: number, height: number): DisplayModeRecommendation {
  if (width < 1024 || height < 640) {
    return {
      mode: "desktopRecommended",
      supported: false,
      compact: true,
      message: getDesktopRecommendedMessage(width, height)
    };
  }
  if (width <= 1366 || height <= 768) {
    return {
      mode: "desktopCompact",
      supported: true,
      compact: true,
      message: "Compact desktop mode recommended for this viewport."
    };
  }
  return {
    mode: "desktop",
    supported: true,
    compact: false,
    message: "Desktop viewport supported."
  };
}

export function getLowSpecSettingsPreset(): LowSpecSettingsPreset {
  return {
    reduced3DDetail: true,
    reduceMotion: true,
    reduceFlashes: true,
    tableDensity: "compact",
    ambienceVolume: 0,
    audioEnabled: false,
    broadcastSpeedDefault: "fast"
  };
}

export function getDesktopRecommendedMessage(width: number, height: number): string {
  return `Desktop browser recommended. Current viewport ${Math.round(width)}x${Math.round(height)} is below the comfortable beta target of 1024x640.`;
}
