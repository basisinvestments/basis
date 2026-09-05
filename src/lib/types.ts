/**
 * The shapes the whole product agrees on. If a number appears on screen or in the
 * API, it came through one of these — and it carries its provenance with it.
 */

/** Market session for the underlying US equity, in Eastern time. */
export type SessionState = 'pre' | 'regular' | 'post' | 'overnight' | 'closed';

/**
 * DARK outranks everything. If the reference is stale or the market is shut, no
 * claim about the gap can be made — it is unmeasurable, not zero.
 */
export type Flag = 'TIGHT' | 'WATCH' | 'WIDE' | 'DARK' | 'ACTION';

/** Where a number came from. Drives colour: ref is amber, pool is ice blue. */
export type Source = 'ref' | 'pool' | 'oracle';

export interface Pool {
  /** Price of one Stock Token in USD, as the pool last traded it. */
  price: number;
  /** The other side of the pair — USDG, WETH, or another Stock Token. */
  quote: string;
  /** uniswap, ramses, giga, up, alandale … */
  dex: string;
  /** v3 | v4 | '' */
  version: string;
  /** Total value locked in USD. Not the same as executable depth — see docs/product.md. */
  liquidityUsd: number;
  /** 24h volume in USD, when the index reports it. */
  volume24hUsd?: number;
  pairId?: string;
  url?: string;
}

export interface Reference {
  /** mid x multiplier. This is what a Stock Token should be worth. */
  price: number;
  /** Raw underlying equity mid, before the multiplier. Never compare a pool to this. */
  mid: number;
  bid: number;
  ask: number;
  /** ERC-8056 shares-per-token. CRWD sat at 4.0 after a split. */
  multiplier: number;
  halted: boolean;
  /** When the upstream generated the quote. */
  generatedAt: string;
  ageSeconds: number;
  source: 'rhj' | 'fallback';
}

export interface Reading {
  symbol: string;
  name: string;
  address: string;
  asOf: string;
  reference: Reference;
  /** Deepest pool by TVL. The one a naive router is most likely to hit. */
  pool: Pool | null;
  poolCount: number;
  /** Deepest pool against the reference, in basis points. */
  basisBps: number | null;
  /** Cheapest pool against dearest, in basis points. Pools disagreeing with each other. */
  spreadBps: number | null;
  flag: Flag;
  session: SessionState;
  /** True when this row came from the stored capture rather than a live call. */
  stale: boolean;
  /** Set when a source failed, so the page can say why rather than hiding it. */
  degraded?: string;
}

export interface CorporateAction {
  symbol: string;
  type: string;
  status: string;
  date: string | null;
  rate: string | null;
  underlying: string | null;
}

export interface SourceHealth {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
}

export interface ReadingsResult {
  readings: Reading[];
  session: SessionState;
  asOf: string;
  health: SourceHealth[];
  /** True when every row fell back. The page says so rather than pretending. */
  allStale: boolean;
}
