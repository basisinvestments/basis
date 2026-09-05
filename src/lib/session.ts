import type { SessionState } from './types';

/**
 * NYSE session engine. Pure, no I/O, runs identically on the server and in the
 * browser — which matters because the server renders the first paint and a client
 * island then keeps the clock ticking. If the two disagreed, the page would flicker.
 *
 * Boundaries (Eastern time):
 *   04:00–09:30  pre
 *   09:30–16:00  regular
 *   16:00–20:00  post
 *   20:00–04:00  overnight   (weeknights only)
 *   Fri 20:00 → Sun 20:00    closed — the reference freezes for ~48 hours
 *
 * Verified against the boundary table in src/lib/session.test.mjs.
 */

/** US exchange holidays. The reference freezes on these exactly as on a weekend. */
export const MARKET_HOLIDAYS = new Set([
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
  '2027-01-01', // New Year's Day
  '2027-01-18', // MLK Day
  '2027-02-15', // Washington's Birthday
]);

export interface EtParts {
  weekday: number; // 0 Sun … 6 Sat
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** YYYY-MM-DD in Eastern time, for holiday lookup. */
  key: string;
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Decompose an instant into Eastern-time parts. Uses Intl rather than a fixed UTC
 * offset so daylight saving is handled by the platform database, not by us.
 */
export function etParts(d: Date = new Date()): EtParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  // Some engines render midnight as hour "24"; normalise it.
  const hour = Number(parts.hour ?? '0') % 24;
  const year = Number(parts.year ?? '0');
  const month = Number(parts.month ?? '0');
  const day = Number(parts.day ?? '0');
  return {
    weekday: WD[parts.weekday ?? 'Sun'] ?? 0,
    year,
    month,
    day,
    hour,
    minute: Number(parts.minute ?? '0'),
    second: Number(parts.second ?? '0'),
    key: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function sessionFromParts(p: EtParts): SessionState {
  const mins = p.hour * 60 + p.minute;
  const holiday = MARKET_HOLIDAYS.has(p.key);

  if (p.weekday === 6) return 'closed'; // Saturday
  if (p.weekday === 0) return mins >= 20 * 60 ? 'overnight' : 'closed'; // Sunday reopens 20:00
  if (holiday) return 'closed';
  if (p.weekday === 5 && mins >= 20 * 60) return 'closed'; // Friday close
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'regular';
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'pre';
  if (mins >= 16 * 60 && mins < 20 * 60) return 'post';
  return 'overnight';
}

export function currentSession(d: Date = new Date()): SessionState {
  return sessionFromParts(etParts(d));
}

export const SESSION_LABEL: Record<SessionState, string> = {
  pre: 'Pre-market · reference thin',
  regular: 'Regular session · reference live',
  post: 'Post-market · reference thin',
  overnight: 'Overnight session · reference thin',
  closed: 'Market closed · reference frozen',
};

/**
 * When the reference last stopped moving: the most recent weekday 20:00 ET that has
 * already passed and was not a holiday. The hero counts up from this while closed.
 */
export function freezeStartMs(now: Date = new Date()): number {
  for (let i = 0; i < 9; i++) {
    const candidate = new Date(now.getTime() - i * 86_400_000);
    const p = etParts(candidate);
    if (p.weekday >= 1 && p.weekday <= 5 && !MARKET_HOLIDAYS.has(p.key)) {
      const secsIntoDay = p.hour * 3600 + p.minute * 60 + p.second;
      const ms = candidate.getTime() - (secsIntoDay - 20 * 3600) * 1000;
      if (ms <= now.getTime()) return ms;
    }
  }
  return now.getTime();
}

/** Next session boundary, so the API can tell a consumer when to look again. */
export function nextTransition(now: Date = new Date()): string {
  const p = etParts(now);
  const mins = p.hour * 60 + p.minute;
  const marks = [4 * 60, 9 * 60 + 30, 16 * 60, 20 * 60];
  const next = marks.find((m) => m > mins);
  const deltaMin = next !== undefined ? next - mins : 24 * 60 - mins + marks[0]!;
  return new Date(now.getTime() + deltaMin * 60_000 - p.second * 1000).toISOString();
}
