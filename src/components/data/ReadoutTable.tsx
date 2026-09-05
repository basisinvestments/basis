'use client';

import { Fragment, useMemo, useState } from 'react';
import { Flag } from '@/components/ui/Flag';
import { Tick } from '@/components/ui/Tick';
import { PoolStrip } from '@/components/data/PoolStrip';
import { PriceLadder } from '@/components/data/PriceLadder';
import { spreadBand } from '@/lib/basis';
import { depth, signed, stampUtc, usd } from '@/lib/format';
import { useLiveReadings } from '@/lib/live';
import type { Pool, Reading } from '@/lib/types';

type SortKey = 'symbol' | 'reference' | 'pool' | 'basis' | 'spread' | 'liquidity' | 'pools';

/**
 * Four sortable columns by default; the wide view adds the other three and the stamp.
 *
 * Nine columns needed `min-w-[860px]`, which scrolled sideways on a phone and pushed
 * the flag — the one thing a glance is for — off the right edge. Spread, depth and
 * pool count are detail: they belong to someone who has already decided to study a
 * row, and that person can open the row or the wide view.
 */
const CORE: Array<{ key: SortKey; label: string }> = [
  { key: 'symbol', label: 'Token' },
  { key: 'reference', label: 'Reference' },
  { key: 'pool', label: 'Deepest pool' },
  { key: 'basis', label: 'Basis' },
];

/** Sorted by distance from fair, so the first six are the six worth seeing. */
const PREVIEW_ROWS = 6;

const EXTRA: Array<{ key: SortKey; label: string }> = [
  { key: 'spread', label: 'Spread' },
  { key: 'liquidity', label: 'Depth' },
  { key: 'pools', label: 'Pools' },
];

function value(r: Reading, key: SortKey): number | string {
  switch (key) {
    case 'symbol': return r.symbol;
    case 'reference': return r.reference.price;
    case 'pool': return r.pool?.price ?? 0;
    // Distance from fair, not direction — a -300 is as dislocated as a +300.
    case 'basis': return Math.abs(r.basisBps ?? 0);
    case 'spread': return r.spreadBps ?? 0;
    case 'liquidity': return r.pool?.liquidityUsd ?? 0;
    case 'pools': return r.poolCount;
  }
}

export function ReadoutTable({
  readings: initial,
  ladders,
}: {
  readings: Reading[];
  /** Full pool ladders keyed by symbol, for the row expander. */
  ladders: Record<string, Pool[]>;
}) {
  // The server-rendered rows are the baseline; from there the table keeps itself
  // current, so a figure that moves flashes rather than waiting for a reload.
  const readings = useLiveReadings(initial);
  const [sort, setSort] = useState<SortKey>('basis');
  const [dir, setDir] = useState<1 | -1>(-1);
  const [open, setOpen] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const [allPools, setAllPools] = useState(false);
  const [allRows, setAllRows] = useState(false);

  const columns = wide ? [...CORE, ...EXTRA] : CORE;
  const colSpan = columns.length + (wide ? 2 : 1);

  const rows = useMemo(() => {
    return [...readings].sort((a, b) => {
      const av = value(a, sort);
      const bv = value(b, sort);
      if (typeof av === 'string' || typeof bv === 'string') {
        return dir * String(av).localeCompare(String(bv));
      }
      return dir * (av - bv);
    });
  }, [readings, sort, dir]);

  function toggle(key: SortKey) {
    if (key === sort) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(key);
      setDir(key === 'symbol' ? 1 : -1);
    }
  }

  return (
    <>
      <div className="spec overflow-x-auto">
        <table className={`tb w-full ${wide ? 'min-w-[860px]' : 'sm:min-w-[560px]'}`}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} data-active={sort === c.key} onClick={() => toggle(c.key)}>
                  {c.label}
                  {sort === c.key ? (dir === -1 ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
              <th style={{ cursor: 'default' }}>Flag</th>
              {wide ? <th style={{ cursor: 'default' }}>Stamp</th> : null}
            </tr>
          </thead>
          <tbody>
            {(allRows ? rows : rows.slice(0, PREVIEW_ROWS)).map((r) => {
            const basis = r.basisBps;
            const spread = r.spreadBps ?? 0;
            const band = spreadBand(spread);
            const basisCls =
              basis === null ? 'text-white/30'
                : Math.abs(basis) >= 200 ? 'c-hot'
                  : Math.abs(basis) >= 100 ? ''
                    : 'text-white/60';
            const spreadCls = band === 'flagged' ? 'c-hot' : band === 'notable' ? '' : 'text-white/60';
            const isOpen = open === r.symbol;
            const ladder = ladders[r.symbol] ?? [];

            return (
              <Fragment key={r.symbol}>
                <tr className="r" onClick={() => setOpen(isOpen ? null : r.symbol)}>
                  <td className="font-medium">
                    {r.symbol}
                    <span className="ml-2 hidden text-[11px] font-normal text-white/30 lg:inline">{r.name}</span>
                  </td>
                  <td className="c-ref" data-src="ref">
                    <Tick value={r.reference.price} tone="ref">{usd(r.reference.price)}</Tick>
                    {r.reference.multiplier !== 1 ? (
                      <span className="ml-1 text-[10px] text-white/30">
                        ×{r.reference.multiplier.toFixed(3)}
                      </span>
                    ) : null}
                  </td>
                  <td className="c-pool" data-src="pool">
                    <Tick value={r.pool?.price ?? null} tone="pool">{r.pool ? usd(r.pool.price) : '—'}</Tick>
                  </td>
                  <td className={`${basisCls} font-medium`}>
                    <Tick value={basis} tone="hot">{basis === null ? '—' : signed(basis)}</Tick>
                  </td>
                  {wide ? (
                    <>
                      <td className={spreadCls}>{spread || '—'}</td>
                      <td className="text-white/45">{r.pool ? depth(r.pool.liquidityUsd) : '—'}</td>
                      <td className="text-white/45">{r.poolCount}</td>
                    </>
                  ) : null}
                  <td><Flag flag={r.flag} /></td>
                  {wide ? (
                    <td className="text-[11px] text-white/30">
                      {stampUtc(r.asOf)}
                      {r.stale ? ' ·' : ''}
                    </td>
                  ) : null}
                </tr>
                {isOpen ? (
                  <tr className="d">
                    <td colSpan={colSpan}>
                      <div className="grid gap-6 p-5 lg:grid-cols-2">
                        <div>
                          <span className="lab mb-3 block">
                            {ladder.length ? `Every pool over $3k · ${stampUtc(r.asOf)}` : 'Pool ladder'}
                          </span>
                          {ladder.length ? (
                            <>
                              <PoolStrip
                                symbol={r.symbol}
                                pools={ladder}
                                referencePrice={r.reference.price}
                              />
                              {ladder.length > 1 ? (
                                <>
                                  <button
                                    type="button"
                                    className="verify mt-4"
                                    onClick={() => setAllPools((v) => !v)}
                                  >
                                    {allPools
                                      ? '[ hide the full list ]'
                                      : `[ list all ${ladder.length} pools ]`}
                                  </button>
                                  {allPools ? (
                                    <div className="mt-4 max-h-[300px] overflow-y-auto pr-1">
                                      <PriceLadder
                                        symbol={r.symbol}
                                        pools={ladder}
                                        referencePrice={r.reference.price}
                                      />
                                    </div>
                                  ) : null}
                                </>
                              ) : null}
                            </>
                          ) : (
                            <p className="font-manrope text-[13px] leading-[21px] text-white/45">
                              The ladder is fetched per token. The deepest pool is shown in the row above.
                            </p>
                          )}
                        </div>
                        <div>
                          <span className="lab mb-2 block">Verify</span>
                          {r.stale ? (
                            <p className="font-manrope mb-3 text-[13px] leading-[21px] text-white/45">
                              This row came from the stored capture{r.degraded ? ` — ${r.degraded}` : ''}, so it
                              is flagged DARK. The commands below still reproduce it, but they will return
                              today&apos;s numbers, not these.
                            </p>
                          ) : null}
                          <pre className="drawer">{verifyText(r)}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* The thresholds are published in docs/product.md precisely so they can be
          argued with. Reaching the page only as a title tooltip was not publishing. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {rows.length > PREVIEW_ROWS ? (
          <button type="button" className="verify" onClick={() => setAllRows((v) => !v)}>
            {allRows ? '[ top six only ]' : `[ all ${rows.length} tokens ]`}
          </button>
        ) : null}
        <button type="button" className="verify" onClick={() => setWide((v) => !v)}>
          {wide ? '[ fewer columns ]' : '[ all nine columns ]'}
        </button>
        <span className="lab">
          TIGHT under 100 bps · WATCH 100–200 · WIDE 200+ · ACTION multiplier staged · DARK market
          shut, reference over 900s old, or a stored row — DARK outranks all of them
        </span>
      </div>
    </>
  );
}

/* Local copy so the table does not need the interactive drawer's open/close state. */
function verifyText(r: Reading): string {
  const ref = r.reference;
  const pool = r.pool;
  return [
    '# three commands, none of them ours',
    `curl "https://api.robinhood.com/rhj/prices/${r.symbol}"`,
    `curl "https://api.robinhood.com/rhj/assets"`,
    `curl "https://api.dexscreener.com/latest/dex/tokens/${r.address}"`,
    '',
    `reference = ${ref.mid.toFixed(2)} x ${ref.multiplier.toFixed(6)} = ${ref.price.toFixed(2)}`,
    pool && r.basisBps !== null
      ? `basis     = ( ${pool.price.toFixed(2)} / ${ref.price.toFixed(2)} - 1 ) x 10000 = ${signed(r.basisBps)} bps`
      : 'basis     = unmeasurable without a live reference',
  ].join('\n');
}
