import { useEffect } from "react";
import { SAVE_SLOT_COUNT } from "../../game/constants";
import { useFranchiseStore } from "../../store/franchiseStore";

export function SaveLoadPanel() {
  const { saves, refreshSaves, saveToSlot, loadFromSlot, deleteSlot, loadError } = useFranchiseStore();

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  const slots = Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => `slot-${index + 1}`);
  return (
    <div className="room-grid room-grid--two">
      <section className="panel-section">
        <h3>Manual Saves</h3>
        <p className="muted">Three local slots are stored in IndexedDB. Autosave updates after completed games.</p>
        {slots.map((slotId) => {
          const metadata = saves.find((save) => save.slotId === slotId);
          return (
            <article className="save-row" key={slotId}>
              <div>
                <strong>{metadata?.label ?? `Slot ${slotId.replace("slot-", "")}`}</strong>
                <span>
                  {metadata
                    ? `${metadata.teamName} | ${metadata.record} | Game ${metadata.gameNumber} | ${new Date(metadata.lastSaved).toLocaleString()}`
                    : "Empty slot"}
                </span>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void saveToSlot(slotId)}>
                  Save
                </button>
                <button type="button" disabled={!metadata} onClick={() => void loadFromSlot(slotId)}>
                  Load
                </button>
                <button type="button" disabled={!metadata} onClick={() => void deleteSlot(slotId)}>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </section>
      <section className="panel-section">
        <h3>Autosave</h3>
        {saves
          .filter((save) => save.slotId === "autosave")
          .map((save) => (
            <article className="save-row" key={save.slotId}>
              <div>
                <strong>{save.teamName}</strong>
                <span>
                  {save.record} | {save.currentDate} | {new Date(save.lastSaved).toLocaleString()}
                </span>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void loadFromSlot(save.slotId)}>
                  Continue
                </button>
                <button type="button" onClick={() => void deleteSlot(save.slotId)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        {!saves.some((save) => save.slotId === "autosave") && <p className="empty-state">No autosave yet. Complete a game to create one.</p>}
        {loadError && <p className="error-text">{loadError}</p>}
      </section>
    </div>
  );
}
