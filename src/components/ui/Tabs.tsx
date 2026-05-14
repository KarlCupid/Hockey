export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: TabItem<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button className={active === tab.id ? "is-active" : ""} key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
