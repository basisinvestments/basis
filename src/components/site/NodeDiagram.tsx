'use client';

import { useEffect, useRef } from 'react';

/**
 * Three squares, three labels, six connectors in elbow pairs.
 *
 * These are not decoration — they are the three price sources, which is the product's
 * actual architecture. Hovering one dims every figure on the page not fed by it,
 * which teaches the colour code faster than a legend would. The hover is not wired
 * here: every element carries `data-src`, and `SourceHighlight` in the root layout
 * turns any carrier on the site into a trigger.
 *
 * It assembles itself once, when it scrolls into view — connectors draw, labels
 * arrive, then the squares. The design system states that labels and connectors
 * precede the things they point to; this is the first place that rule is performed
 * below the fold.
 *
 * The squares stay empty. Putting an icon inside collapses the diagram into a
 * feature grid. Each elbow's diagonal endpoint equals its square's top/left exactly,
 * so the line lands on the corner.
 */

const CONNECTORS: Array<[string, string, string, string]> = [
  ['38%', '14%', '52%', '14%'],
  ['52%', '14%', '60%', '27%'],
  ['32%', '58%', '20%', '74%'],
  ['20%', '74%', '6%', '74%'],
  ['78%', '53%', '63%', '53%'],
  ['63%', '53%', '50%', '63%'],
];

const NODES = [
  {
    id: 'ref',
    square: { top: '27%', left: '60%' },
    label: { top: '11%', left: '26%' },
    title: '[ REFERENCE ]',
    body: "Exchange bid and ask from the issuer's keyless API, times the multiplier. Frozen when the market shuts.",
    color: 'var(--ref)',
    maxW: 170,
  },
  {
    id: 'orc',
    square: { top: '58%', left: '32%' },
    label: { top: '76%', left: '3%' },
    title: '[ ORACLE ]',
    body: 'Chainlink total-return feed on chain 4663. Holds its last value off-hours with no heartbeat.',
    color: 'rgba(255,255,255,0.8)',
    maxW: 170,
  },
  {
    id: 'pool',
    square: { top: '63%', left: '50%' },
    label: { top: '50%', left: '78%' },
    title: '[ POOL ]',
    body: 'Every Uniswap pool holding the token, ranked by depth. Never authoritative — it is what gets measured.',
    color: 'var(--pool)',
    maxW: 180,
  },
] as const;

/* The choreography, in milliseconds. Connectors first, staggered; labels as the
   last line lands; squares after the labels. */
const LINE_STEP = 110;
const LABEL_AT = CONNECTORS.length * LINE_STEP;
const SQUARE_AT = LABEL_AT + 320;

export function NodeDiagram() {
  const ref = useRef<HTMLDivElement>(null);

  // Once. A diagram that reassembles every time it scrolls past is a nuisance.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('on');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('on');
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={ref} className="diagram spec relative mt-8 hidden h-[360px] md:block">
        {CONNECTORS.map(([x1, y1, x2, y2], i) => (
          <svg key={i} className="pointer-events-none absolute inset-0 h-full w-full">
            {/* pathLength normalises the dash maths to 0–100 regardless of the
                percentage geometry, so drawLine's 100→0 offset draws the whole line. */}
            <line
              className="draw"
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              pathLength={100}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${i * LINE_STEP}ms` }}
            />
          </svg>
        ))}

        {NODES.map((n, i) => (
          <div
            key={`sq-${n.id}`}
            data-src={n.id}
            className="node absolute h-[80px] w-[80px] border lg:h-[100px] lg:w-[100px]"
            style={{ ...n.square, borderColor: n.color, animationDelay: `${SQUARE_AT + i * 90}ms` }}
          />
        ))}

        {NODES.map((n, i) => (
          <div
            key={`lb-${n.id}`}
            data-src={n.id}
            className="nlabel absolute cursor-default"
            style={{ ...n.label, animationDelay: `${LABEL_AT + i * 90}ms` }}
          >
            <span
              className="font-manrope whitespace-nowrap text-[13px] leading-[15.6px]"
              style={{ color: n.color }}
            >
              {n.title}
            </span>
            <p
              className="font-manrope mt-[4px] text-[11px] leading-[14px] text-white/50"
              style={{ maxWidth: n.maxW }}
            >
              {n.body}
            </p>
          </div>
        ))}
      </div>

      {/* Below md the diagram is hidden and the labels become a stacked list. */}
      <div className="mt-8 grid gap-3 md:hidden">
        {NODES.map((n) => (
          <div key={n.id} data-src={n.id} className="spec p-4">
            <span className="font-manrope text-[13px]" style={{ color: n.color }}>
              {n.title}
            </span>
            <p className="font-manrope mt-2 text-[12px] leading-[19px] text-white/50">{n.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
