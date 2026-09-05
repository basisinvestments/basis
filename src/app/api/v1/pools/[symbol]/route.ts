import { NextResponse } from 'next/server';
import { getPools } from '@/lib/readings';
import { resolve } from '@/lib/registry';
import { MIN_POOL_USD } from '@/lib/sources/dexscreener';

/**
 * GET /v1/pools/{symbol} — every pool holding the token as base, cheapest first.
 * TVL is reported, not executable depth. These are concentrated-liquidity pools.
 */
export const revalidate = 60;

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  if (!resolve(symbol)) {
    return NextResponse.json(
      { error: { code: 'unknown_symbol', message: 'Not a canonical Stock Token.' } },
      { status: 400 },
    );
  }

  const data = await getPools(symbol);
  if (!data) {
    return NextResponse.json(
      { error: { code: 'no_pools', message: 'No qualifying pools found for this symbol.' } },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      symbol: data.symbol,
      name: data.name,
      address: data.address,
      asOf: data.asOf,
      stale: data.stale,
      minPoolUsd: MIN_POOL_USD,
      note: 'liquidityUsd is TVL, not executable depth. Concentrated liquidity means the quoted price is the top of book.',
      pools: data.pools,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}
