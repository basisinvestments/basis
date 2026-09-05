'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A figure that flashes when it changes.
 *
 * The terminal convention: a cell whose value just moved lights up in its own colour
 * for a moment, then settles. It tells the eye where to look without a single word,
 * and it is the clearest signal a page can give that it is live rather than a
 * snapshot.
 *
 * Never fires on first mount — a page that flashes every figure on load is a page
 * shouting. Only a change from a previously rendered value counts.
 */
export function Tick({
  value,
  tone,
  className = '',
  children,
}: {
  /** The number being displayed. Compared, not rendered — pass the formatted text as children. */
  value: number | null | undefined;
  /** Which semantic colour to flash in. */
  tone: 'ref' | 'pool' | 'hot';
  className?: string;
  children: React.ReactNode;
}) {
  const prev = useRef<number | null | undefined>(undefined);
  const [flash, setFlash] = useState<'up' | 'down' | 'move' | null>(null);

  useEffect(() => {
    const was = prev.current;
    prev.current = value;

    // undefined means "never rendered" — the mount case. Null means "no reading".
    if (was === undefined || was === null || value === null || value === undefined) return;
    if (was === value) return;

    setFlash(value > was ? 'up' : value < was ? 'down' : 'move');
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span className={`tick ${flash ? `tick-${tone} tick-${flash}` : ''} ${className}`.trim()}>
      {children}
    </span>
  );
}
