import type { Flag, Pool, Reference, SessionState } from './types';

/**
 * The measurement. Every number the product publishes passes through this file and
 * nowhere else, so the multiplier can only be applied once and can never be skipped.
 *
 *   basis = ( pool / ( mid x uiMultiplier ) - 1 ) x 10000    // basis points
 *
 * The multiplication is not cosmetic. Stock Tokens carry an ERC-8056 multiplier that
 * absorbs dividends and splits: CrowdStrike sat at exactly 4.0 after a split, so the
 * naive pool-versus-share-price comparison prints a +286% premium that does not exist.
 * See src/lib/basis.test.mjs, which asserts precisely that trap.
 */

export const BPS = 10_000;

/** Deepest pool against the reference. */
export function basisBps(poolPrice: number, referencePrice: number): number {
  if (!Number.isFinite(poolPrice) || !Number.isFinite(referencePrice) || referencePrice <= 0) {
    return 0;
  }
  return Math.round((poolPrice / referencePrice - 1) * BPS);
}

/** Cheapest pool against dearest — the pools disagreeing among themselves. */
export function spreadBps(pools: Pool[]): number {
  if (pools.length < 2) return 0;
  const prices = pools.map((p) => p.price).filter((p) => p > 0);
  if (prices.length < 2) return 0;
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return Math.round((hi / lo - 1) * BPS);
}

/** The reference a pool should be compared to. The only place the multiplier lands. */
export function referencePrice(mid: number, multiplier: number): number {
  return mid * multiplier;
}

/**
 * A pool must turn over at least this fraction of its own depth in 24h before we
 * treat its quote as a live price rather than a stale one.
 */
export const MIN_TURNOVER = 0.1;

/**
 * The pool a router would most likely reach.
 *
 * Not simply the largest by TVL. Parked liquidity that nobody trades against holds
 * a stale price, and ranking on depth alone picks it. Observed 2026-09-03: TSLA's
 * largest pool held $418,744 but had traded $8,835 in 24 hours — 2% turnover — and
 * quoted 356.24 while the reference was 383.29 and every actively traded pool sat
 * at 382-384. Reporting that as a -706 bps dislocation would have been wrong.
 *
 * So a pool has to be both deep and awake: among pools that turned over at least
 * MIN_TURNOVER of their depth, take the deepest. If none report volume — the stored
 * capture does not carry it — fall back to depth alone.
 */
export function deepestPool(pools: Pool[]): Pool | null {
  if (!pools.length) return null;

  const active = pools.filter(
    (p) => p.volume24hUsd !== undefined && p.volume24hUsd >= p.liquidityUsd * MIN_TURNOVER,
  );
  const pool = active.length ? active : pools;
  return pool.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a));
}

export interface FlagInput {
  basis: number | null;
  session: SessionState;
  referenceAgeSeconds: number;
  stale: boolean;
  corporateActionPending?: boolean;
}

/**
 * DARK outranks everything else. A token cannot be TIGHT at 2am on a Sunday, because
 * there is nothing to be tight against — the gap is unmeasurable, not zero. Getting
 * this precedence wrong is the single most misleading thing a readout can do.
 */
export function flagFor({
  basis,
  session,
  referenceAgeSeconds,
  stale,
  corporateActionPending,
}: FlagInput): Flag {
  if (corporateActionPending) return 'ACTION';
  if (session === 'closed' || stale || referenceAgeSeconds > 900 || basis === null) return 'DARK';
  const a = Math.abs(basis);
  if (a >= 200) return 'WIDE';
  if (a >= 100) return 'WATCH';
  return 'TIGHT';
}

export const FLAG_MEANING: Record<Flag, string> = {
  TIGHT: 'Behaving. The token tracks the share.',
  WATCH: 'Drifting. Worth a look before you trade size.',
  WIDE: 'Materially dislocated against a live reference.',
  DARK: 'No trustworthy reference exists. The gap is unmeasurable, not zero.',
  ACTION: 'A corporate action is in flight. Prices either side of it are not comparable.',
};

/** Pool disagreement gets its own scale — different problem, different cause. */
export function spreadBand(spread: number): 'normal' | 'notable' | 'flagged' {
  if (spread >= 400) return 'flagged';
  if (spread >= 100) return 'notable';
  return 'normal';
}

export interface ExecutionQuote {
  best: Pool;
  worst: Pool;
  tokens: number;
  costAtWorst: number;
  differenceUsd: number;
  differencePct: number;
  /** Set when no pool can absorb the order without meaningful impact. */
  warning: string | null;
}

/**
 * What the gap is worth on a real order.
 *
 * A pool only qualifies if it holds at least four times the notional. Below that we
 * say so rather than quoting a price we cannot stand behind — concentrated liquidity
 * means TVL is not depth, and the quoted price is the top of book, not your fill.
 * This is gross: fees, impact and routing hops are not modelled. Labelled as such.
 */
export function executionQuote(pools: Pool[], notionalUsd: number): ExecutionQuote | null {
  if (!pools.length) return null;
  const sorted = [...pools].sort((a, b) => a.price - b.price);
  const deep = sorted.filter((p) => p.liquidityUsd >= notionalUsd * 4);
  const thin = deep.length === 0;
  const best = (thin ? sorted : deep)[0]!;
  const worst = sorted[sorted.length - 1]!;

  const tokens = notionalUsd / best.price;
  const costAtWorst = tokens * worst.price;

  let warning: string | null = null;
  if (thin) {
    warning = `No pool holds four times this order. At this size you are a large share of every book — impact will move the price against you and a live quote is required.`;
  } else if (notionalUsd > best.liquidityUsd * 0.1) {
    const pct = Math.round((notionalUsd / best.liquidityUsd) * 100);
    warning = `This order is ${pct}% of the best pool's depth. The quoted price is the top of book, not your fill.`;
  }

  return {
    best,
    worst,
    tokens,
    costAtWorst,
    differenceUsd: costAtWorst - notionalUsd,
    differencePct: (worst.price / best.price - 1) * 100,
    warning,
  };
}

/** Convenience for building a Reference when only bid/ask/multiplier are known. */
export function makeReference(
  bid: number,
  ask: number,
  multiplier: number,
  generatedAt: string,
  halted: boolean,
  source: Reference['source'],
  now: Date = new Date(),
): Reference {
  const mid = (bid + ask) / 2;
  const gen = Date.parse(generatedAt);
  return {
    price: referencePrice(mid, multiplier),
    mid,
    bid,
    ask,
    multiplier,
    halted,
    generatedAt,
    ageSeconds: Number.isFinite(gen) ? Math.max(0, Math.round((now.getTime() - gen) / 1000)) : 0,
    source,
  };
}
