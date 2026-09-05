'use client';

import { useMemo, useState } from 'react';
import { PoolStrip } from '@/components/data/PoolStrip';
import { PriceLadder } from '@/components/data/PriceLadder';
import { Seg } from '@/components/ui/Seg';
import { executionQuote } from '@/lib/basis';
import { depth, dollars, pct, signed, usd } from '@/lib/format';
import { basisBps } from '@/lib/basis';
import type { Pool } from '@/lib/types';

const SIZES = [1000, 5000, 25000, 100000] as const;

/**
 * The mass-market use. Far more people lose money by landing in the wrong pool than
 * will ever make money arbitraging the gap — this is the thing you check before you
 * press buy.
 *
 * It deliberately does not flatter you: above a tenth of a pool's depth it says the
 * quote is the top of book, and where nothing can absorb the order it declines to
 * rank at all. Everything here is gross — fees, impact and routing hops are not
 * modelled, because on concentrated liquidity they cannot be from TVL alone.
 *
 * The distribution shows as a strip, not a ladder. Thirty rungs is 920px and the
 * question here is only "are the pools clustered or scattered, and where do the two
 * quoted prices sit in that" — one axis answers it. The ladder is still one click
 * away for anyone who wants to read every venue.
 */
export function ExecutionCheck({
  symbols,
  ladders,
  references,
  names,
}: {
  symbols: string[];
  ladders: Record<string, Pool[]>;
  references: Record<string, number>;
  names: Record<string, string>;
}) {
  const [symbol, setSymbol] = useState(symbols[0] ?? 'NVDA');
  const [size, setSize] = useState<(typeof SIZES)[number]>(25000);
  const [allPools, setAllPools] = useState(false);

  // Memoised so the identity is stable — otherwise the `?? []` fallback allocates a
  // fresh array every render and the quote below recomputes forever.
  const pools = useMemo(() => ladders[symbol] ?? [], [ladders, symbol]);
  const reference = references[symbol] ?? 0;
  const quote = useMemo(() => executionQuote(pools, size), [pools, size]);

  if (!quote) {
    return (
      <div className="spec p-5 md:p-6">
        <p className="font-manrope text-[14px] text-white/50">
          No pools above the dust threshold for {symbol} in this capture.
        </p>
      </div>
    );
  }

  const { best, worst, tokens, costAtWorst, differenceUsd, differencePct, warning } = quote;

  return (
    <div className="spec p-5 md:p-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
        <div>
          <span className="lab mb-2 block">Token</span>
          <Seg items={symbols} value={symbol} onChange={setSymbol} label="Choose a Stock Token" />
        </div>
        <div>
          <span className="lab mb-2 block">You want to buy</span>
          <Seg
            items={SIZES}
            value={size}
            onChange={setSize}
            format={(s) => `$${s / 1000}k`}
            label="Choose a trade size"
          />
        </div>
      </div>

      <div className="mt-6 grid border border-white/10 md:grid-cols-3">
        <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
          <span className="lab">Best price available</span>
          <div className="font-data c-mint mt-2 text-[24px]">{usd(best.price)}</div>
          <div className="font-data mt-1 text-[11px] text-white/40">
            {best.dex} {best.version} · {symbol}/{best.quote} · {depth(best.liquidityUsd)} depth ·{' '}
            {signed(basisBps(best.price, reference))} bps vs reference
          </div>
        </div>
        <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
          <span className="lab">Worst pool you could hit</span>
          <div className="font-data c-hot mt-2 text-[24px]">{usd(worst.price)}</div>
          <div className="font-data mt-1 text-[11px] text-white/40">
            {worst.dex} {worst.version} · {symbol}/{worst.quote} · {depth(worst.liquidityUsd)} depth ·{' '}
            {signed(basisBps(worst.price, reference))} bps vs reference
          </div>
        </div>
        <div className="p-4">
          <span className="lab">Difference on this order</span>
          {/* dollars(), never depth() — this is money someone actually pays. */}
          <div
            className={`font-data mt-2 text-[24px] ${differenceUsd > size * 0.01 ? 'c-hot' : 'text-white'}`}
          >
            {dollars(differenceUsd)}
          </div>
          <div className="font-data mt-1 text-[11px] text-white/40">
            {pct(differencePct)} of a {dollars(size)} order, for the same {tokens.toFixed(3)} tokens
          </div>
        </div>
      </div>

      <p className="font-manrope mt-4 max-w-[74ch] text-[14px] leading-[23px] text-white/65">
        Buying <b className="font-medium text-white">{dollars(size)} of {symbol}</b> gets you{' '}
        <b className="font-medium text-white">{tokens.toFixed(3)} tokens</b> at the best pool. The same
        order routed into <b className="font-medium text-white">{symbol}/{worst.quote}</b> costs{' '}
        <b className="font-medium text-white">{dollars(costAtWorst)}</b> —{' '}
        <b className="c-hot">{dollars(differenceUsd)} more</b> for exactly the same thing. The real{' '}
        {names[symbol] ?? symbol} is {usd(reference)}.
      </p>

      {warning ? (
        <p className="font-data mt-3 text-[11.5px]" style={{ color: 'var(--warn)' }}>
          {warning}
        </p>
      ) : null}

      <div className="mt-6">
        <span className="lab mb-3 block">Where those two prices sit · every pool over $3k</span>
        <PoolStrip symbol={symbol} pools={pools} referencePrice={reference} best={best} worst={worst} />

        {pools.length > 1 ? (
          <>
            <button type="button" className="verify mt-4" onClick={() => setAllPools((v) => !v)}>
              {allPools ? '[ hide the full list ]' : `[ list all ${pools.length} pools ]`}
            </button>
            {allPools ? (
              <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                <PriceLadder
                  symbol={symbol}
                  pools={pools}
                  referencePrice={reference}
                  highlightBest={best}
                  highlightWorst={worst}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
