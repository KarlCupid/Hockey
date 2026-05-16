export type UiStatusTone = "neutral" | "info" | "success" | "warning" | "danger";
export type UiButtonHierarchy = "primary" | "secondary" | "danger" | "ghost";

export function getStatusToneClass(tone: UiStatusTone): string {
  return `ui-status ui-status--${tone}`;
}

export function getSeverityTone(severity: "low" | "medium" | "high" | "critical"): UiStatusTone {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "info";
  return "neutral";
}

export function getButtonHierarchyClass(hierarchy: UiButtonHierarchy): string {
  return `ui-button ui-button--${hierarchy}`;
}

export function isValidStatusClass(className: string): boolean {
  return /^ui-(status|button) ui-\1--[a-z]+$/.test(className);
}
