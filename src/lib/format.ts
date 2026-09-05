/**
 * Two money formatters, deliberately.
 *
 * `depth()` is lossy on purpose — pool TVL reads better as "$6.09M" or "$449k" than
 * as an exact figure nobody will check. `dollars()` is exact, and is used for money
 * a person actually pays.
 *
 * They are separate because using the lossy one for the headline overpayment figure
 * rendered $1,427 as "$1k" during the concept build. Depth is an approximation of
 * someone else's liquidity; the difference on your order is not.
 */

/** Approximate — pool depth, TVL, volume. */
export function depth(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}k`;
  return `$${Math.round(n)}`;
}

/** Exact — money you pay. Never use depth() for this. */
export function dollars(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/** A price, always two decimals. */
export function usd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Gaps are signed and in basis points. Percentages only in prose. */
export function signed(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n}`;
}

export function pct(n: number, dp = 2): string {
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(dp)}%`;
}

/** Every figure carries a timestamp. A price without one is a bug. */
export function stampUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

export function dateStampUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${stampUtc(iso)}`;
}

export function ago(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 90) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
