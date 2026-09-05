import { depth, usd } from '@/lib/format';
import type { Pool } from '@/lib/types';

/**
 * The pool distribution in one strip instead of one row per pool.
 *
 * The full ladder is 31 rows and 982px tall for a token like NVDA. Nobody reads
 * that; it is a wall, not a chart. The question a person actually has is "are the
 * pools clustered or scattered, and where does the real price sit in that" — which
 * is one axis, not thirty-one rows.
 *
 * Each pool is a tick positioned by price, sized by depth. The reference is the
 * amber marker. Same information, ~70px.
 *
 * `best` and `worst` tie the strip to whatever sits above it. The desk highlights
 * nothing and lets the deepest pool carry the emphasis; the execution check marks
 * the two prices it quotes, so the figures and the picture are visibly the same
 * measurement rather than two things that happen to be adjacent.
 */
export function PoolStrip({
  symbol,
  pools,
  referencePrice,
  best,
  worst,
}: {
  symbol: string;
  pools: Pool[];
  referencePrice: number;
  best?: Pool | null;
  worst?: Pool | null;
}) {
  if (!pools.length) {
    return <p className="font-manrope text-[13px] text-white/45">No pools above the dust threshold.</p>;
  }

  const prices = pools.map((p) => p.price);
  const lo = Math.min(...prices, referencePrice);
  const hi = Math.max(...prices, referencePrice);
  const span = hi - lo || 1;
  const maxDepth = Math.max(...pools.map((p) => p.liquidityUsd), 1);

  const cheapest = pools.reduce((a, b) => (b.price < a.price ? b : a));
  const dearest = pools.reduce((a, b) => (b.price > a.price ? b : a));
  const deepest = pools.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a));

  const pos = (p: number) => ((p - lo) / span) * 100;

  // When the reference is outside the pool range it lands at 0% or 100%, and a
  // centred label overhangs the panel. Anchor it inward at the edges instead.
  const refPos = pos(referencePrice);
  const labelShift = refPos < 8 ? '0' : refPos > 92 ? '-100%' : '-50%';

  return (
    <div>
      <div className="relative h-[46px]">
        {/* axis */}
        <div className="absolute left-0 right-0 top-[30px] h-px bg-white/15" />

        {pools.map((p, i) => {
          // Depth drives height on a log scale, so a $6M pool and a $4k pool are
          // visibly different without the small ones vanishing entirely.
          const weight = Math.log10(Math.max(p.liquidityUsd, 100)) / Math.log10(maxDepth);
          const isBest = Boolean(best) && p === best;
          const isWorst = Boolean(worst) && p === worst;
          const isDeepest = p === deepest;
          // Marked ticks run 4px taller so they are findable in a cluster of thirty.
          const h = 6 + weight * 20 + (isBest || isWorst ? 4 : 0);
          return (
            <div
              key={`${p.pairId ?? p.dex}-${p.quote}-${i}`}
              className="absolute"
              style={{
                left: `${pos(p.price).toFixed(2)}%`,
                top: `${30 - h}px`,
                width: isDeepest || isBest || isWorst ? 2 : 1,
                height: h,
                background: isBest
                  ? 'var(--mint)'
                  : isWorst
                    ? 'var(--hot)'
                    : isDeepest
                      ? 'var(--pool)'
                      : 'rgba(175,221,255,0.35)',
                transform: 'translateX(-50%)',
              }}
              title={`${usd(p.price)} · ${p.dex} ${p.version} ${symbol}/${p.quote} · ${depth(p.liquidityUsd)}`}
            />
          );
        })}

        {/* the reference — the one warm mark */}
        <div
          className="refmark absolute"
          style={{
            left: `${refPos.toFixed(2)}%`,
            top: '18px',
            width: 2,
            height: 24,
            background: 'var(--ref)',
            transform: 'translateX(-50%)',
          }}
          title={`Real ${symbol} · ${usd(referencePrice)}`}
        />
        <span
          className="font-data absolute text-[10px]"
          style={{
            left: `${refPos.toFixed(2)}%`,
            top: '0px',
            color: 'var(--ref)',
            transform: `translateX(${labelShift})`,
            whiteSpace: 'nowrap',
          }}
        >
          {usd(referencePrice)}
        </span>
      </div>

      <div className="font-data mt-1 flex justify-between text-[10.5px] text-white/40">
        <span className={best ? 'c-mint' : undefined}>{usd(cheapest.price)} cheapest</span>
        <span className="text-white/30">
          {pools.length} pools · deepest {depth(deepest.liquidityUsd)}
        </span>
        <span className={worst ? 'c-hot' : undefined}>{usd(dearest.price)} dearest</span>
      </div>
    </div>
  );
}
