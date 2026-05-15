import { getCurrentTutorialStep, getTutorialSteps } from "../../game/systems/tutorial";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { ProgressBar } from "../ui/ProgressBar";

export function TutorialOverlay() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const completeTutorialStep = useFranchiseStore((state) => state.completeTutorialStep);
  const dismissTutorialStep = useFranchiseStore((state) => state.dismissTutorialStep);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  if (!franchise?.tutorialState.active) return null;
  const steps = getTutorialSteps(franchise);
  const step = getCurrentTutorialStep(franchise);
  if (!step) return null;
  const completed = steps.filter((item) => item.completed).length;
  return (
    <aside className="tutorial-overlay" aria-label="Guided tutorial">
      <small>Guided Start</small>
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      <ProgressBar value={completed} max={steps.length} label={`${completed}/${steps.length} steps`} />
      <div className="button-row">
        {step.roomId && (
          <button type="button" onClick={() => setActiveRoom(step.roomId)}>
            Open room
          </button>
        )}
        <button type="button" onClick={() => completeTutorialStep(step.id)}>
          Mark done
        </button>
        <button type="button" onClick={() => dismissTutorialStep(step.id)}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
