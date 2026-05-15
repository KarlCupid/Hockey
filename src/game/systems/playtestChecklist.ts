import { PLAYTEST_CHECKLISTS, type PlaytestChecklist } from "../content/playtestChecklists";

export interface PlaytestChecklistProgress {
  completedStepIds: string[];
  updatedAt: string;
}

export function getPlaytestChecklists(): PlaytestChecklist[] {
  return PLAYTEST_CHECKLISTS.map((checklist) => ({
    ...checklist,
    steps: checklist.steps.map((step) => ({ ...step }))
  }));
}

export function validatePlaytestChecklists(checklists = PLAYTEST_CHECKLISTS): string[] {
  const issues: string[] = [];
  const checklistIds = new Set<string>();
  const stepIds = new Set<string>();
  checklists.forEach((checklist) => {
    if (!checklist.id || checklistIds.has(checklist.id)) issues.push(`Invalid or duplicate checklist id: ${checklist.id}`);
    checklistIds.add(checklist.id);
    if (!checklist.title || !checklist.description) issues.push(`${checklist.id} is missing title or description.`);
    if (!checklist.steps.length) issues.push(`${checklist.id} has no steps.`);
    checklist.steps.forEach((step) => {
      if (!step.id || stepIds.has(step.id)) issues.push(`Invalid or duplicate checklist step id: ${step.id}`);
      stepIds.add(step.id);
      if (!step.label || !step.expectedResult) issues.push(`${checklist.id}/${step.id} is missing label or expected result.`);
    });
  });
  return issues;
}

export function createPlaytestChecklistProgress(completedStepIds: string[] = []): PlaytestChecklistProgress {
  return {
    completedStepIds: Array.from(new Set(completedStepIds)),
    updatedAt: new Date().toISOString()
  };
}

export function markPlaytestChecklistStep(progress: PlaytestChecklistProgress, stepId: string, completed = true): PlaytestChecklistProgress {
  const ids = new Set(progress.completedStepIds);
  if (completed) ids.add(stepId);
  else ids.delete(stepId);
  return {
    completedStepIds: Array.from(ids),
    updatedAt: new Date().toISOString()
  };
}

export function summarizePlaytestChecklistProgress(progress: PlaytestChecklistProgress, checklists = PLAYTEST_CHECKLISTS): string {
  const total = checklists.reduce((sum, checklist) => sum + checklist.steps.length, 0);
  const completed = progress.completedStepIds.filter((id) => checklists.some((checklist) => checklist.steps.some((step) => step.id === id))).length;
  return `${completed}/${total} beta checklist steps complete`;
}

export function serializePlaytestChecklistProgress(progress: PlaytestChecklistProgress): string {
  return JSON.stringify(progress);
}

export function parsePlaytestChecklistProgress(raw: string | undefined | null): PlaytestChecklistProgress {
  if (!raw) return createPlaytestChecklistProgress();
  try {
    const parsed = JSON.parse(raw) as Partial<PlaytestChecklistProgress>;
    return createPlaytestChecklistProgress(Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds.map(String) : []);
  } catch {
    return createPlaytestChecklistProgress();
  }
}
