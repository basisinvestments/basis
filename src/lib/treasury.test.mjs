import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The treasury mandate, mirrored from src/lib/treasury.ts.
 *
 * These pin the rules the site publishes: the 5% pool cap, the 20% treasury cap, the
 * fee floor a spread has to clear, and — most importantly — the things the mandate
 * must refuse. A simulated ledger that could be made to show a trade in a dust pool
 * or a stock-against-stock pair would be worse than no ledger at all.
 */

const MIN_TURNOVER = 0.1;
const MAX_POOL_SHARE = 0.05;
const MAX_TREASURY_SHARE = 0.2;
const FEE_BPS_PER_LEG = 30;
const DUST_USD = 3_000;
const PERMITTED = new Set(['USDG', 'WETH', 'ETH']);

function tradeable(p) {
  if (p.liquidityUsd < DUST_USD) return false;
  if (!PERMITTED.has(p.quote.toUpperCase())) return false;
  if (p.volume24hUsd !== undefined && p.volume24hUsd < p.liquidityUsd * MIN_TURNOVER) return false;
  return true;
}

function evaluate(symbol, pools, treasuryUsd) {
  const live = pools.filter(tradeable);
  if (live.length < 2) return { symbol, signal: null, reason: live.length === 0 ? 'none' : 'one' };
  const sorted = [...live].sort((a, b) => a.price - b.price);
  const buy = sorted[0], sell = sorted[sorted.length - 1];
  const spreadBps = (sell.price / buy.price - 1) * 10_000;
  const rt = FEE_BPS_PER_LEG * 2;
  if (spreadBps <= rt) return { symbol, signal: null, reason: 'fees' };
  const poolCap = Math.min(buy.liquidityUsd, sell.liquidityUsd) * MAX_POOL_SHARE;
  const treasuryCap = treasuryUsd * MAX_TREASURY_SHARE;
  const sizeUsd = Math.min(poolCap, treasuryCap);
  if (sizeUsd <= 0) return { symbol, signal: null, reason: 'zero' };
  const grossUsd = sizeUsd * (spreadBps / 10_000);
  const feesUsd = sizeUsd * (rt / 10_000);
  return {
    symbol,
    signal: { buy, sell, spreadBps, sizeUsd, boundBy: poolCap <= treasuryCap ? 'pool' : 'treasury', grossUsd, feesUsd, netUsd: grossUsd - feesUsd },
    reason: null,
  };
}

const pool = (price, liquidityUsd, quote = 'USDG', volume24hUsd) => ({
  price, liquidityUsd, quote, dex: 'uniswap', version: 'v4',
  volume24hUsd: volume24hUsd ?? liquidityUsd, // active by default
});

/* ------------------------------------------------------------- refusals ---- */

test('mandate: a dust pool is never traded, however wide the gap', () => {
  const r = evaluate('X', [pool(100, 50_000), pool(130, 2_999)], 50_000);
  assert.equal(r.signal, null);
});

test('mandate: a stock-against-stock pair is not a permitted quote', () => {
  // The outliers in the readout are almost all these. The mandate must not chase them.
  const r = evaluate('X', [pool(100, 50_000, 'USDG'), pool(130, 50_000, 'TSLA')], 50_000);
  assert.equal(r.signal, null);
});

test('mandate: a deep but dormant pool is ignored — the TSLA artifact', () => {
  // $418,744 held, $8,835 traded: 2% turnover. Ranking on size alone would trade it.
  const r = evaluate('TSLA', [pool(383, 100_000), pool(356.24, 418_744, 'USDG', 8_835)], 50_000);
  assert.equal(r.signal, null);
});

test('mandate: a spread inside the fee round trip is not a trade', () => {
  // 50 bps apart, 60 bps round trip at the assumed tier.
  const r = evaluate('X', [pool(100, 50_000), pool(100.5, 50_000)], 50_000);
  assert.equal(r.signal, null);
  assert.equal(r.reason, 'fees');
});

test('mandate: zero treasury sizes to zero and says so', () => {
  const r = evaluate('X', [pool(100, 50_000), pool(105, 50_000)], 0);
  assert.equal(r.signal, null);
  assert.equal(r.reason, 'zero');
});

/* --------------------------------------------------------------- sizing ---- */

test('mandate: size is 5% of the shallower pool when that binds', () => {
  const r = evaluate('X', [pool(100, 20_000), pool(105, 200_000)], 1_000_000);
  assert.ok(r.signal);
  assert.equal(r.signal.sizeUsd, 1_000); // 5% of $20,000, not of $200,000
  assert.equal(r.signal.boundBy, 'pool');
});

test('mandate: size is 20% of the treasury when that binds', () => {
  const r = evaluate('X', [pool(100, 500_000), pool(105, 500_000)], 10_000);
  assert.ok(r.signal);
  assert.equal(r.signal.sizeUsd, 2_000); // 20% of $10,000; the pool cap would allow $25,000
  assert.equal(r.signal.boundBy, 'treasury');
});

/* ----------------------------------------------------------- arithmetic ---- */

test('mandate: gross, fees and net are the published arithmetic at quote', () => {
  // 5% gap, $1,000 position: gross $50, two 30 bps legs = $6, net $44.
  const r = evaluate('X', [pool(100, 20_000), pool(105, 20_000)], 1_000_000);
  assert.ok(r.signal);
  assert.ok(Math.abs(r.signal.spreadBps - 500) < 1e-6);
  assert.ok(Math.abs(r.signal.grossUsd - 50) < 1e-6);
  assert.ok(Math.abs(r.signal.feesUsd - 6) < 1e-6);
  assert.ok(Math.abs(r.signal.netUsd - 44) < 1e-6);
});

test('mandate: buys the cheapest and sells the dearest of the tradeable set only', () => {
  // A dearer stock-quoted pool exists but must not become the sell leg.
  const r = evaluate('X', [pool(100, 50_000), pool(104, 50_000), pool(140, 50_000, 'NVDA')], 50_000);
  assert.ok(r.signal);
  assert.equal(r.signal.sell.price, 104);
});
