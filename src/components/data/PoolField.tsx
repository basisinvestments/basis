'use client';

import { useEffect, useRef } from 'react';
import { depth, usd } from '@/lib/format';
import type { Pool } from '@/lib/types';

/**
 * The hero is the chart.
 *
 * Every pool as a column of light, positioned by price and brightened by depth on a
 * log scale, with the reference burning through in amber — and, now, an axis with
 * real prices on it, the reference named, the deepest pool named. It used to sit
 * behind a scrim as texture. It is the one asset a competitor cannot copy, because it
 * only exists if the product is actually running, so it should read as what it is:
 * the dataset, not decoration.
 *
 * The canvas and the labels are computed from the same range, in this file, so they
 * cannot disagree about where a price sits.
 */

/** Where the axis sits, as a fraction of the hero's height. Below the copy block
 *  (which ends around 72%), above the token strip (which starts around 88%). */
const BASE = 0.75;
/** Breathing room either side of the data, as a fraction of its span. */
const PAD = 0.12;

function range(pools: Pool[], refPrice: number): { lo: number; hi: number } {
  const prices = pools.map((p) => p.price);
  const lo = Math.min(...prices, refPrice);
  const hi = Math.max(...prices, refPrice);
  const pad = (hi - lo) * PAD || 1;
  return { lo: lo - pad, hi: hi + pad };
}

/** Round-number ticks — 1, 2, 5 × a power of ten — about `target` of them. */
function niceTicks(lo: number, hi: number, target = 5): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [];
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) {
    out.push(Number(v.toFixed(6)));
  }
  return out;
}

export function PoolField({
  pools,
  referencePrice,
  closed,
  symbol,
  anchor,
  className = '',
  style,
}: {
  pools: Pool[];
  referencePrice: number;
  closed: boolean;
  /** For the reference label — "REAL NVDA". */
  symbol?: string;
  /** The pool basis is measured against. Named on the axis. */
  anchor?: Pool | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Kept in a ref so the animation loop reads fresh values without being torn down
  // and restarted on every prop change — restarting would stutter the breathing.
  const state = useRef({ pools, referencePrice, closed });
  state.current = { pools, referencePrice, closed };

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const reduce =
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    /*
     * Size from the ELEMENT's own box via ResizeObserver, never a window resize
     * listener. A pane or tab that starts collapsed reports zero width, and a
     * window listener never fires for it — the backing store would stay 1px wide
     * forever and the field would silently never appear.
     */
    function size() {
      if (!cv || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth || cv.parentElement?.clientWidth || window.innerWidth;
      h = cv.clientHeight || cv.parentElement?.clientHeight || window.innerHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(t: number) {
      if (!ctx) return;
      const { pools: ps, referencePrice: refPrice, closed: isClosed } = state.current;
      ctx.clearRect(0, 0, w, h);

      if (ps.length) {
        const { lo, hi } = range(ps, refPrice);
        const maxL = Math.max(...ps.map((p) => p.liquidityUsd), 1);
        const x = (p: number) => ((p - lo) / (hi - lo)) * w;
        const base = h * BASE;

        for (let i = 0; i < ps.length; i++) {
          const p = ps[i]!;
          const px = x(p.price);
          const weight = Math.log10(Math.max(p.liquidityUsd, 10)) / Math.log10(maxL);
          const colHeight = 56 + weight * weight * (h * 0.34);
          // Closed: the columns hold still. The breathing is the market being open;
          // when it is shut, stillness is the signal.
          const breathe = reduce || isClosed ? 1 : Math.sin(t / 1600 + i * 0.8) * 0.11 + 0.89;
          const alpha = (0.08 + weight * 0.55) * breathe;

          const g = ctx.createLinearGradient(0, base - colHeight, 0, base + colHeight * 0.42);
          g.addColorStop(0, 'rgba(175,221,255,0)');
          g.addColorStop(0.52, `rgba(175,221,255,${alpha.toFixed(3)})`);
          g.addColorStop(1, 'rgba(175,221,255,0)');
          ctx.fillStyle = g;
          const barW = 0.9 + weight * 2.2;
          ctx.fillRect(px - barW / 2, base - colHeight, barW, colHeight * 1.42);

          ctx.beginPath();
          ctx.arc(px, base, 0.8 + weight * 2.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(210,235,255,${(0.2 + weight * 0.5).toFixed(3)})`;
          ctx.fill();
        }

        // The reference. Read from the CSS custom property so it follows the
        // session state — it desaturates off-hours and goes hollow when closed.
        const refCol =
          getComputedStyle(document.documentElement).getPropertyValue('--ref').trim() || '#FFB454';
        const rx = x(refPrice);
        const rg = ctx.createLinearGradient(0, base - h * 0.42, 0, base + h * 0.14);
        rg.addColorStop(0, 'rgba(0,0,0,0)');
        rg.addColorStop(0.5, refCol);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalAlpha = isClosed ? 0.5 : 0.85;
        ctx.fillStyle = rg;
        ctx.fillRect(rx - 1, base - h * 0.42, 2, h * 0.56);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(rx, base, 3, 0, Math.PI * 2);
        if (isClosed) {
          ctx.strokeStyle = refCol;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        } else {
          ctx.shadowColor = refCol;
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#FFD9A0';
          ctx.fill();
        }
        ctx.restore();
      }

      if (!reduce) raf = requestAnimationFrame(frame);
    }

    size();
    if (reduce) frame(0);
    else raf = requestAnimationFrame(frame);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            size();
            if (reduce) frame(0);
          })
        : null;
    ro?.observe(cv);
    window.addEventListener('resize', size);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', size);
    };
  }, []);

  // --- The axis. Same range as the canvas, so a label sits exactly on its column. ---
  const has = pools.length > 0;
  const { lo, hi } = has ? range(pools, referencePrice) : { lo: 0, hi: 1 };
  const pct = (p: number) => Math.max(2.5, Math.min(97.5, ((p - lo) / (hi - lo)) * 100));
  const ticks = has ? niceTicks(lo, hi, 5) : [];
  const refPct = pct(referencePrice);
  const anchorPct = anchor ? pct(anchor.price) : null;
  // The deepest pool usually sits within a percent of the reference. When the two
  // labels would overlap, the pool's drops to a third row rather than colliding.
  const bump = anchorPct !== null && Math.abs(anchorPct - refPct) < 12;
  const axisTop = `${BASE * 100}%`;

  return (
    <div className={className} style={style}>
      {/* Dimmer below md: there the copy spans the full width and sits over the
          columns, and the base dots were cutting across the flag line. */}
      <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-55 md:opacity-100" aria-hidden="true" />

      {has ? (
        /* Above the scrims (z-1) so the labels are crisp, below the copy (z-2). Hidden
           below md: on a phone the hero is the copy, and an axis under it is clutter. */
        <div className="pointer-events-none absolute inset-0 z-[1] hidden md:block" aria-hidden="true">
          <div className="absolute left-0 right-0 h-px bg-white/[0.1]" style={{ top: axisTop }} />

          {ticks.map((t) => (
            <span
              key={t}
              className="font-data absolute -translate-x-1/2 text-[10px] tracking-[.04em] text-white/35"
              style={{ left: `${pct(t)}%`, top: `calc(${axisTop} + 9px)` }}
            >
              {usd(t)}
            </span>
          ))}

          <span
            data-src="ref"
            className="c-ref font-data pointer-events-auto absolute -translate-x-1/2 whitespace-nowrap text-[11px] tracking-[.06em]"
            style={{ left: `${refPct}%`, top: `calc(${axisTop} + 29px)` }}
          >
            {symbol ? `REAL ${symbol} · ` : 'REFERENCE · '}
            {usd(referencePrice)}
          </span>

          {anchor ? (
            <span
              data-src="pool"
              className="c-pool font-data pointer-events-auto absolute -translate-x-1/2 whitespace-nowrap text-[11px] tracking-[.06em]"
              style={{ left: `${anchorPct}%`, top: `calc(${axisTop} + ${bump ? 47 : 29}px)` }}
            >
              DEEPEST · {depth(anchor.liquidityUsd)} · {usd(anchor.price)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
