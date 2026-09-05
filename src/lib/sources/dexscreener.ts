import type { Pool } from '../types';

/**
 * DEX Screener pair index — every pool holding a given token, with price and TVL.
 *
 * Unlike the reference API this one does send `access-control-allow-origin: *`, so a
 * browser could call it directly. We still go through the server so that a reading is
 * assembled in one place from both sources and cannot half-update.
 *
 * Two things this module is careful about:
 *
 * 1. Only pools where the Stock Token is the BASE side are ours. A pool listing
 *    CINEMA/AMC is a launchpad token quoted in AMC — its `priceUsd` is the price of
 *    CINEMA, not of AMC. Reading those by mistake produced prices like $0.0004 for a
 *    $2.60 token during the concept build.
 * 2. TVL is not depth. These are concentrated-liquidity pools; the reserve ratio does
 *    not give the price and the total does not give what you can execute. We surface
 *    TVL and label it as such — nothing here claims to be an executable quote.
 */

const BASE = 'https://api.dexscreener.com/latest/dex/tokens';

/** Below this a pool is noise — a few dollars of dust that distorts the spread. */
export const MIN_POOL_USD = 3000;

interface DsPair {
  chainId: string;
  dexId: string;
  labels?: string[];
  pairAddress: string;
  url?: string;
  baseToken: { address: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
}

function revalidate(): number {
  const n = Number(process.env.BASIS_REVALIDATE_SECONDS);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export async function fetchPools(address: string, timeoutMs = 8000): Promise<Pool[]> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/${address}`, {
      signal: ctl.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: revalidate() },
    });
    if (!res.ok) throw new Error(`dexscreener responded ${res.status}`);
    const data = (await res.json()) as { pairs: DsPair[] | null };
    const want = address.toLowerCase();

    const pools: Pool[] = (data.pairs ?? [])
      .filter((p) => p.baseToken?.address?.toLowerCase() === want)
      .filter((p) => (p.liquidity?.usd ?? 0) >= MIN_POOL_USD)
      .map((p) => ({
        price: Number(p.priceUsd ?? 0),
        quote: p.quoteToken?.symbol ?? '?',
        dex: p.dexId,
        version: p.labels?.[0] ?? '',
        liquidityUsd: Math.round(p.liquidity?.usd ?? 0),
        volume24hUsd: p.volume?.h24 !== undefined ? Math.round(p.volume.h24) : undefined,
        pairId: p.pairAddress,
        url: p.url,
      }))
      .filter((p) => p.price > 0)
      .sort((a, b) => a.price - b.price);

    return pools;
  } finally {
    clearTimeout(timer);
  }
}
