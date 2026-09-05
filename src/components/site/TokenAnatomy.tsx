'use client';

import { useState } from 'react';
import { DimensionGauge } from '@/components/data/DimensionGauge';
import { basisBps } from '@/lib/basis';
import { signed, usd } from '@/lib/format';
import type { Reading } from '@/lib/types';

/**
 * What the thing being measured actually is.
 *
 * The page spent seven sections measuring Stock Tokens without ever saying what one
 * is. The definition existed only inside the footer's legal block, which is the one
 * paragraph nobody reads, and ERC-8056 was never named at all — the formula said
 * `uiMultiplier` and left the reader to guess.
 *
 * The worked example is derived from a live reading rather than quoted, because the
 * repo's own docs disagree about the figure (docs/data-sources.md says the naive
 * comparison invents 340%, docs/engineering.md says 286%) and the honest answer is whatever
 * the multiplier happens to be right now.
 */
export function TokenAnatomy({ example }: { example: Reading | null }) {
  const [openTrap, setOpenTrap] = useState(false);
  const ref = example?.reference;
  const pool = example?.pool;

  // The naive mistake: comparing a pool to the raw share price, skipping the
  // multiplier entirely. Expressed as a percentage because at this size basis
  // points stop being legible.
  const naivePct = ref && pool && ref.mid > 0 ? (pool.price / ref.mid - 1) * 100 : null;
  const correct = ref && pool ? basisBps(pool.price, ref.price) : null;

  return (
    <div className="spec flex h-full flex-col p-5 md:p-6">
      <span className="lab">What you are holding</span>
      <p className="font-manrope mt-3 max-w-[54ch] text-[13.5px] leading-[22px] text-white/60">
        A Stock Token is an ERC-20 on Robinhood Chain giving economic exposure to a listed share —
        tokenised debt securities issued by Robinhood Assets (Jersey) Limited, without legal or
        beneficial rights in the underlying.
      </p>
      <p className="font-manrope mt-3 max-w-[54ch] text-[13.5px] leading-[22px] text-white/60">
        They never pay a cash dividend and never rebase. A split or a dividend moves an on-chain
        multiplier instead — the <b className="font-medium text-white/85">ERC-8056</b> standard. Your
        raw balance never changes; what each token <i>represents</i> does.
      </p>

      <pre className="drawer mt-4 text-[11px]">{'underlying_shares = raw_balance × uiMultiplier() / 1e18'}</pre>

      {example && ref && pool && naivePct !== null && correct !== null ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <button type="button" className="verify" onClick={() => setOpenTrap((v) => !v)}>
            {openTrap
              ? '[ hide the arithmetic ]'
              : `[ what happens if you skip it · ${example.symbol} right now ]`}
          </button>

          {openTrap ? (
          <>
          <div className="font-data mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-[6px] text-[12px]">
            <span className="text-white/45">the real {example.name} share</span>
            <span className="text-right text-white/70">{usd(ref.mid)}</span>
            <span className="text-white/45">× uiMultiplier()</span>
            <span className="text-right text-white/70">{ref.multiplier.toFixed(6)}</span>
            <span className="c-ref" data-src="ref">
              = what one token should be worth
            </span>
            <span className="c-ref text-right" data-src="ref">
              {usd(ref.price)}
            </span>
            <span className="c-pool" data-src="pool">
              the deepest pool pays
            </span>
            <span className="c-pool text-right" data-src="pool">
              {usd(pool.price)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border border-white/10 p-3">
              <span className="lab">Measured correctly</span>
              <div className="font-data c-mint mt-1 text-[18px]">{signed(correct)} bps</div>
            </div>
            <div className="border p-3" style={{ borderColor: 'var(--hot)' }}>
              <span className="lab">Skipping the multiplier</span>
              <div className="font-data c-hot mt-1 text-[18px]">
                {naivePct >= 0 ? '+' : ''}
                {naivePct.toFixed(0)}%
              </div>
            </div>
          </div>

          <p className="font-manrope mt-3 max-w-[54ch] text-[12.5px] leading-[20px] text-white/45">
            The same two numbers. Compare the pool to the raw share price and you print a premium that
            does not exist — which is what most screeners quoting these spreads are doing.
          </p>

          <DimensionGauge
            leftLabel={`REAL ${example.symbol}`}
            leftValue={ref.price}
            rightLabel="POOL"
            rightValue={pool.price}
            basis={correct}
            delayMs={200}
            className="mt-4 hidden h-auto w-full max-w-[320px] lg:block"
          />
          </>
          ) : null}
        </div>
      ) : (
        <p className="font-manrope mt-4 border-t border-white/10 pt-4 text-[12.5px] leading-[20px] text-white/45">
          No tracked token carries a multiplier other than 1.0 right now, so there is nothing live to
          show the trap with. Nine of 194 did on 2026-09-02.
        </p>
      )}

      <p className="font-manrope mt-auto pt-4 text-[12.5px] leading-[20px] text-white/45">
        The pools trade all 168 hours of the week. The shares trade about 32.
      </p>
    </div>
  );
}
