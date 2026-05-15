import type { RoomId } from "../../game/types";
import { getContextualHint } from "../../game/systems/tutorial";
import { useFranchiseStore } from "../../store/franchiseStore";

export function ContextualHint({ roomId }: { roomId?: RoomId }) {
  const franchise = useFranchiseStore((state) => state.franchise);
  if (!franchise || !roomId) return null;
  const hint = getContextualHint(franchise, roomId);
  if (!hint) return null;
  return (
    <aside className="contextual-hint" aria-live="polite">
      <strong>Hint</strong>
      <span>{hint}</span>
    </aside>
  );
}
