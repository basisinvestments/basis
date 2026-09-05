'use client';

import { useEffect, useMemo, useState } from 'react';
import { Interpreter } from '@/components/desk/Interpreter';
import { PoolStrip } from '@/components/data/PoolStrip';
import { PriceLadder } from '@/components/data/PriceLadder';
import { StatusLine } from '@/components/desk/StatusLine';
import { Flag } from '@/components/ui/Flag';
import { Tick } from '@/components/ui/Tick';
import { depth, signed, usd } from '@/lib/format';
import { useLiveReadings } from '@/lib/live';
import type { Pool, Reading, SessionState } from '@/lib/types';

/**
 * Your tokens, not everyone's.
 *
 * Five columns, not nine. The readout on the landing page is the exhaustive view;
 * this one exists to be glanced at, so it carries only what a glance needs — what
 * it is worth, what the pool says, how far apart those are, and whether that
 * matters. Depth, spread and pool count moved into the expansion, where someone
 * has already signalled they want detail.
 *
 * The interpreter is not in that expansion. It sits open below the table, because a
 * feature nobody can see is a feature nobody uses — and opening a row still aims it
 * at that token, so the click does something useful without being the only way in.
 */

const KEY = 'basis.watchlist';
const FREE_CAP = 12;
const DEFAULT = ['NVDA', 'SPY', 'AMC'];

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function Watchlist({
  readings: initial,
  ladders,
  available,
  interpreterConfigured,
  session,
}: {
  readings: Reading[];
  ladders: Record<string, Pool[]>;
  available: string[];
  interpreterConfigured: boolean;
  session: SessionState;
}) {
  const readings = useLiveReadings(initial);
  // Server and first client render must agree, so start from the default and
  // adopt stored state after mount rather than reading storage during render.
  const [watched, setWatched] = useState<string[]>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [showAllPools, setShowAllPools] = useState(false);
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState<string>(DEFAULT[0]!);

  useEffect(() => {
    setWatched(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(watched));
    } catch {
      /* storage unavailable — the list still works for this session */
    }
  }, [watched, hydrated]);

  const rows = useMemo(
    () =>
      watched
        .map((s) => readings.find((r) => r.symbol === s))
        .filter((r): r is Reading => Boolean(r)),
    [watched, readings],
  );

  const addable = available.filter((s) => !watched.includes(s));
  const atCap = watched.length >= FREE_CAP;
  const openRow = open ? rows.find((r) => r.symbol === open) : null;
  const watchedSymbols = rows.map((r) => r.symbol);

  // Keep the interpreter pointed at something that is actually on the list — the
  // stored watchlist arrives after mount and can be edited underneath it.
  useEffect(() => {
    if (watchedSymbols.length && !watchedSymbols.includes(asking)) {
      setAsking(watchedSymbols[0]!);
    }
  }, [watchedSymbols, asking]);

  return (
    <div>
      <StatusLine readings={readings} watched={watched} initialSession={session} />

      <div className="spec mt-4 overflow-x-auto">
        <table className="tb w-full sm:min-w-[520px]">
          <thead>
            <tr>
              <th style={{ cursor: 'default' }}>Token</th>
              <th style={{ cursor: 'default' }}>Real price</th>
              <th className="pp" style={{ cursor: 'default' }}>Pool price</th>
              <th style={{ cursor: 'default' }}>Gap</th>
              <th style={{ cursor: 'default' }}>State</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-left text-white/40">
                  Nothing watched. Add a token below.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => {
              const basis = r.basisBps;
              const basisCls =
                basis === null
                  ? 'text-white/30'
                  : Math.abs(basis) >= 200
                    ? 'c-hot'
                    : Math.abs(basis) >= 100
                      ? ''
                      : 'text-white/60';
              const isOpen = open === r.symbol;
              return (
                <tr
                  key={r.symbol}
                  className="r"
                  onClick={() => {
                    setOpen(isOpen ? null : r.symbol);
                    setShowAllPools(false);
                    setAsking(r.symbol);
                  }}
                >
                  <td className="font-medium">
                    <span className="mr-2 inline-block w-[9px] text-white/30">{isOpen ? '−' : '+'}</span>
                    {r.symbol}
                  </td>
                  <td className="c-ref" data-src="ref">
                    <Tick value={r.reference.price} tone="ref">{usd(r.reference.price)}</Tick>
                  </td>
                  <td className="c-pool pp" data-src="pool">
                    <Tick value={r.pool?.price ?? null} tone="pool">{r.pool ? usd(r.pool.price) : '—'}</Tick>
                  </td>
                  <td className={`${basisCls} font-medium`}>
                    <Tick value={basis} tone="hot">{basis === null ? '—' : `${signed(basis)} bps`}</Tick>
                  </td>
                  <td>
                    <Flag flag={r.flag} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {openRow ? (
        <div className="mt-4">
          <div className="spec p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="lab">Where the pools sit · {openRow.symbol}</span>
              <span className="font-data text-[11px] text-white/35">
                {openRow.pool ? `deepest ${depth(openRow.pool.liquidityUsd)}` : ''}
                {openRow.spreadBps ? ` · ${openRow.spreadBps} bps apart` : ''}
              </span>
            </div>

            <div className="mt-5">
              <PoolStrip
                symbol={openRow.symbol}
                pools={ladders[openRow.symbol] ?? (openRow.pool ? [openRow.pool] : [])}
                referencePrice={openRow.reference.price}
              />
            </div>

            {/* The full ladder is still available for anyone who wants it — just not
                981px of it by default. */}
            {(ladders[openRow.symbol]?.length ?? 0) > 1 ? (
              <>
                <button
                  type="button"
                  className="verify mt-5"
                  onClick={() => setShowAllPools((v) => !v)}
                >
                  {showAllPools
                    ? '[ hide the full list ]'
                    : `[ list all ${ladders[openRow.symbol]!.length} pools ]`}
                </button>
                {showAllPools ? (
                  <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
                    <PriceLadder
                      symbol={openRow.symbol}
                      pools={ladders[openRow.symbol]!}
                      referencePrice={openRow.reference.price}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {watchedSymbols.length ? (
        <div className="mt-4">
          <Interpreter
            symbol={asking}
            symbols={watchedSymbols}
            onSymbolChange={setAsking}
            configured={interpreterConfigured}
          />
        </div>
      ) : null}

      {/* Editing the list is a rare action, so it stays behind a toggle rather than
          spending a permanent row on fourteen "+ TICKER" buttons. */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button type="button" className="verify" onClick={() => setEditing((v) => !v)}>
          {editing ? '[ done ]' : '[ edit watchlist ]'}
        </button>
        <span className="lab">
          {watched.length}/{FREE_CAP} · stored in this browser
        </span>
      </div>

      {editing ? (
        <div className="spec mt-3 p-4">
          <span className="lab mb-3 block">Watching — click to remove</span>
          <div className="flex flex-wrap gap-2">
            {watched.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setWatched((w) => w.filter((x) => x !== s));
                  if (open === s) setOpen(null);
                }}
                className="font-data border px-[10px] py-[5px] text-[11.5px]"
                style={{ borderColor: 'var(--hot)', color: 'var(--hot)' }}
              >
                {s} ×
              </button>
            ))}
          </div>

          <span className="lab mb-3 mt-5 block">
            Add {atCap ? `· ${FREE_CAP} is the free-tier limit` : ''}
          </span>
          <div className="flex flex-wrap gap-2">
            {addable.map((s) => (
              <button
                key={s}
                type="button"
                disabled={atCap}
                onClick={() => setWatched((w) => (w.includes(s) ? w : [...w, s]))}
                className="font-data border border-white/15 px-[10px] py-[5px] text-[11.5px] text-white/55 transition-colors hover:border-white/40 hover:text-white disabled:opacity-30"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
