import type { ReactNode } from "react";

export function SplitPane({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return (
    <div className="ui-split-pane">
      <div>{primary}</div>
      <aside>{secondary}</aside>
    </div>
  );
}
