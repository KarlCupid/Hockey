import { getAudioCue } from "./audioCues";

export interface AudioPlaybackSettings {
  audioEnabled: boolean;
  masterVolume: number;
  uiVolume: number;
  ambienceVolume: number;
  broadcastVolume: number;
  reduceFlashes?: boolean;
}

export interface AudioRuntime {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export function clampVolume(value: number | undefined, fallback = 1): number {
  const raw = Number.isFinite(value) ? Number(value) : fallback;
  return Math.max(0, Math.min(1, raw));
}

export class GeneratedAudioEngine {
  private context?: AudioContext;
  private available: boolean;

  constructor(private runtime: AudioRuntime = globalThis as AudioRuntime) {
    this.available = Boolean(runtime.AudioContext ?? runtime.webkitAudioContext);
  }

  isAvailable(): boolean {
    return this.available;
  }

  async resume(): Promise<boolean> {
    const context = this.ensureContext();
    if (!context) return false;
    if (context.state === "suspended") await context.resume().catch(() => undefined);
    return context.state !== "closed";
  }

  playCue(cueId: string, settings: AudioPlaybackSettings): boolean {
    const cue = getAudioCue(cueId);
    if (!cue?.enabled || !settings.audioEnabled) return false;
    if (settings.reduceFlashes && !cue.reducedMotionSafe) return false;
    const context = this.ensureContext();
    if (!context) return false;
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    const volume = cue.volume * volumeForCue(cue.type, settings);
    if (volume <= 0) return false;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationForCue(cueId));
    if (cueId.includes("crowd") || cueId.includes("ambience")) {
      this.playNoise(context, gain, now, durationForCue(cueId));
    } else if (cue.type === "goal" || cue.type === "finalHorn") {
      [196, 247, 294].forEach((freq, index) => this.playTone(context, gain, now + index * 0.08, durationForCue(cueId) - index * 0.05, freq, "sawtooth"));
    } else if (cue.type === "trade" || cueId.includes("phone")) {
      this.playTone(context, gain, now, 0.12, 880, "square");
      this.playTone(context, gain, now + 0.18, 0.12, 660, "square");
    } else if (cue.type === "warning") {
      this.playTone(context, gain, now, 0.18, 220, "triangle");
      this.playTone(context, gain, now + 0.2, 0.18, 180, "triangle");
    } else {
      this.playTone(context, gain, now, durationForCue(cueId), frequencyForCue(cueId), "sine");
    }
    return true;
  }

  stop(): void {
    if (!this.context || this.context.state === "closed") return;
    this.context.close().catch(() => undefined);
    this.context = undefined;
  }

  private ensureContext(): AudioContext | undefined {
    if (!this.available) return undefined;
    if (this.context && this.context.state !== "closed") return this.context;
    const ContextCtor = this.runtime.AudioContext ?? this.runtime.webkitAudioContext;
    if (!ContextCtor) return undefined;
    try {
      this.context = new ContextCtor();
    } catch {
      this.available = false;
      return undefined;
    }
    return this.context;
  }

  private playTone(context: AudioContext, destination: GainNode, start: number, duration: number, frequency: number, type: OscillatorType): void {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + Math.max(0.03, duration));
  }

  private playNoise(context: AudioContext, destination: GainNode, start: number, duration: number): void {
    const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start(start);
    source.stop(start + duration);
  }
}

export function volumeForCue(type: string, settings: AudioPlaybackSettings): number {
  const master = clampVolume(settings.masterVolume);
  if (type === "roomAmbience") return master * clampVolume(settings.ambienceVolume);
  if (type === "goal" || type === "finalHorn" || type === "broadcast") return master * clampVolume(settings.broadcastVolume);
  return master * clampVolume(settings.uiVolume);
}

function frequencyForCue(cueId: string): number {
  if (cueId.includes("achievement")) return 784;
  if (cueId.includes("draft")) return 659;
  if (cueId.includes("save")) return 523;
  if (cueId.includes("hover")) return 440;
  return 587;
}

function durationForCue(cueId: string): number {
  if (cueId === "goal-horn") return 1.1;
  if (cueId === "final-horn") return 0.9;
  if (cueId.includes("ambience") || cueId.includes("crowd")) return 2.2;
  if (cueId.includes("warning")) return 0.5;
  return 0.32;
}
