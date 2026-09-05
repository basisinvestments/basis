import 'server-only';

import type { CorporateAction } from '../types';

/**
 * Robinhood Assets (Jersey) public REST API — reference prices, ERC-8056 multipliers
 * and the corporate-action calendar. Keyless, 60 req/s, base https://api.robinhood.com/rhj/
 *
 * SERVER ONLY, and not by preference. Verified 2026-09-03: this API returns no
 * `access-control-allow-origin` header, so a browser cannot call it at all. Every
 * reference price on the site has to be fetched here and rendered server-side. The
 * `server-only` import above turns an accidental client import into a build error
 * rather than a runtime mystery.
 *
 * The trap this module exists to prevent: `/prices` returns the RAW underlying equity
 * bid and ask. It is NOT multiplier-adjusted. Applying `currentMultiplier` from
 * `/assets` is mandatory — see lib/basis.ts, which is the only place that happens.
 */

const BASE = 'https://api.robinhood.com/rhj';

function revalidate(): number {
  const n = Number(process.env.BASIS_REVALIDATE_SECONDS);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

export function offline(): boolean {
  return process.env.BASIS_OFFLINE === '1';
}

async function get<T>(path: string, timeoutMs = 8000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: ctl.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: revalidate() },
    });
    if (!res.ok) throw new Error(`rhj ${path} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- prices */

interface RhjQuote {
  tokenSymbol: string;
  bid: string;
  ask: string;
  currency: string;
  isTradingHalt: boolean;
  generatedAt: string;
  dailyTradingVolume?: string;
}

export interface Quote {
  symbol: string;
  bid: number;
  ask: number;
  halted: boolean;
  generatedAt: string;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const data = await get<{ quotes: RhjQuote[] }>(`/prices/${encodeURIComponent(symbol)}`);
  const q = data.quotes?.[0];
  if (!q) throw new Error(`rhj returned no quote for ${symbol}`);
  return {
    symbol: q.tokenSymbol,
    bid: Number(q.bid),
    ask: Number(q.ask),
    halted: Boolean(q.isTradingHalt),
    generatedAt: q.generatedAt,
  };
}

/* ------------------------------------------------------------ multipliers */

interface RhjAsset {
  tokenSymbol: string;
  tokenName: string;
  currentMultiplier: string;
  pendingMultiplier?: string;
  pendingMultiplierEffectiveTime?: string;
  status?: string;
  deployments?: Array<{ contractAddress: string; chainId: number; networkName?: string }>;
}

export interface AssetMeta {
  symbol: string;
  name: string;
  multiplier: number;
  pendingMultiplier: number | null;
  pendingEffectiveAt: string | null;
  address: string | null;
}

/**
 * One call returns all ~194 assets (about 150KB); the endpoint rejects query
 * parameters, so there is no way to ask for a subset. Fetch once, index by symbol.
 *
 * Schema drift seen in the wild: `deployments[].networkName` was an empty string on
 * 2026-09-02 and populated with "Robinhood Chain" by 2026-09-03. Nothing here depends
 * on it — the canonical address comes from our own registry, not from this response.
 */
export async function fetchAssets(): Promise<Map<string, AssetMeta>> {
  const data = await get<{ assets: RhjAsset[] }>('/assets', 12_000);
  const map = new Map<string, AssetMeta>();
  for (const a of data.assets ?? []) {
    const dep = a.deployments?.find((d) => d.chainId === 4663) ?? a.deployments?.[0];
    map.set(a.tokenSymbol, {
      symbol: a.tokenSymbol,
      name: a.tokenName,
      multiplier: Number(a.currentMultiplier) || 1,
      pendingMultiplier: a.pendingMultiplier ? Number(a.pendingMultiplier) : null,
      pendingEffectiveAt: a.pendingMultiplierEffectiveTime ?? null,
      address: dep?.contractAddress ?? null,
    });
  }
  return map;
}

/* ------------------------------------------------------ corporate actions */

interface RhjAction {
  tokenSymbol: string;
  type: string;
  status: string;
  processDate?: { year: number; month: number; day: number };
  details?: Record<string, { underlyingSymbol?: string; rate?: string; newRate?: string }>;
}

export async function fetchCorporateActions(): Promise<CorporateAction[]> {
  const data = await get<{ corpActions: RhjAction[] }>('/corporate-actions', 10_000);
  return (data.corpActions ?? []).map((a) => {
    const key = a.details ? Object.keys(a.details)[0] : undefined;
    const d = key && a.details ? a.details[key] : undefined;
    return {
      symbol: a.tokenSymbol,
      type: a.type.replace('CORPORATE_ACTION_TYPE_', ''),
      status: a.status.replace('CORPORATE_ACTION_STATUS_', ''),
      date: a.processDate
        ? `${a.processDate.year}-${String(a.processDate.month).padStart(2, '0')}-${String(a.processDate.day).padStart(2, '0')}`
        : null,
      rate: d?.rate ?? d?.newRate ?? null,
      underlying: d?.underlyingSymbol ?? null,
    };
  });
}

/**
 * Symbols with an action genuinely *in flight* — these flag ACTION.
 *
 * `IN_PROGRESS` alone is far too broad: it means "scheduled and not yet completed",
 * which on 2026-09-03 included an NVDA dividend dated 1 October. Flagging that a
 * month early would tell a reader the price is untrustworthy when it is fine, and a
 * flag that cries wolf is worse than no flag.
 *
 * Two things actually indicate an imminent change:
 *   1. a multiplier already staged on the token — the strongest signal, because the
 *      oracle pauses around it; and
 *   2. a processDate within the window below.
 */
const ACTION_WINDOW_DAYS = 2;

export function pendingActionSymbols(
  actions: CorporateAction[],
  assets?: Map<string, AssetMeta>,
  now: Date = new Date(),
): Set<string> {
  const out = new Set<string>();

  if (assets) {
    for (const [symbol, meta] of assets) {
      if (meta.pendingMultiplier !== null) out.add(symbol);
    }
  }

  const horizon = now.getTime() + ACTION_WINDOW_DAYS * 86_400_000;
  for (const a of actions) {
    if (a.status !== 'IN_PROGRESS' || !a.date) continue;
    const when = Date.parse(`${a.date}T00:00:00Z`);
    if (Number.isFinite(when) && when <= horizon) out.add(a.symbol);
  }

  return out;
}
