import 'server-only';

import { basisBps, deepestPool, flagFor, makeReference, spreadBps } from './basis';
import { CAPTURE_ISO, FALLBACK } from './fallback';
import { allSymbols, resolve } from './registry';
import { currentSession } from './session';
import { fetchPools } from './sources/dexscreener';
import { fetchAssets, fetchCorporateActions, fetchQuote, offline, pendingActionSymbols } from './sources/rhj';
import type { Reading, ReadingsResult, SourceHealth } from './types';

/**
 * The single place a Reading is assembled.
 *
 * Both the landing page and every /api/v1 route call this, so the page and the API
 * can never disagree about a number — which would be the fastest way to lose the
 * credibility the whole product is built on.
 *
 * Degradation is explicit, never silent. If a source fails, the affected rows come
 * from the stored capture, are marked `stale`, and flag DARK. The UI then says so.
 */

async function timed<T>(name: string, fn: () => Promise<T>): Promise<[T | null, SourceHealth]> {
  const t0 = Date.now();
  try {
    const value = await fn();
    return [value, { name, ok: true, ms: Date.now() - t0 }];
  } catch (err) {
    return [
      null,
      { name, ok: false, ms: Date.now() - t0, detail: err instanceof Error ? err.message : String(err) },
    ];
  }
}

function fallbackReading(symbol: string, session: ReturnType<typeof currentSession>, why: string): Reading | null {
  const meta = resolve(symbol);
  const fb = FALLBACK[symbol];
  if (!meta || !fb) return null;

  const reference = makeReference(fb.mid, fb.mid, fb.multiplier, CAPTURE_ISO, false, 'fallback');
  const pool = deepestPool(fb.pools);
  return {
    symbol: meta.symbol,
    name: meta.name,
    address: meta.address,
    asOf: CAPTURE_ISO,
    reference,
    pool,
    poolCount: fb.pools.length,
    basisBps: pool ? basisBps(pool.price, reference.price) : null,
    spreadBps: spreadBps(fb.pools),
    // A stored capture can never be TIGHT. It is DARK by construction.
    flag: 'DARK',
    session,
    stale: true,
    degraded: why,
  };
}

export interface GetReadingsOptions {
  symbols?: string[];
  /** Include the full pool ladder per symbol. The board and table need it; a summary does not. */
  withPools?: boolean;
}

export async function getReadings(opts: GetReadingsOptions = {}): Promise<ReadingsResult> {
  const symbols = (opts.symbols ?? allSymbols()).filter((s) => resolve(s));
  const now = new Date();
  const session = currentSession(now);
  const health: SourceHealth[] = [];

  if (offline()) {
    const readings = symbols
      .map((s) => fallbackReading(s, session, 'BASIS_OFFLINE=1'))
      .filter((r): r is Reading => r !== null);
    return {
      readings,
      session,
      asOf: CAPTURE_ISO,
      health: [{ name: 'offline', ok: true, ms: 0, detail: 'forced fallback' }],
      allStale: true,
    };
  }

  const [assets, assetsHealth] = await timed('rhj/assets', fetchAssets);
  health.push(assetsHealth);
  const [actions, actionsHealth] = await timed('rhj/corporate-actions', fetchCorporateActions);
  health.push(actionsHealth);
  // Imminent only — a staged multiplier, or a process date inside the window.
  const pending = pendingActionSymbols(actions ?? [], assets ?? undefined, now);

  const readings = await Promise.all(
    symbols.map(async (symbol): Promise<Reading | null> => {
      const meta = resolve(symbol);
      if (!meta) return null;

      const [quote, pools] = await Promise.all([
        fetchQuote(symbol).catch(() => null),
        fetchPools(meta.address).catch(() => null),
      ]);

      // Without a live reference there is nothing to measure against.
      if (!quote || !pools || pools.length === 0) {
        const why = !quote ? 'reference unavailable' : 'pool index unavailable';
        return fallbackReading(symbol, session, why);
      }

      const multiplier = assets?.get(symbol)?.multiplier ?? 1;
      const reference = makeReference(
        quote.bid,
        quote.ask,
        multiplier,
        quote.generatedAt,
        quote.halted,
        'rhj',
        now,
      );
      const pool = deepestPool(pools);
      const basis = pool ? basisBps(pool.price, reference.price) : null;

      return {
        symbol: meta.symbol,
        name: meta.name,
        address: meta.address,
        asOf: now.toISOString(),
        reference,
        pool,
        poolCount: pools.length,
        basisBps: basis,
        spreadBps: spreadBps(pools),
        flag: flagFor({
          basis,
          session,
          referenceAgeSeconds: reference.ageSeconds,
          stale: false,
          corporateActionPending: pending.has(symbol),
        }),
        session,
        stale: false,
      };
    }),
  );

  const rows = readings.filter((r): r is Reading => r !== null);
  return {
    readings: rows,
    session,
    asOf: now.toISOString(),
    health,
    allStale: rows.length > 0 && rows.every((r) => r.stale),
  };
}

/** One symbol with its full ladder — used by the hero, the row expander and /api/v1/pools. */
export async function getPools(symbol: string) {
  const meta = resolve(symbol);
  if (!meta) return null;

  if (offline()) {
    const fb = FALLBACK[meta.symbol];
    return fb ? { ...meta, pools: fb.pools, stale: true, asOf: CAPTURE_ISO } : null;
  }

  try {
    const pools = await fetchPools(meta.address);
    if (!pools.length) throw new Error('no qualifying pools');
    return { ...meta, pools, stale: false, asOf: new Date().toISOString() };
  } catch {
    const fb = FALLBACK[meta.symbol];
    return fb ? { ...meta, pools: fb.pools, stale: true, asOf: CAPTURE_ISO } : null;
  }
}

export { getCorporateActions };

async function getCorporateActions() {
  if (offline()) return [];
  try {
    return await fetchCorporateActions();
  } catch {
    return [];
  }
}
