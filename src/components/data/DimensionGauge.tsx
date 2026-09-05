'use client';

import { useEffect, useState } from 'react';
import { signed, usd } from '@/lib/format';

/**
 * Two marks on an axis with the measured span between them.
 *
 * The canonical "explain a gap between two values" graphic. It lived inside the hero
 * as a private local until section 02 needed the same picture to show what the
 * multiplier does — the shape is not hero-specific, only the labels are.
 *
 * The span draws itself open once, after the hero's own choreography has finished.
 * `delayMs` lets a second gauge on the same screen follow the first rather than
 * racing it.
 */
export function DimensionGauge({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  spanLabel,
  basis,
  tone = 'hot',
  delayMs = 900,
  className,
}: {
  leftLabel: string;
  leftValue: number;
  rightLabel: string;
  rightValue: number;
  /** Overrides the derived `±N bps` caption — used where the gap is a percentage. */
  spanLabel?: string;
  basis?: number | null;
  tone?: 'hot' | 'mint';
  delayMs?: number;
  className?: string;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  // Two gauges on one page cannot share a gradient id or the second inherits the
  // first's stops in Safari.
  const gradId = `span-${leftLabel}-${rightLabel}`.replace(/[^a-zA-Z0-9-]/g, '');
  const caption = spanLabel ?? (basis === null || basis === undefined ? '—' : `${signed(basis)} bps`);

  return (
    <svg
      viewBox="0 0 320 120"
      className={className ?? 'hidden h-auto w-[320px] max-w-full md:block'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="1">
          <stop offset="0" stopColor="var(--ref)" />
          <stop offset="1" stopColor="var(--pool)" />
        </linearGradient>
      </defs>
      <line x1="60" y1="22" x2="60" y2="40" stroke="var(--ref)" strokeWidth="1.5" />
      <line x1="260" y1="22" x2="260" y2="40" stroke="var(--pool)" strokeWidth="1.5" />
      <line
        x1="60"
        y1="31"
        x2={drawn ? 260 : 60}
        y2="31"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        style={{ transition: 'x2 .85s cubic-bezier(.16,1,.3,1)' }}
      />
      <text
        x="160"
        y="16"
        textAnchor="middle"
        fill={tone === 'mint' ? 'var(--mint)' : 'var(--hot)'}
        opacity={drawn ? 1 : 0}
        style={{ fontFamily: 'var(--font-data)', fontSize: 12, fontWeight: 600, transition: 'opacity .5s .4s' }}
      >
        {caption}
      </text>
      <line x1="60" y1="40" x2="60" y2="72" stroke="rgba(255,255,255,.2)" strokeDasharray="2 3" />
      <line x1="260" y1="40" x2="260" y2="72" stroke="rgba(255,255,255,.2)" strokeDasharray="2 3" />
      <line x1="10" y1="80" x2="310" y2="80" stroke="rgba(255,255,255,.12)" />
      <circle cx="60" cy="80" r="3.5" fill="var(--ref)" />
      <circle cx="260" cy="80" r="3.5" fill="var(--pool)" />
      <text
        x="60"
        y="100"
        textAnchor="middle"
        fill="rgba(255,255,255,.45)"
        style={{ fontFamily: 'var(--font-data)', fontSize: 8.5, letterSpacing: '.18em' }}
      >
        {leftLabel}
      </text>
      <text x="60" y="115" textAnchor="middle" fill="#fff" style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>
        {usd(leftValue)}
      </text>
      <text
        x="260"
        y="100"
        textAnchor="middle"
        fill="rgba(255,255,255,.45)"
        style={{ fontFamily: 'var(--font-data)', fontSize: 8.5, letterSpacing: '.18em' }}
      >
        {rightLabel}
      </text>
      <text x="260" y="115" textAnchor="middle" fill="#fff" style={{ fontFamily: 'var(--font-data)', fontSize: 12 }}>
        {usd(rightValue)}
      </text>
    </svg>
  );
}
