import { NextResponse } from 'next/server';
import { getReadings } from '@/lib/readings';
import { resolve } from '@/lib/registry';

/** GET /v1/basis/{symbol} — one token. 400 if it is not a canonical Stock Token. */
export const revalidate = 60;

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  const meta = resolve(symbol);
  if (!meta) {
    return NextResponse.json(
      {
        error: {
          code: 'unknown_symbol',
          message:
            'Not a canonical Stock Token. A matching ticker at a different address is not the same asset — check /v1/basis for the tracked list.',
        },
      },
      { status: 400 },
    );
  }

  const result = await getReadings({ symbols: [meta.symbol] });
  const reading = result.readings[0];
  if (!reading) {
    return NextResponse.json(
      { error: { code: 'no_reading', message: 'No reading could be assembled for this symbol.' } },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { ...reading, health: result.health },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}
