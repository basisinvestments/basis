import { NextResponse } from 'next/server';
import { SESSION_LABEL, currentSession, etParts, freezeStartMs, nextTransition } from '@/lib/session';

/**
 * GET /v1/sessions — the state of the underlying US equity market.
 * Every reading depends on this: a 4% gap during a regular session and a 4% gap at
 * 03:00 on a Sunday are not the same event.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const state = currentSession(now);
  const p = etParts(now);

  return NextResponse.json(
    {
      asOf: now.toISOString(),
      state,
      label: SESSION_LABEL[state],
      easternTime: `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')}`,
      nextTransition: nextTransition(now),
      referenceFrozen: state === 'closed',
      frozenSince: state === 'closed' ? new Date(freezeStartMs(now)).toISOString() : null,
      note:
        state === 'closed'
          ? 'The reference is frozen. Chainlink tokenized-equity feeds hold their last value off-hours with no heartbeat, while every pool keeps trading.'
          : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
