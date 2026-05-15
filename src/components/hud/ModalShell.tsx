import type { ReactNode } from "react";

export function ModalShell({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <section className="ops-panel" id="active-room-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="ops-panel__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close panel">
            X
          </button>
        </header>
        <div className="ops-panel__body">{children}</div>
      </section>
    </div>
  );
}
