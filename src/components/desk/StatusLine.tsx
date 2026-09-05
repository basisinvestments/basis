'use client';

import { useEffect, useState } from 'react';
import { SESSION_LABEL, currentSession } from '@/lib/session';
import type { Flag, Reading, SessionState } from '@/lib/types';

/**
 * The whole answer in one line, above everything else.
 *
 * A desk is opened to see state, not to read. Before this the first number sat
 * 556px down the page, behind a title and two paragraphs — which is fine for a
 * landing page and wrong for a tool you open every day.
 *
 * Worst flag wins, because the only thing a glance needs to establish is whether
 * anything requires attention.
 */

const SEVERITY: Record<Flag, number> = { TIGHT: 0, DARK: 1, WATCH: 2, ACTION: 3, WIDE: 4 };

export function StatusLine({
  readings,
  watched,
  initialSession,
}: {
  readings: Reading[];
  watched: string[];
  initialSession: SessionState;
}) {
  const [session, setSession] = useState<SessionState>(initialSession);

  useEffect(() => {
    const tick = () => setSession(currentSession());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const rows = watched
    .map((s) => readings.find((r) => r.symbol === s))
    .filter((r): r is Reading => Boolean(r));

  const worst = rows.reduce<Flag>(
    (acc, r) => (SEVERITY[r.flag] > SEVERITY[acc] ? r.flag : acc),
    'TIGHT',
  );
  const needsAttention = rows.filter((r) => r.flag === 'WIDE' || r.flag === 'WATCH');
  const closed = session === 'closed';

  return (
    <div className="spec flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <span className={`flag f-${worst}`}>{worst}</span>
        <span className="font-manrope text-[14px] text-white/80">
          {rows.length === 0
            ? 'Nothing watched yet'
            : needsAttention.length === 0
              ? `All ${rows.length} tracking the reference`
              : `${needsAttention.length} of ${rows.length} drifting — ${needsAttention
                  .map((r) => r.symbol)
                  .join(', ')}`}
        </span>
      </div>

      <span className="hidden h-4 w-px bg-white/15 sm:block" />

      <div className="flex items-center gap-3">
        <span className="dot" />
        <span className="font-manrope text-[13.5px] text-white/55">{SESSION_LABEL[session]}</span>
      </div>

      {closed ? (
        <span className="font-manrope text-[13px] text-white/45">
          Every gap reads DARK — the pools are trading against a price that stopped moving.
        </span>
      ) : null}
    </div>
  );
}
