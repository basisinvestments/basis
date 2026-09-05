import { NextResponse } from 'next/server';
import { getReadings } from '@/lib/readings';
import { CAPTURE_ISO } from '@/lib/fallback';
import { interpreterConfig, interpreterConfigured } from '@/lib/interpret';

/**
 * GET /v1/status — upstream health and how much of the current response is live.
 * A feed claiming perfect uptime is a feed you should not read; this reports the
 * failures rather than hiding them.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const t0 = Date.now();
  const { readings, health, session, asOf, allStale } = await getReadings();
  const stale = readings.filter((r) => r.stale);

  return NextResponse.json(
    {
      ok: health.every((h) => h.ok) && !allStale,
      asOf,
      session,
      assembledInMs: Date.now() - t0,
      sources: health,
      rows: { total: readings.length, live: readings.length - stale.length, stale: stale.length },
      staleSymbols: stale.map((r) => ({ symbol: r.symbol, reason: r.degraded ?? 'unknown' })),
      fallbackCapture: CAPTURE_ISO,
      // Presence, never values. The interpreter is optional; when it is off, this
      // says which of its three settings the deployment is missing.
      interpreter: { configured: interpreterConfigured(), present: interpreterConfig() },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
