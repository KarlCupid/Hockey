export function FilterBar<T extends string>({ items, active, onChange }: { items: readonly T[]; active: T; onChange: (item: T) => void }) {
  return (
    <div className="filter-bar" aria-label="Filter options">
      {items.map((item) => (
        <button className={active === item ? "is-active" : ""} key={item} type="button" onClick={() => onChange(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}
