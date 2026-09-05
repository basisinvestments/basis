import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure-logic checks, mirrored from src/lib/session.ts and src/lib/basis.ts.
 *
 * These are kept as plain .mjs so `node --test` runs them with no build step and no
 * test framework. They cover the two things that would be genuinely damaging to get
 * wrong: the session boundaries that decide whether a reading is trustworthy at all,
 * and the multiplier that decides whether a number is real.
 */

/* ------------------------------------------------------------ session ---- */

const HOLIDAYS = new Set(['2026-09-07', '2026-11-26', '2026-12-25', '2027-01-01']);

function sessionFromParts(p) {
  const mins = p.hour * 60 + p.minute;
  const holiday = HOLIDAYS.has(p.key);
  if (p.weekday === 6) return 'closed';
  if (p.weekday === 0) return mins >= 20 * 60 ? 'overnight' : 'closed';
  if (holiday) return 'closed';
  if (p.weekday === 5 && mins >= 20 * 60) return 'closed';
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'regular';
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'pre';
  if (mins >= 16 * 60 && mins < 20 * 60) return 'post';
  return 'overnight';
}

const P = (weekday, hour, minute, key = '2026-09-02') => ({ weekday, hour, minute, key });

test('session: regular hours', () => {
  assert.equal(sessionFromParts(P(2, 14, 0)), 'regular');
  assert.equal(sessionFromParts(P(2, 9, 30)), 'regular', 'opens exactly at 09:30');
  assert.equal(sessionFromParts(P(2, 15, 59)), 'regular');
});

test('session: pre and post', () => {
  assert.equal(sessionFromParts(P(2, 8, 0)), 'pre');
  assert.equal(sessionFromParts(P(2, 4, 0)), 'pre', 'pre opens at 04:00');
  assert.equal(sessionFromParts(P(2, 3, 59)), 'overnight', 'still overnight one minute before');
  assert.equal(sessionFromParts(P(2, 17, 30)), 'post');
  assert.equal(sessionFromParts(P(2, 16, 0)), 'post', 'post starts the second regular ends');
});

test('session: the Friday close is the boundary that matters', () => {
  assert.equal(sessionFromParts(P(5, 19, 59)), 'post');
  assert.equal(sessionFromParts(P(5, 20, 1)), 'closed', 'reference freezes here for ~48h');
});

test('session: the weekend stays closed until Sunday 20:00', () => {
  assert.equal(sessionFromParts(P(6, 12, 0)), 'closed');
  assert.equal(sessionFromParts(P(0, 19, 59)), 'closed');
  assert.equal(sessionFromParts(P(0, 20, 1)), 'overnight', 'Sunday overnight reopens');
});

test('session: an exchange holiday reads closed all day', () => {
  assert.equal(sessionFromParts(P(1, 14, 0, '2026-09-07')), 'closed', 'Labor Day');
  assert.equal(sessionFromParts(P(1, 14, 0, '2026-09-14')), 'regular', 'the Monday after is not');
});

/* -------------------------------------------------------------- basis ---- */

const BPS = 10000;
const basisBps = (pool, ref) => Math.round((pool / ref - 1) * BPS);
const referencePrice = (mid, mult) => mid * mult;

function flagFor({ basis, session, referenceAgeSeconds, stale, corporateActionPending }) {
  if (corporateActionPending) return 'ACTION';
  if (session === 'closed' || stale || referenceAgeSeconds > 900 || basis === null) return 'DARK';
  const a = Math.abs(basis);
  if (a >= 200) return 'WIDE';
  if (a >= 100) return 'WATCH';
  return 'TIGHT';
}

test('basis: the CrowdStrike multiplier trap', () => {
  // Captured 2026-09-02: CRWD carried a x4.0 multiplier after a split.
  const mid = 203.58;
  const multiplier = 4;
  const pool = 787.52;

  const naive = basisBps(pool, mid);
  assert.ok(naive > 28000, `naive comparison prints a fake premium: ${naive} bps`);

  const correct = basisBps(pool, referencePrice(mid, multiplier));
  assert.equal(correct, -329, 'multiplier-adjusted, it is a 3.29% discount');
});

test('basis: a normal reading', () => {
  // NVDA, 2026-09-02 18:33 UTC: deepest pool 225.07 against a 225.03 reference.
  assert.equal(basisBps(225.07, 225.03), 2);
});

test('flag: DARK outranks every numeric band', () => {
  const tight = { basis: 2, session: 'regular', referenceAgeSeconds: 5, stale: false };
  assert.equal(flagFor(tight), 'TIGHT');

  assert.equal(flagFor({ ...tight, session: 'closed' }), 'DARK', 'cannot be tight when shut');
  assert.equal(flagFor({ ...tight, stale: true }), 'DARK', 'cannot be tight from a capture');
  assert.equal(flagFor({ ...tight, referenceAgeSeconds: 901 }), 'DARK', 'cannot be tight when stale');
});

test('flag: bands and corporate actions', () => {
  const base = { session: 'regular', referenceAgeSeconds: 5, stale: false };
  assert.equal(flagFor({ ...base, basis: 99 }), 'TIGHT');
  assert.equal(flagFor({ ...base, basis: 100 }), 'WATCH');
  assert.equal(flagFor({ ...base, basis: -217 }), 'WIDE', 'sign does not matter, distance does');
  assert.equal(flagFor({ ...base, basis: 2, corporateActionPending: true }), 'ACTION');
});

/* ---------------------------------------------------------- execution ---- */

function executionQuote(pools, notional) {
  const sorted = [...pools].sort((a, b) => a.price - b.price);
  const deep = sorted.filter((p) => p.liquidityUsd >= notional * 4);
  const thin = deep.length === 0;
  const best = (thin ? sorted : deep)[0];
  const worst = sorted[sorted.length - 1];
  const tokens = notional / best.price;
  const costAtWorst = tokens * worst.price;
  return { best, worst, tokens, differenceUsd: costAtWorst - notional, thin };
}

test('execution: the NVDA $25k figure, independently verified', () => {
  const pools = [
    { price: 216.03, liquidityUsd: 448709 },
    { price: 225.07, liquidityUsd: 6089856 },
    { price: 228.36, liquidityUsd: 423299 },
  ];
  const q = executionQuote(pools, 25000);
  assert.equal(q.best.price, 216.03);
  assert.equal(q.worst.price, 228.36);
  assert.equal(Math.round(q.differenceUsd), 1427, 'the headline overpayment figure');
});

test('execution: a pool must hold four times the order to qualify', () => {
  const pools = [
    { price: 100, liquidityUsd: 1000 },   // too thin for a 25k order
    { price: 110, liquidityUsd: 500000 },
  ];
  const ok = executionQuote(pools, 25000);
  assert.equal(ok.best.price, 110, 'skips the cheap pool it cannot actually use');
  assert.equal(ok.thin, false);

  const thin = executionQuote(pools, 1_000_000);
  assert.equal(thin.thin, true, 'nothing holds 4x a million');
});

/* ----------------------------------------------------------- formatting -- */

const depth = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${Math.round(n)}`);
const dollars = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

test('format: the two money formatters are not interchangeable', () => {
  assert.equal(depth(6089856), '$6.09M', 'depth is approximate on purpose');
  assert.equal(depth(1427), '$1k', 'which is why it must never format money you pay');
  assert.equal(dollars(1427), '$1,427', 'the overpayment figure needs to be exact');
});

/* ------------------------------------------------- pool selection ---- */

const MIN_TURNOVER = 0.1;

function deepestPool(pools) {
  if (!pools.length) return null;
  const active = pools.filter(
    (p) => p.volume24hUsd !== undefined && p.volume24hUsd >= p.liquidityUsd * MIN_TURNOVER,
  );
  return (active.length ? active : pools).reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a));
}

test('pool selection: a deep pool nobody trades is not the reference pool', () => {
  // Observed live 2026-09-03. The largest TSLA pool by TVL had 2% turnover and
  // quoted 356.24 while every actively traded pool sat at 382-384.
  const pools = [
    { price: 356.24, liquidityUsd: 418744, volume24hUsd: 8835 },     // deepest, dormant
    { price: 382.20, liquidityUsd: 416300, volume24hUsd: 1791342 },  // the real market
    { price: 358.56, liquidityUsd: 415950, volume24hUsd: 6165 },
    { price: 383.81, liquidityUsd: 273767, volume24hUsd: 1062704 },
  ];
  const chosen = deepestPool(pools);
  assert.equal(chosen.price, 382.2, 'picks the deepest pool that actually trades');

  const reference = 383.29;
  assert.equal(basisBps(chosen.price, reference), -28, 'a real reading, not a -706 bps artifact');
  assert.equal(basisBps(356.24, reference), -706, 'what ranking on TVL alone would have printed');
});

test('pool selection: falls back to depth when no pool reports volume', () => {
  // The stored capture carries no volume figures - it must still resolve.
  const pools = [
    { price: 100, liquidityUsd: 5000 },
    { price: 101, liquidityUsd: 90000 },
  ];
  assert.equal(deepestPool(pools).liquidityUsd, 90000);
});

test('pool selection: empty in, null out', () => {
  assert.equal(deepestPool([]), null);
});
