'use client';

import { useEffect, useState } from 'react';
import { DimensionGauge } from '@/components/data/DimensionGauge';
import { PoolField } from '@/components/data/PoolField';
import { VerifyDrawer } from '@/components/data/VerifyDrawer';
import { Flag } from '@/components/ui/Flag';
import { Tick } from '@/components/ui/Tick';
import { basisBps, executionQuote, spreadBps } from '@/lib/basis';
import { dateStampUtc, dollars, signed } from '@/lib/format';
import { useLiveReadings } from '@/lib/live';
import { currentSession } from '@/lib/session';
import type { Reading, Pool, SessionState } from '@/lib/types';

/** The size the hero quotes. Matches the default in the execution check below it. */
const HERO_NOTIONAL = 25_000;

/**
 * Numeral-first hierarchy, and the dataset as the picture.
 *
 * Every landing page makes the headline the biggest thing. An instrument makes the
 * *reading* the biggest thing — the H1 sits small and quiet beneath it. That is the
 * one real aesthetic bet on this page, and it is legible because the number is true.
 *
 * Behind it, the pool field is the composition rather than a texture: every live pool
 * as a column of light on a priced axis, the reference and the deepest pool named.
 * The video sits behind that, faint. The field is the one thing on the page nobody
 * else can have, because it only exists if the product is running.
 *
 * The big number is always the spread. It used to become an elapsed "frozen" counter
 * when the market shut, which was wrong twice over: it is not a measurement, and the
 * spread does not need the market open. Spread is pool against pool, and the pools
 * trade all 168 hours. Only *basis* — pool against the reference — goes unmeasurable
 * off-hours, and the small line beneath the headline says exactly that.
 *
 * The two numbers are named. The giant one is the *spread* and the small one is the
 * *basis*, and shipping them unlabelled read as one measurement contradicting itself
 * — 546 next to -4. They answer different questions, which is why both exist: basis
 * asks whether the token is priced correctly against the real world, spread asks
 * whether the pools even agree with each other.
 */
export function Hero({
  readings: initial,
  ladders,
  initialSession,
  capturedAt,
}: {
  readings: Reading[];
  ladders: Record<string, Pool[]>;
  initialSession: SessionState;
  capturedAt: string;
}) {
  // The reading the visitor loaded is the baseline; from there it stays current.
  const readings = useLiveReadings(initial);
  const [symbol, setSymbol] = useState(readings[0]?.symbol ?? 'NVDA');
  const [session, setSession] = useState<SessionState>(initialSession);

  useEffect(() => {
    const tick = () => setSession(currentSession(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const reading = readings.find((r) => r.symbol === symbol) ?? readings[0];
  if (!reading) return null;

  const pools = ladders[symbol] ?? (reading.pool ? [reading.pool] : []);
  const spread = pools.length > 1 ? spreadBps(pools) : (reading.spreadBps ?? 0);
  const basis = reading.pool ? basisBps(reading.pool.price, reading.reference.price) : null;
  const closed = session === 'closed';
  // Same function section 01 calls, so the hero can never quote a figure the
  // execution check would contradict for the same token and size. Pool against
  // pool, so it holds whether the market is open or not.
  const quote = executionQuote(pools, HERO_NOTIONAL);

  return (
    <section id="s1" className="relative h-[100svh] min-h-[640px] overflow-hidden">
      {/* Faint. The field in front of it is the picture; this is atmosphere. */}
      <video
        className="a-in absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.28 }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src="/video/basis-hero-1280.mp4"
      />
      <PoolField
        pools={pools}
        referencePrice={reading.reference.price}
        closed={closed}
        symbol={reading.symbol}
        anchor={reading.pool}
        className="a-in absolute inset-0 h-full w-full"
      />

      {/* Legibility scrim: heavy on the left where the reading and copy sit, and
          nearly open on the right so the chart reads as a chart. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.66) 34%, rgba(0,0,0,.08) 58%, rgba(0,0,0,.2) 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 40%, transparent 36%, rgba(0,0,0,.34) 78%, #000 100%)' }}
      />
      {/* One structural hairline. The chart's own axis is the other. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-0 h-px w-full bg-white/[0.04]" style={{ top: '32.7%' }} />
      </div>

      <div className="relative z-[2] flex h-full flex-col px-5 pb-[24px] pt-[92px] md:px-[35px] md:pb-[35px] md:pt-[112px]">
        <div className="a-up flex flex-wrap items-center gap-[14px]" style={{ animationDelay: '200ms' }}>
          <span className="lab lab-on">[ READING ]</span>
          <span className="lab">
            {reading.symbol} · {pools.length || reading.poolCount} POOLS
          </span>
          <span className="lab">
            {reading.stale ? `CAPTURED ${dateStampUtc(capturedAt)}` : `LIVE · ${dateStampUtc(reading.asOf)}`}
          </span>
        </div>

        <div className="a-up mt-[22px] md:mt-[34px]" style={{ animationDelay: '400ms' }}>
          <div className="flex flex-wrap items-end gap-[14px]">
            <div className="reading c-hot text-[92px] sm:text-[140px] lg:text-[200px]" data-src="pool">
              <Tick value={spread} tone="hot">{spread}</Tick>
            </div>
            <div className="reading pb-[10px] text-[28px] text-white/55 sm:text-[40px] lg:pb-[22px] lg:text-[56px]">
              bps
            </div>
          </div>
          <div className="lab mt-[10px]">
            spread · widest gap between two pools of the same token, same second
          </div>
        </div>

        <div
          className="a-up mt-[26px] grid items-end gap-x-[60px] gap-y-[22px] md:mt-[34px] md:grid-cols-[1fr_auto]"
          style={{ animationDelay: '600ms' }}
        >
          <div className="max-w-[560px]">
            <h1 className="font-graphik text-[28px] leading-[1.02] tracking-[-.02em] text-white sm:text-[36px] md:text-[44px]">
              One share. Two prices.
            </h1>
            <p className="font-manrope mt-[14px] max-w-[52ch] text-[14.5px] leading-[23px] text-white/55">
              {closed
                ? `The exchange is shut and the oracle is holding its last value, but ${pools.length || reading.poolCount} pools are still quoting ${reading.name} to whoever turns up — and they do not agree with each other.`
                : 'A Stock Token on Robinhood Chain is meant to be worth the share. In a pool it is worth whatever the last buyer paid. basis measures the distance — once a minute, for every token.'}
            </p>
            {quote && quote.differenceUsd > 0 ? (
              <p className="font-manrope mt-[14px] max-w-[52ch] text-[14.5px] leading-[23px] text-white/75">
                On a {dollars(HERO_NOTIONAL)} order of {reading.symbol}, the wrong pool costs{' '}
                <b className="c-hot font-medium">
                  <Tick value={quote.differenceUsd} tone="hot">{dollars(quote.differenceUsd)}</Tick>
                </b>{' '}
                more for exactly the same tokens.
              </p>
            ) : null}

            {/* The other question. Shipping 546 beside -4 with neither named read as
                one measurement contradicting itself. */}
            <p className="font-data mt-[16px] text-[12.5px] leading-[20px] text-white/70">
              <span className="text-white/40">basis · is it priced right against the real world?</span>
              <br />
              <span
                data-src="ref"
                className={basis === null ? '' : Math.abs(basis) >= 200 ? 'c-hot' : Math.abs(basis) >= 100 ? '' : 'c-mint'}
              >
                {basis === null ? 'unmeasurable' : `${signed(basis)} bps`}
              </span>{' '}
              · <Flag flag={reading.flag} />
              <span className="text-white/40">
                {closed
                  ? ` · the real ${reading.name} last traded at the close`
                  : ` · deepest pool vs the real ${reading.name}`}
              </span>
            </p>
            <div className="mt-[24px] flex flex-wrap items-center gap-[18px]">
              <a href="#s4" className="btn">
                <span className="text-[16px] leading-none">&#10022;</span>
                Open the readout
              </a>
            </div>
            <VerifyDrawer reading={reading} className="mt-[16px]" />
          </div>

          <DimensionGauge
            leftLabel="MARKET"
            leftValue={reading.reference.price}
            rightLabel="POOL"
            rightValue={reading.pool?.price ?? reading.reference.price}
            basis={basis}
          />
        </div>

        {/* Scrolls rather than wraps: six tokens plus labels is wider than a phone,
            and a second line would eat into the reading above. */}
        <div
          className="token-strip a-up mt-auto flex flex-nowrap items-center gap-[26px] overflow-x-auto border-t border-white/10 pt-[22px]"
          style={{ animationDelay: '800ms' }}
        >
          <span className="lab shrink-0">Featured</span>
          {readings.map((r) => (
            <button
              key={r.symbol}
              type="button"
              className="shrink-0"
              aria-pressed={r.symbol === symbol}
              onClick={() => setSymbol(r.symbol)}
            >
              {r.symbol}
            </button>
          ))}
          <span className="lab ml-auto hidden shrink-0 md:inline">click to switch</span>
        </div>
      </div>

    </section>
  );
}
