import { useEffect, useState } from "react";
import { getCurrentTutorialStep, getTutorialCompletionMessage, getTutorialSteps } from "../../game/systems/tutorial";
import type { RoomId } from "../../game/types";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { ProgressBar } from "../ui/ProgressBar";

export function TutorialOverlay() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const completeTutorialStep = useFranchiseStore((state) => state.completeTutorialStep);
  const dismissTutorialStep = useFranchiseStore((state) => state.dismissTutorialStep);
  const skipTutorial = useFranchiseStore((state) => state.skipTutorial);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const operationsMapOpen = useUiStore((state) => state.operationsMapOpen);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const setOperationsMapOpen = useUiStore((state) => state.setOperationsMapOpen);
  const [expandedFromDock, setExpandedFromDock] = useState(false);
  const dockTutorial = Boolean(activeRoom || operationsMapOpen);

  useEffect(() => {
    if (!dockTutorial) setExpandedFromDock(false);
  }, [dockTutorial]);

  if (!franchise?.tutorialState.active) return null;
  const steps = getTutorialSteps(franchise);
  const step = getCurrentTutorialStep(franchise);
  if (!step) return null;
  const completed = steps.filter((item) => item.completed).length;
  const stepRoomId = step.roomId;
  const isOpeningStep = step.id === "move-facility";
  const title = isOpeningStep ? "Start in the GM Office" : step.title;
  const body = isOpeningStep
    ? "Begin with the command center. The GM Computer keeps most desk work in one place, then sends you out only for roster, lines, the game, and a save."
    : step.body;

  function openStepRoom(roomId: RoomId) {
    setOperationsMapOpen(false);
    setActiveRoom(roomId);
    setExpandedFromDock(false);
  }

  if (dockTutorial && !expandedFromDock) {
    const dockClassName = operationsMapOpen && !activeRoom
      ? "tutorial-overlay tutorial-overlay--docked tutorial-overlay--map-docked"
      : "tutorial-overlay tutorial-overlay--docked";
    return (
      <aside className={dockClassName} aria-label="Guided tutorial" aria-live="polite">
        <div className="tutorial-overlay__dock-copy">
          <small>Guided Start</small>
          <strong>{completed}/{steps.length}</strong>
          <span>{title}</span>
        </div>
        <div className="button-row tutorial-overlay__dock-actions">
          <button type="button" onClick={() => setExpandedFromDock(true)}>
            Show
          </button>
          <button type="button" onClick={() => completeTutorialStep(step.id)}>
            Done
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="tutorial-overlay" aria-label="Guided tutorial">
      <small>Guided Start</small>
      <h3>{title}</h3>
      <p>{body}</p>
      {isOpeningStep && (
        <ol className="tutorial-route" aria-label="First day route">
          <li>GM Office</li>
          <li>Roster Office</li>
          <li>Coach's Office</li>
          <li>Arena Bowl</li>
          <li>Save Desk</li>
        </ol>
      )}
      <p className="muted">{getTutorialCompletionMessage(franchise)}</p>
      <ProgressBar value={completed} max={steps.length} label={`${completed}/${steps.length} steps`} />
      <div className="button-row">
        {isOpeningStep && (
          <button
            type="button"
            onClick={() => {
              completeTutorialStep(step.id);
              openStepRoom("gm");
            }}
          >
            Open GM Office
          </button>
        )}
        {stepRoomId && (
          <button type="button" onClick={() => openStepRoom(stepRoomId)}>
            Open room
          </button>
        )}
        {!isOpeningStep && (
          <button type="button" onClick={() => completeTutorialStep(step.id)}>
            Mark done
          </button>
        )}
        {isOpeningStep && (
          <button type="button" onClick={() => completeTutorialStep(step.id)}>
            Walk first
          </button>
        )}
        <button type="button" onClick={() => setOperationsMapOpen(true)}>
          Map
        </button>
        <button type="button" onClick={() => dismissTutorialStep(step.id)}>
          Dismiss
        </button>
        {dockTutorial && (
          <button type="button" onClick={() => setExpandedFromDock(false)}>
            Dock
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Skip the guided start? Help, Guide, and the first-hour checklist will stay available.")) skipTutorial();
          }}
        >
          Skip tutorial
        </button>
      </div>
    </aside>
  );
}
