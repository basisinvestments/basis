import { NextResponse } from 'next/server';
import { getReadings } from '@/lib/readings';
import { featuredSymbols } from '@/lib/registry';

/**
 * GET /v1/basis — every tracked token, current reading.
 * ?symbols=NVDA,SPY  restricts the set. ?featured=1 returns the landing-page subset.
 */
export const revalidate = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbolsParam = url.searchParams.get('symbols');
  const featured = url.searchParams.get('featured') === '1';

  const symbols = symbolsParam
    ? symbolsParam.split(',').map((s) => s.trim().toUpperCase())
    : featured
      ? featuredSymbols()
      : undefined;

  const result = await getReadings({ symbols });
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  });
}
