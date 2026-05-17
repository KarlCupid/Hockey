import type { RoomId } from "../types";
import type { AppSettings } from "../../store/settingsStore";

export interface KeyboardShortcut {
  key: string;
  label: string;
  action: string;
  roomId?: RoomId;
}

export function getKeyboardShortcuts(): KeyboardShortcut[] {
  return [
    { key: "H", label: "Help", action: "Open help and Learn the Game." },
    { key: "M", label: "Map", action: "Toggle operations map." },
    { key: "Esc", label: "Close", action: "Close the active panel or overlay." },
    { key: "G", label: "GM Computer", action: "Open GM Computer.", roomId: "gm" },
    { key: "R", label: "Roster Office", action: "Open Roster Office.", roomId: "roster" },
    { key: "C", label: "Coach Office", action: "Open Coach's Office.", roomId: "coach" },
    { key: "A", label: "Arena", action: "Open Arena Bowl.", roomId: "arena" },
    { key: "S", label: "Save Desk", action: "Open Save Desk.", roomId: "saves" }
  ];
}

export function getAccessibilitySettingsSummary(settings: AppSettings): string[] {
  return [
    settings.reduceMotion ? "Reduced motion is on." : "Reduced motion is off.",
    settings.reduceFlashes ? "Goal and warning flashes are softened." : "Goal and warning flashes are available.",
    settings.highContrastMode ? "High contrast mode is on." : "Standard contrast mode is on.",
    settings.largerText ? "Larger text mode is on." : "Standard text size is on.",
    settings.keyboardHints ? "Keyboard hints are visible." : "Keyboard hints are hidden.",
    settings.showTooltips ? "Tooltips are enabled." : "Tooltips are hidden."
  ];
}

export function shouldReduceMotion(settings: Pick<AppSettings, "reduceMotion">): boolean {
  return Boolean(settings.reduceMotion);
}

export function shouldReduceFlashes(settings: Pick<AppSettings, "reduceMotion" | "reduceFlashes">): boolean {
  return Boolean(settings.reduceMotion || settings.reduceFlashes);
}

export function getUiScaleClass(settings: Pick<AppSettings, "uiScale" | "largerText">): string {
  if (settings.largerText) return "app-shell--scale-spacious app-shell--larger-text";
  return `app-shell--scale-${settings.uiScale}`;
}

export function getContrastClass(settings: Pick<AppSettings, "highContrastMode">): string {
  return settings.highContrastMode ? "app-shell--high-contrast" : "app-shell--standard-contrast";
}

export function shortcutRoomForKey(key: string): RoomId | undefined {
  return getKeyboardShortcuts().find((shortcut) => shortcut.key.toLowerCase() === key.toLowerCase())?.roomId;
}
