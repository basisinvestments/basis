import { depth, usd } from '@/lib/format';
import type { Pool } from '@/lib/types';

/**
 * Every pool at its price, cheapest to dearest, with the reference cutting through.
 *
 * The reference row is amber, has a taller tick and carries no depth figure — it is
 * not a pool, and showing a TVL next to it would imply you could trade against it.
 */
export function PriceLadder({
  symbol,
  pools,
  referencePrice,
  highlightBest,
  highlightWorst,
}: {
  symbol: string;
  pools: Pool[];
  referencePrice: number;
  highlightBest?: Pool | null;
  highlightWorst?: Pool | null;
}) {
  if (!pools.length) {
    return <p className="font-manrope text-[13px] text-white/45">No pools above the dust threshold.</p>;
  }

  const sorted = [...pools].sort((a, b) => a.price - b.price);
  const lo = sorted[0]!.price;
  const hi = sorted[sorted.length - 1]!.price;
  const span = hi - lo || 1;
  const deepest = sorted.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a));

  const rows = sorted.map((p, i) => {
    const isBest = highlightBest ? p === highlightBest : p.price === lo;
    const isWorst = highlightWorst ? p === highlightWorst : p.price === hi;
    const cls = isBest ? 'best' : isWorst ? 'worst' : '';
    return (
      <div className={`rung ${cls}`} key={`${p.pairId ?? p.dex}-${p.quote}-${i}`}>
        <span>{usd(p.price)}</span>
        <span className="bar">
          <i style={{ left: `calc(${(((p.price - lo) / span) * 100).toFixed(1)}% - 1px)` }} />
        </span>
        <span className="ven text-[11px] text-white/35">
          {p.dex} {p.version} {symbol}/{p.quote}
          {p === deepest ? ' · deepest' : ''}
        </span>
        <span className="text-right text-white/35">{depth(p.liquidityUsd)}</span>
      </div>
    );
  });

  const refIndex = sorted.filter((p) => p.price < referencePrice).length;
  const refLeft = Math.max(0, Math.min(100, ((referencePrice - lo) / span) * 100));
  rows.splice(
    refIndex,
    0,
    <div className="rung refrow" key="reference">
      <span>{usd(referencePrice)}</span>
      <span className="bar">
        <i style={{ left: `calc(${refLeft.toFixed(1)}% - 1px)` }} />
      </span>
      <span className="ven text-[11px]" style={{ color: 'var(--ref)' }}>
        REAL {symbol} · reference
      </span>
      <span />
    </div>,
  );

  return <div>{rows}</div>;
}
