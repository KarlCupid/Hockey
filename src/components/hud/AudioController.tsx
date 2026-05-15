import { useEffect } from "react";
import { useAudioStore } from "../../store/audioStore";
import { useSettingsStore } from "../../store/settingsStore";

export function AudioController() {
  const audioEnabled = useSettingsStore((state) => state.settings.audioEnabled);
  const unlock = useAudioStore((state) => state.unlock);
  const playCue = useAudioStore((state) => state.playCue);
  const stopAudio = useAudioStore((state) => state.stopAudio);

  useEffect(() => {
    if (!audioEnabled) {
      stopAudio();
      return;
    }
    const onFirstGesture = () => {
      void unlock();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, [audioEnabled, stopAudio, unlock]);

  useEffect(() => {
    if (!audioEnabled) return;
    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button")) playCue("ui-click");
    };
    const onHover = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button")) playCue("ui-hover");
    };
    window.addEventListener("click", onClick);
    window.addEventListener("pointerover", onHover);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("pointerover", onHover);
    };
  }, [audioEnabled, playCue]);

  return null;
}
