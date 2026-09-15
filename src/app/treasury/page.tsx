import Link from 'next/link';
import { Footer } from '@/components/site/Footer';
import { InstrumentBar } from '@/components/site/InstrumentBar';
import { dateStampUtc, depth, dollars, usd } from '@/lib/format';
import { SESSION_LABEL } from '@/lib/session';
import { assembleTreasury } from '@/lib/treasury-assemble';
import { MAX_POOL_SHARE, MAX_TREASURY_SHARE } from '@/lib/treasury';

export const metadata = { title: 'Treasury — BASIS // SPREAD' };
export const revalidate = 60;

/**
 * The treasury, from the day the token exists.
 *
 * Three things, each with its provenance: the balance, read from the wallet on
 * chain; what the published mandate would do with the readings on screen right now;
 * and a minute-by-minute ledger of what it has seen. The first is real money and
 * says so. The second and third are simulated and say so louder — every figure under
 * the SIMULATED label is a signal at quoted prices, not a fill.
 *
 * Nothing on this page trades. When the treasury does, the fills will be read from
 * chain and shown beside the reading they were published from, so the rule that
 * governs it — publish first, then trade the published number — is checkable.
 */
export default async function TreasuryPage() {
  const v = await assembleTreasury(60);
  const { balance, simulated: sim, ledger } = v;
  const signals = sim.now.filter((e) => e.signal !== null);
  const armed = balance.configured && balance.usd >= v.armThresholdUsd;
  const totalNetSeen = ledger.tail.reduce((a, e) => a + e.signals.reduce((b, s) => b + s.netUsd, 0), 0);
  const minutesWithSignal = ledger.tail.filter((e) => e.signals.length).length;

  return (
    <>
      <InstrumentBar session={v.session} live />
      <main className="relative z-10 px-5 pb-16 pt-[92px] md:px-[35px] md:pt-[112px]">
        <div className="max-w-[74ch]">
          <span className="lab">Engine 02</span>
          <h1 className="font-graphik mt-4 text-[38px] leading-[1.02] tracking-[-.025em] md:text-[54px]">
            The treasury.
          </h1>
          <p className="font-manrope mt-5 text-[16px] leading-[26px] text-white/50">
            The instrument finds mispricings; the treasury trades them. It is funded by half of every
            dollar the project earns and begins trading at {dollars(v.armThresholdUsd)}. This page shows
            its balance from the chain, what the published mandate would do with the readings on screen
            right now, and a minute-by-minute record of what it has seen.
          </p>
        </div>

        {/* ------------------------------------------------------------ balance */}
        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <div className="spec p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="lab">Balance · read from chain</span>
              {balance.configured ? (
                <span className={`flag ${armed ? 'f-TIGHT' : 'f-WATCH'}`}>{armed ? 'ARMED' : 'ACCUMULATING'}</span>
              ) : (
                <span className="flag f-DARK">NOT YET FUNDED</span>
              )}
            </div>

            {balance.configured ? (
              <>
                <div className="reading c-ref mt-5 text-[56px] sm:text-[72px]" data-src="ref">
                  {dollars(balance.usd)}
                </div>
                <div className="font-data mt-2 text-[12px] text-white/45">
                  {balance.usdg.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDG · {balance.eth.toFixed(4)} ETH for gas
                </div>
                <div className="font-manrope mt-4 text-[13px] leading-[21px] text-white/50">
                  {armed
                    ? 'Above the threshold. Signals below are sized against this balance.'
                    : `${dollars(v.armThresholdUsd - balance.usd)} short of the threshold. Signals below are sized against the threshold — what it would do once armed.`}
                </div>
                <p className="lab mt-5">
                  block {balance.block.toLocaleString()} · {dateStampUtc(balance.readAt)} ·{' '}
                  <a className="text-[#AFDDFF]" href={balance.explorer} target="_blank" rel="noreferrer noopener">
                    verify on the explorer ↗
                  </a>
                </p>
              </>
            ) : (
              <>
                <div className="reading mt-5 text-[56px] text-white/20 sm:text-[72px]">—</div>
                <p className="font-manrope mt-4 max-w-[46ch] text-[13.5px] leading-[22px] text-white/50">
                  {balance.reason} When the wallet exists its address goes into this deployment&apos;s
                  configuration and the balance is read every minute from the chain, with the block and
                  the time of the read stamped beside it. Nothing here is ever typed in.
                </p>
              </>
            )}
          </div>

          {/* ----------------------------------------------------------- mandate */}
          <div className="spec p-5">
            <span className="lab">The published mandate</span>
            <div className="font-data mt-4 grid gap-[7px] text-[12px] leading-[20px] text-white/70">
              <div><span className="c-pool">ASSETS</span> canonical Stock Tokens and USDG only — never launchpad tokens</div>
              <div><span className="c-pool">SIZE</span> at most {MAX_POOL_SHARE * 100}% of the shallower pool per position</div>
              <div><span className="c-pool">EXPOSURE</span> at most {MAX_TREASURY_SHARE * 100}% of the treasury in one token</div>
              <div><span className="c-pool">LEVERAGE</span> none · no borrowing, no perps</div>
              <div><span className="c-pool">PROFIT</span> half compounds here · half buys and burns</div>
              <div><span className="c-pool">LOSS</span> stays inside the treasury · the burn never covers it</div>
              <div><span className="c-pool">ORDER</span> publish first, then trade the published number</div>
            </div>
            <p className="font-manrope mt-4 max-w-[52ch] text-[12.5px] leading-[20px] text-white/40">
              The last line is the one that keeps the feed honest. A service that publishes gaps and
              also trades them can front-run its readers. Fills will appear here beside the reading they
              were published from, timestamped, so the ordering is checkable. It costs the treasury its
              best fills. That is the price of the feed being worth reading.
            </p>
          </div>
        </div>

        {/* -------------------------------------------------------- right now */}
        <div className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="lab">What the mandate would do right now</span>
            <span className="font-data text-[11px] text-white/35">
              {SESSION_LABEL[v.session]} · {dateStampUtc(v.asOf)}
            </span>
          </div>

          <div
            className="font-data mt-3 border px-4 py-3 text-[11px] leading-[18px] tracking-[.04em]"
            style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}
          >
            {sim.label} Sized against{' '}
            {sim.notionalIsReal ? 'the real balance' : `the ${dollars(sim.notionalUsd)} threshold, not a real balance`}.
            Fees assumed at {sim.feeAssumptionBpsPerLeg} bps a leg — the pool tier is not in the index data.
          </div>

          {signals.length ? (
            <div className="spec mt-4 overflow-x-auto">
              <table className="tb w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th style={{ cursor: 'default' }}>Token</th>
                    <th style={{ cursor: 'default' }}>Buy at</th>
                    <th style={{ cursor: 'default' }}>Sell at</th>
                    <th style={{ cursor: 'default' }}>Spread</th>
                    <th style={{ cursor: 'default' }}>Size</th>
                    <th style={{ cursor: 'default' }}>Net at quote</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((e) => {
                    const s = e.signal!;
                    return (
                      <tr key={e.symbol}>
                        <td className="font-medium">{s.symbol}</td>
                        <td className="c-pool">
                          {usd(s.buy.price)}
                          <span className="ml-2 text-[10.5px] text-white/35">
                            {s.buy.dex}/{s.buy.quote} · {depth(s.buy.liquidityUsd)}
                          </span>
                        </td>
                        <td className="c-pool">
                          {usd(s.sell.price)}
                          <span className="ml-2 text-[10.5px] text-white/35">
                            {s.sell.dex}/{s.sell.quote} · {depth(s.sell.liquidityUsd)}
                          </span>
                        </td>
                        <td className="c-hot">+{Math.round(s.spreadBps)} bps</td>
                        <td>
                          {dollars(s.sizeUsd)}
                          <span className="ml-2 text-[10.5px] text-white/35">{s.boundBy} cap</span>
                        </td>
                        <td className={s.netUsd > 0 ? 'c-mint' : 'text-white/40'}>
                          ${s.netUsd.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="spec mt-4 p-5">
              <p className="font-manrope text-[14px] leading-[23px] text-white/55">
                Nothing the mandate would take right now. Every tradeable pair is inside the fee round
                trip, or has only one live pool to quote against.
              </p>
            </div>
          )}

          {/* Silence explained: which tokens had nothing, and why. */}
          <details className="mt-3">
            <summary className="verify cursor-pointer list-none">
              [ {sim.now.length - signals.length} of {sim.now.length} quiet — why ]
            </summary>
            <div className="font-data mt-3 grid gap-[5px] text-[11.5px] text-white/45">
              {sim.now
                .filter((e) => e.signal === null)
                .map((e) => (
                  <div key={e.symbol}>
                    <span className="text-white/70">{e.symbol}</span> · {e.reason}
                  </div>
                ))}
            </div>
          </details>
        </div>

        {/* ------------------------------------------------------------ ledger */}
        <div className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="lab">The ledger · one row a minute</span>
            <span className="font-data text-[11px] text-white/35">
              {ledger.entries.toLocaleString()} minutes recorded
              {ledger.since ? ` · since ${ledger.since.replace('T', ' ')} UTC` : ''}
              {ledger.storage === 'memory' ? ' · local memory, not persisted' : ''}
            </span>
          </div>

          <div className="spec mt-3 grid grid-cols-2 md:grid-cols-4">
            <div className="border-b border-r border-white/10 p-4 md:border-b-0">
              <span className="lab">Minutes shown</span>
              <div className="font-data mt-2 text-[22px]">{ledger.tail.length}</div>
            </div>
            <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
              <span className="lab">With a signal</span>
              <div className="font-data mt-2 text-[22px]">{minutesWithSignal}</div>
            </div>
            <div className="border-r border-white/10 p-4">
              <span className="lab">Net at quote, summed</span>
              <div className={`font-data mt-2 text-[22px] ${totalNetSeen > 0 ? 'c-mint' : ''}`}>
                ${totalNetSeen.toFixed(2)}
              </div>
              <div className="font-manrope mt-1 text-[10.5px] text-white/35">simulated · not realised</div>
            </div>
            <div className="p-4">
              <span className="lab">Fills from chain</span>
              <div className="font-data mt-2 text-[22px] text-white/30">0</div>
              <div className="font-manrope mt-1 text-[10.5px] text-white/35">none yet · nothing has traded</div>
            </div>
          </div>

          {ledger.tail.length ? (
            <div className="spec mt-4 max-h-[420px] overflow-y-auto">
              <table className="tb w-full min-w-[560px]">
                <thead>
                  <tr>
                    <th style={{ cursor: 'default' }}>Minute · UTC</th>
                    <th style={{ cursor: 'default' }}>Session</th>
                    <th style={{ cursor: 'default' }}>Signals</th>
                    <th style={{ cursor: 'default' }}>Best</th>
                    <th style={{ cursor: 'default' }}>Net at quote</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.tail.map((e) => {
                    const best = [...e.signals].sort((a, b) => b.netUsd - a.netUsd)[0];
                    const net = e.signals.reduce((a, s) => a + s.netUsd, 0);
                    return (
                      <tr key={e.minute}>
                        <td className="text-left">{e.minute.replace('T', ' ')}</td>
                        <td className="text-white/50">{e.session}</td>
                        <td>{e.signals.length}</td>
                        <td className="text-white/60">
                          {best ? `${best.symbol} +${best.spreadBps} bps` : <span className="text-white/25">—</span>}
                        </td>
                        <td className={net > 0 ? 'c-mint' : 'text-white/30'}>{net ? `$${net.toFixed(2)}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="font-manrope mt-4 max-w-[74ch] text-[12.5px] leading-[20px] text-white/40">
            Weekend reversion and corporate-action windows — the mandate&apos;s other two trades — need
            a position held across time and are not simulated yet. The ledger records only what can be
            evaluated the instant a reading exists. Saying so beats approximating them.
          </p>
        </div>

        <p className="font-manrope mt-10 text-[13px] text-white/40">
          Mechanics, the switch-on conditions and the arithmetic:{' '}
          <Link className="text-[#AFDDFF]" href="/docs/token">
            the token document
          </Link>
          . The API:{' '}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="text-[#AFDDFF]" href="/api/v1/treasury">
            /api/v1/treasury
          </a>
          .
        </p>
      </main>

      <Footer asOf={v.asOf} />
    </>
  );
}
