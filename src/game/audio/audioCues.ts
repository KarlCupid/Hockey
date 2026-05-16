import type { AudioCue } from "../types";

export const AUDIO_CUES: AudioCue[] = [
  cue("ui-click", "ui", 0.28, true, "Soft UI click", "A shorter generated tap for buttons and switches."),
  cue("ui-hover", "ui", 0.14, true, "Subtle hover tick", "A low generated hover tick for menus."),
  cue("notification-chime", "notification", 0.38, true, "Notification chime", "A quick local chime for new guidance."),
  cue("warning-pulse", "warning", 0.36, true, "Warning tone", "A restrained two-note pulse for blocked actions."),
  cue("achievement-unlock", "achievement", 0.52, true, "Achievement swell", "A small generated swell for milestones."),
  cue("draft-pick-chime", "draftPick", 0.46, true, "Draft pick chime", "A bright local chime for draft selections."),
  cue("trade-phone-ring", "trade", 0.4, true, "Trade phone ring", "A short generated office phone ring."),
  cue("goal-horn", "goal", 0.64, false, "Team goal horn", "A generated horn with deterministic team variants."),
  cue("final-horn", "finalHorn", 0.56, false, "Final horn", "A generated horn for completed games."),
  cue("broadcast-whoosh", "broadcast", 0.34, true, "Broadcast whoosh", "A short transition cue for broadcast pacing."),
  cue("room-ambience-hum", "roomAmbience", 0.18, true, "Facility ambience", "A low generated room bed."),
  cue("arena-crowd-bed", "roomAmbience", 0.2, true, "Arena crowd bed", "A local noise bed for arena moments."),
  cue("press-camera-click", "notification", 0.26, true, "Press camera click", "A brief camera click for media rooms."),
  cue("owner-alert", "notification", 0.34, true, "Owner suite alert", "A softer executive alert cue."),
  cue("agent-phone-ring", "notification", 0.36, true, "Agent phone ring", "A quick generated phone cue for agent calls."),
  cue("save-success", "notification", 0.3, true, "Save success", "A local save confirmation chime."),
  cue("error-warning", "warning", 0.4, true, "Error warning", "A clear generated error tone.")
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

export function getAudioCuePreviewItems(): Array<{ id: string; label: string; type: AudioCue["type"] }> {
  return AUDIO_CUES.map((cueItem) => ({ id: cueItem.id, label: cueItem.previewLabel, type: cueItem.type }));
}

export function getAudioCuePreviewLabel(id: string): string | undefined {
  return getAudioCue(id)?.previewLabel;
}

export function getTeamGoalHornVariant(teamId: string): { cueId: "goal-horn"; variant: number; detune: number; label: string } {
  const hash = [...teamId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variant = hash % 4;
  return {
    cueId: "goal-horn",
    variant,
    detune: [-80, -30, 30, 75][variant],
    label: `Team goal horn ${variant + 1}`
  };
}

function cue(id: string, type: AudioCue["type"], volume: number, reducedMotionSafe: boolean, previewLabel: string, description: string): AudioCue {
  return {
    id,
    previewLabel,
    description,
    type,
    enabled: true,
    volume,
    reducedMotionSafe
  };
}
