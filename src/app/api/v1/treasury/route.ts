import { NextResponse } from 'next/server';
import { assembleTreasury } from '@/lib/treasury-assemble';

/**
 * GET /v1/treasury — the balance from chain, what the mandate would do right now,
 * and the ledger of what it has seen.
 *
 * Every call records the current minute into the ledger, idempotently, so any
 * reader — a visitor, the scheduled tick, a curl — adds to the record rather than
 * only reading it. The scheduled function exists so it also fills when nobody is
 * watching.
 *
 * Everything under `simulated` is a signal at quoted prices, not a fill. The
 * response says so in its own shape, not only in the page that renders it.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const t0 = Date.now();
  const n = Math.min(Math.max(Number(new URL(req.url).searchParams.get('tail') ?? 120), 1), 1440);
  const view = await assembleTreasury(n);
  return NextResponse.json(
    { ...view, assembledInMs: Date.now() - t0 },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
