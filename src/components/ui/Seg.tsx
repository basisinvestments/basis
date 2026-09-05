'use client';

/** Segmented control. Exactly one filled cell — nothing else competes with the CTA. */
export function Seg<T extends string | number>({
  items,
  value,
  onChange,
  format = (v: T) => String(v),
  label,
}: {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  label?: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((it) => (
        <button
          key={String(it)}
          type="button"
          aria-pressed={it === value}
          onClick={() => onChange(it)}
        >
          {format(it)}
        </button>
      ))}
    </div>
  );
}
