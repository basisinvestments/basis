import { NextResponse } from 'next/server';
import { getReadings } from '@/lib/readings';

/**
 * GET /v1/board — every token ranked by pool-to-pool spread. The working list:
 * where the same asset wears two price tags at the same second.
 * ?min_spread_bps=400 filters to the flagged band.
 */
export const revalidate = 60;

export async function GET(request: Request) {
  const min = Number(new URL(request.url).searchParams.get('min_spread_bps') ?? 0);
  const { readings, session, asOf, health } = await getReadings();

  const board = readings
    .filter((r) => (r.spreadBps ?? 0) >= (Number.isFinite(min) ? min : 0))
    .sort((a, b) => (b.spreadBps ?? 0) - (a.spreadBps ?? 0))
    .map((r) => ({
      symbol: r.symbol,
      name: r.name,
      referencePrice: r.reference.price,
      cheapestPool: r.pool ? Math.min(...[r.pool.price]) : null,
      spreadBps: r.spreadBps,
      basisBps: r.basisBps,
      poolCount: r.poolCount,
      flag: r.flag,
      stale: r.stale,
    }));

  return NextResponse.json(
    { asOf, session, count: board.length, board, health },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}
