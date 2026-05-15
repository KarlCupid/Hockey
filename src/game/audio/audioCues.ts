import type { AudioCue } from "../types";

export const AUDIO_CUES: AudioCue[] = [
  cue("ui-click", "ui", 0.35, true),
  cue("ui-hover", "ui", 0.18, true),
  cue("notification-chime", "notification", 0.45, true),
  cue("warning-pulse", "warning", 0.42, true),
  cue("achievement-unlock", "achievement", 0.55, true),
  cue("draft-pick-chime", "draftPick", 0.5, true),
  cue("trade-phone-ring", "trade", 0.45, true),
  cue("goal-horn", "goal", 0.7, false),
  cue("final-horn", "finalHorn", 0.62, false),
  cue("broadcast-whoosh", "broadcast", 0.38, true),
  cue("room-ambience-hum", "roomAmbience", 0.22, true),
  cue("arena-crowd-bed", "roomAmbience", 0.24, true),
  cue("press-camera-click", "notification", 0.32, true),
  cue("owner-alert", "notification", 0.42, true),
  cue("agent-phone-ring", "notification", 0.4, true),
  cue("save-success", "notification", 0.35, true),
  cue("error-warning", "warning", 0.45, true)
];

export function getAudioCue(id: string): AudioCue | undefined {
  return AUDIO_CUES.find((cueItem) => cueItem.id === id);
}

export function requiredAudioCueIds(): string[] {
  return [
    "ui-click",
    "ui-hover",
    "notification-chime",
    "warning-pulse",
    "achievement-unlock",
    "draft-pick-chime",
    "trade-phone-ring",
    "goal-horn",
    "final-horn",
    "broadcast-whoosh"
  ];
}

function cue(id: string, type: AudioCue["type"], volume: number, reducedMotionSafe: boolean): AudioCue {
  return {
    id,
    type,
    enabled: true,
    volume,
    reducedMotionSafe
  };
}
