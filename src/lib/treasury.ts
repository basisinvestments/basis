import { MIN_TURNOVER } from './basis';
import type { Pool, Reading } from './types';

/**
 * The treasury mandate, as code.
 *
 * `docs/token.md` publishes the rules the treasury trades under. This is the same
 * rules applied to a live reading, so that "what the treasury would do right now"
 * is a computed fact rather than a description — and so it can be recorded, every
 * minute, into a ledger that shows whether the instrument finds trades worth taking.
 *
 * Nothing here trades, sizes an order for anyone, or constructs a transaction. It
 * produces a SIGNAL: under the published mandate, this is the position and this is
 * the gross return at the quoted prices. Every figure is labelled simulated wherever
 * it renders, and the label is enforced by the copy gate.
 *
 * One trade type is simulated in this pass — pool-to-pool, the same token quoted at
 * two prices at the same instant. It needs no reference and no memory, so it can be
 * evaluated the moment a reading exists. Weekend reversion and corporate-action
 * windows need a position to be held across time and are recorded as not yet
 * simulated rather than approximated.
 */

/** The balance at which the treasury begins trading. Published in docs/token.md. */
export const ARM_THRESHOLD_USD = 50_000;

/** Mandate: at most this share of the shallower pool's liquidity per position. */
export const MAX_POOL_SHARE = 0.05;

/** Mandate: at most this share of the treasury in one token. */
export const MAX_TREASURY_SHARE = 0.2;

/**
 * Assumed fee per leg, in basis points. The pool fee tier is not in the index data,
 * so this is an assumption and is shown beside every net figure. 30 bps is the common
 * Uniswap tier; a 100 bps pool would double the round trip.
 */
export const FEE_BPS_PER_LEG = 30;

/** Pools below this are dust and are never traded. Same floor the readout uses. */
const DUST_USD = 3_000;

/** Quotes the mandate permits holding. Stock-token-against-stock-token pairs are out. */
const PERMITTED_QUOTES = new Set(['USDG', 'WETH', 'ETH']);

export interface Signal {
  symbol: string;
  kind: 'pool-to-pool';
  /** The cheaper pool — where the mandate would buy. */
  buy: Pool;
  /** The dearer pool — where it would sell. */
  sell: Pool;
  /** Gross gap between the two quotes. */
  spreadBps: number;
  /** Position size, after both caps. */
  sizeUsd: number;
  /** Which cap bound the size. */
  boundBy: 'pool' | 'treasury';
  /** size × spread — the gap at quote, before anything. */
  grossUsd: number;
  /** Two legs at FEE_BPS_PER_LEG. An assumption, and labelled as one. */
  feesUsd: number;
  /** gross − fees. Still at quote: not a fill, not executable size. */
  netUsd: number;
}

export interface Evaluation {
  symbol: string;
  signal: Signal | null;
  /** Why there is no signal, when there is none. */
  reason: string | null;
}

function tradeable(p: Pool): boolean {
  if (p.liquidityUsd < DUST_USD) return false;
  if (!PERMITTED_QUOTES.has(p.quote.toUpperCase())) return false;
  // Active only: a deep, dormant pool quotes a price nobody is trading at.
  if (p.volume24hUsd !== undefined && p.volume24hUsd < p.liquidityUsd * MIN_TURNOVER) return false;
  return true;
}

/**
 * Apply the mandate to one token's pools.
 *
 * `treasuryUsd` is the notional the position is sized against. Before the treasury
 * is funded the ledger runs at ARM_THRESHOLD_USD — "what it would do once armed" —
 * and says so. Once the real balance exceeds the threshold the two converge.
 */
export function evaluate(symbol: string, pools: Pool[], treasuryUsd: number): Evaluation {
  const live = pools.filter(tradeable);
  if (live.length < 2) {
    return {
      symbol,
      signal: null,
      reason:
        live.length === 0
          ? 'No pool above the dust floor with a permitted quote and live turnover.'
          : 'Only one tradeable pool — nothing to trade it against.',
    };
  }

  const sorted = [...live].sort((a, b) => a.price - b.price);
  const buy = sorted[0]!;
  const sell = sorted[sorted.length - 1]!;
  const spreadBps = (sell.price / buy.price - 1) * 10_000;

  const roundTripBps = FEE_BPS_PER_LEG * 2;
  if (spreadBps <= roundTripBps) {
    return {
      symbol,
      signal: null,
      reason: `Spread ${spreadBps.toFixed(0)} bps does not clear the assumed ${roundTripBps} bps round trip.`,
    };
  }

  const shallower = Math.min(buy.liquidityUsd, sell.liquidityUsd);
  const poolCap = shallower * MAX_POOL_SHARE;
  const treasuryCap = treasuryUsd * MAX_TREASURY_SHARE;
  const sizeUsd = Math.min(poolCap, treasuryCap);
  const boundBy: Signal['boundBy'] = poolCap <= treasuryCap ? 'pool' : 'treasury';

  if (sizeUsd <= 0) {
    return { symbol, signal: null, reason: 'Treasury balance is zero; nothing to size against.' };
  }

  const grossUsd = sizeUsd * (spreadBps / 10_000);
  const feesUsd = sizeUsd * (roundTripBps / 10_000);

  return {
    symbol,
    signal: {
      symbol,
      kind: 'pool-to-pool',
      buy,
      sell,
      spreadBps,
      sizeUsd,
      boundBy,
      grossUsd,
      feesUsd,
      netUsd: grossUsd - feesUsd,
    },
    reason: null,
  };
}

/** Every token, in one pass. */
export function evaluateAll(
  readings: Reading[],
  ladders: Record<string, Pool[]>,
  treasuryUsd: number,
): Evaluation[] {
  return readings.map((r) => {
    const pools = ladders[r.symbol] ?? (r.pool ? [r.pool] : []);
    return evaluate(r.symbol, pools, treasuryUsd);
  });
}

/** One ledger row: what the mandate saw at one instant. */
export interface LedgerEntry {
  /** ISO minute, e.g. 2026-09-12T14:32 — the ledger's key. */
  minute: string;
  asOf: string;
  session: string;
  /** The notional the signals were sized against, and whether it was the real balance. */
  notionalUsd: number;
  notionalIsReal: boolean;
  signals: Array<{
    symbol: string;
    spreadBps: number;
    sizeUsd: number;
    netUsd: number;
    buy: { dex: string; quote: string; price: number; liquidityUsd: number };
    sell: { dex: string; quote: string; price: number; liquidityUsd: number };
  }>;
  /** Tokens evaluated with no signal, and why — so silence is explained. */
  quiet: number;
}

export function toLedgerEntry(
  evaluations: Evaluation[],
  asOf: string,
  session: string,
  notionalUsd: number,
  notionalIsReal: boolean,
): LedgerEntry {
  const signals = evaluations
    .filter((e): e is Evaluation & { signal: Signal } => e.signal !== null)
    .map(({ signal: s }) => ({
      symbol: s.symbol,
      spreadBps: Math.round(s.spreadBps),
      sizeUsd: Math.round(s.sizeUsd),
      netUsd: Math.round(s.netUsd * 100) / 100,
      buy: { dex: s.buy.dex, quote: s.buy.quote, price: s.buy.price, liquidityUsd: s.buy.liquidityUsd },
      sell: { dex: s.sell.dex, quote: s.sell.quote, price: s.sell.price, liquidityUsd: s.sell.liquidityUsd },
    }));
  return {
    minute: asOf.slice(0, 16),
    asOf,
    session,
    notionalUsd,
    notionalIsReal,
    signals,
    quiet: evaluations.length - signals.length,
  };
}
