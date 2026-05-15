import { create } from "zustand";
import { GeneratedAudioEngine } from "../game/audio/audioEngine";
import { useSettingsStore } from "./settingsStore";

interface AudioStore {
  engine: GeneratedAudioEngine;
  unlocked: boolean;
  unlock: () => Promise<boolean>;
  playCue: (cueId: string) => boolean;
  stopAudio: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  engine: new GeneratedAudioEngine(),
  unlocked: false,
  unlock: async () => {
    const ok = await get().engine.resume();
    set({ unlocked: ok });
    return ok;
  },
  playCue: (cueId) => {
    const settings = useSettingsStore.getState().settings;
    return get().engine.playCue(cueId, {
      audioEnabled: settings.audioEnabled,
      masterVolume: settings.masterVolume,
      uiVolume: settings.uiVolume,
      ambienceVolume: settings.ambienceVolume,
      broadcastVolume: settings.broadcastVolume,
      reduceFlashes: settings.reduceFlashes || settings.reduceMotion
    });
  },
  stopAudio: () => {
    get().engine.stop();
    set({ unlocked: false });
  }
}));
