'use client';

import { useState } from 'react';
import type { CorporateAction } from '@/lib/types';

/**
 * The next fortnight of corporate actions.
 *
 * The reason this earns a panel: when an action processes, the issuer pauses that
 * token's oracle — and the pools do not pause. That window is knowable in advance,
 * which makes it one of the few genuinely forward-looking things basis can show
 * without predicting anything.
 *
 * Only the next few are shown. A fortnight of Stock Token dividends is sixteen rows,
 * and rows eight through sixteen are a fortnight away — a count carries them until
 * someone asks.
 */

const WINDOW_DAYS = 14;
const IMMINENT_DAYS = 2;
const PREVIEW = 5;

export function ActionCalendar({ actions }: { actions: CorporateAction[] }) {
  const [expanded, setExpanded] = useState(false);
  const now = Date.now();
  const horizon = now + WINDOW_DAYS * 86_400_000;

  const upcoming = actions
    .filter((a) => a.status === 'IN_PROGRESS' && a.date)
    .map((a) => ({ ...a, ts: Date.parse(`${a.date}T00:00:00Z`) }))
    .filter((a) => Number.isFinite(a.ts) && a.ts >= now - 86_400_000 && a.ts <= horizon)
    .sort((a, b) => a.ts - b.ts);

  const shown = expanded ? upcoming : upcoming.slice(0, PREVIEW);
  const hidden = upcoming.length - shown.length;
  // Sorted by date and capped at five, so the top rows are nearly always inside the
  // window — five identical red badges distinguish nothing. The count goes in the
  // header once; the rows carry a tick.
  const imminentCount = upcoming.filter((a) => a.ts <= now + IMMINENT_DAYS * 86_400_000).length;

  return (
    <div className="spec p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="lab">Next {WINDOW_DAYS} days · oracle pauses</span>
        <span className="font-data text-[11px] text-white/35">
          {upcoming.length} scheduled
          {imminentCount > 0 ? (
            <span className="ml-2 flag f-ACTION">{imminentCount} PAUSING IN 48H</span>
          ) : null}
        </span>
      </div>

      {upcoming.length === 0 ? (
        <p className="font-manrope mt-4 text-[13.5px] leading-[22px] text-white/45">
          Nothing scheduled in the window, or the calendar is unavailable.
        </p>
      ) : (
        <div className="mt-4 flex flex-col">
          {shown.map((a, i) => {
            const imminent = a.ts <= now + IMMINENT_DAYS * 86_400_000;
            return (
              <div
                key={`${a.symbol}-${a.date}-${i}`}
                className="grid grid-cols-[10px_70px_64px_1fr] items-baseline gap-3 border-b border-white/[0.06] py-[9px] last:border-b-0"
              >
                <span
                  className="font-data text-[12px]"
                  style={{ color: imminent ? 'var(--hot)' : 'transparent' }}
                  title={imminent ? 'Oracle pauses within 48 hours' : ''}
                >
                  ›
                </span>
                <span className="font-data text-[12px] text-white/70">{a.date?.slice(5)}</span>
                <span className="font-data text-[12px] font-medium">{a.symbol}</span>
                <span className="font-data text-[12px] text-white/45">
                  {a.type.toLowerCase().replace(/_/g, ' ')}
                  {a.rate ? ` · ${a.rate}` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {hidden > 0 || expanded ? (
        <button type="button" className="verify mt-4" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '[ show fewer ]' : `[ ${hidden} more in the window ]`}
        </button>
      ) : null}

      <p className="font-manrope mt-4 max-w-[62ch] text-[12px] leading-[19px] text-white/40">
        A dividend or split moves the ERC-8056 multiplier, and the issuer pauses that token&apos;s
        oracle while it processes. The pools keep trading throughout.
      </p>
    </div>
  );
}
