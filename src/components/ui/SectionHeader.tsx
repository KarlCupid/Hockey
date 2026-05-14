import type { ReactNode } from "react";

export function SectionHeader({ title, eyebrow, actions }: { title: string; eyebrow?: string; actions?: ReactNode }) {
  return (
    <header className="ui-section-header">
      <div>
        {eyebrow && <small>{eyebrow}</small>}
        <h3>{title}</h3>
      </div>
      {actions && <div className="ui-section-header__actions">{actions}</div>}
    </header>
  );
}
