'use client';

import { useState } from 'react';
import type { Reading } from '@/lib/types';

/**
 * The anti-scam device, and the reason the whole page can be trusted.
 *
 * Every figure expands to the three commands that reproduce it — and none of them
 * touch basis. The reference price and multiplier come from the issuer, the pool
 * price from a public index. If basis lies, one curl catches it.
 *
 * A competitor cannot copy this without also being correct.
 */
export function verifyLines(r: Reading): string {
  const ref = r.reference;
  const pool = r.pool;
  const stamp = new Date(r.asOf).toISOString().replace('T', ' ').slice(0, 16);

  return [
    '# three commands, none of them ours',
    `curl "https://api.robinhood.com/rhj/prices/${r.symbol}"`,
    `#   -> bid ${ref.bid} / ask ${ref.ask}, mid ${ref.mid.toFixed(2)}`,
    `curl "https://api.robinhood.com/rhj/assets"`,
    `#   -> ${r.symbol}.currentMultiplier = ${ref.multiplier.toFixed(6)}`,
    `curl "https://api.dexscreener.com/latest/dex/tokens/${r.address}"`,
    pool
      ? `#   -> deepest pool ${pool.price.toFixed(2)} (${pool.dex} ${pool.version} ${r.symbol}/${pool.quote})`
      : '#   -> no qualifying pool',
    '',
    '# the arithmetic',
    `reference = ${ref.mid.toFixed(2)} x ${ref.multiplier.toFixed(6)} = ${ref.price.toFixed(2)}`,
    pool && r.basisBps !== null
      ? `basis     = ( ${pool.price.toFixed(2)} / ${ref.price.toFixed(2)} - 1 ) x 10000 = ${r.basisBps > 0 ? '+' : ''}${r.basisBps} bps`
      : 'basis     = unmeasurable without a live reference',
    '',
    `# ${stamp} UTC${r.stale ? ' — stored capture, not a live call' : ''}`,
    '# re-run these and the numbers will have moved. That is the point.',
  ].join('\n');
}

export function VerifyDrawer({ reading, className = '' }: { reading: Reading; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = verifyLines(reading);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the commands are on screen regardless */
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        <button type="button" className="verify" onClick={() => setOpen((v) => !v)}>
          {open ? '[ hide ]' : '[ verify this number ]'}
        </button>
        {open ? (
          <button type="button" className="verify" onClick={copy}>
            {copied ? '[ copied ]' : '[ copy commands ]'}
          </button>
        ) : null}
      </div>
      {open ? <pre className="drawer mt-4">{text}</pre> : null}
    </div>
  );
}
