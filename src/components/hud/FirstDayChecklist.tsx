import { useMemo } from "react";
import { useUiStore, type FirstDayChecklistId } from "../../store/uiStore";

const ITEMS: Array<{ id: FirstDayChecklistId; label: string }> = [
  { id: "visitGm", label: "Visit GM Office" },
  { id: "readInbox", label: "Read the inbox" },
  { id: "visitLocker", label: "Visit Locker Room" },
  { id: "openPlayerCard", label: "Open a player card" },
  { id: "visitCoach", label: "Visit Coach's Office" },
  { id: "editLineup", label: "Auto-fill or edit lineup" },
  { id: "adjustTactic", label: "Adjust at least one tactic" },
  { id: "visitArena", label: "Visit Arena Bowl" },
  { id: "simulateGame", label: "Simulate first game" },
  { id: "reviewResult", label: "Review result" },
  { id: "checkStandings", label: "Check standings" },
  { id: "saveFranchise", label: "Save franchise" }
];

export function FirstDayChecklist() {
  const completed = useUiStore((state) => state.checklistCompleted);
  const collapsed = useUiStore((state) => state.checklistCollapsed);
  const dismissed = useUiStore((state) => state.checklistDismissed);
  const setCollapsed = useUiStore((state) => state.setChecklistCollapsed);
  const dismiss = useUiStore((state) => state.dismissChecklist);
  const count = useMemo(() => ITEMS.filter((item) => completed[item.id]).length, [completed]);

  if (dismissed || count === ITEMS.length) return null;

  return (
    <aside className={collapsed ? "first-day first-day--collapsed" : "first-day"}>
      <header>
        <div>
          <small>First Day</small>
          <strong>GM / Head Coach</strong>
        </div>
        <span>{count}/{ITEMS.length}</span>
      </header>
      {!collapsed && (
        <>
          <ol>
            {ITEMS.map((item) => (
              <li className={completed[item.id] ? "is-complete" : ""} key={item.id}>
                <span aria-hidden="true">{completed[item.id] ? "✓" : ""}</span>
                {item.label}
              </li>
            ))}
          </ol>
          <p>Walk the facility, make the first decisions, then see what the room gives back.</p>
        </>
      )}
      <div className="first-day__actions">
        <button type="button" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? "Open" : "Collapse"}
        </button>
        <button type="button" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
