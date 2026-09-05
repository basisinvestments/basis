import Link from 'next/link';

import { ExecutionCheck } from '@/components/data/ExecutionCheck';
import { ReadoutTable } from '@/components/data/ReadoutTable';
import { ActionCalendar } from '@/components/desk/ActionCalendar';
import { Hero } from '@/components/hero/Hero';
import { Engine } from '@/components/site/Engine';
import { Footer } from '@/components/site/Footer';
import { InstrumentBar } from '@/components/site/InstrumentBar';
import { NodeDiagram } from '@/components/site/NodeDiagram';
import { SessionStrip } from '@/components/site/SessionStrip';
import { TokenAnatomy } from '@/components/site/TokenAnatomy';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CAPTURE_ISO } from '@/lib/fallback';
import { dateStampUtc } from '@/lib/format';
import { getCorporateActions, getPools, getReadings } from '@/lib/readings';
import { featuredSymbols } from '@/lib/registry';
import type { Pool, Reading } from '@/lib/types';

/**
 * The landing page is the product.
 *
 * Not a description of a readout — the readout, rendered server-side from live
 * sources, with every figure carrying its timestamp and a way to check it against
 * services that are not ours. The token comes last, after the visitor has already
 * used the thing, and shows mechanics rather than a price.
 *
 * Ordered by what a stranger needs, not by what is easiest to explain. The cost of
 * landing in the wrong pool was section four, roughly 3,600px down; it is the most
 * concrete thing here and it now comes first. Below each headline the detail sits
 * behind a toggle, so the page is short to scan and nothing has been removed.
 */
export const revalidate = 60;

const SECTION = 'border-b border-white/10 px-5 py-[44px] md:px-[35px] md:py-[60px]';

export default async function Page() {
  const featured = featuredSymbols();

  // One shared assembler, so the page and /api/v1 can never disagree about a number.
  const [{ readings, session, asOf, allStale }, actions] = await Promise.all([
    getReadings(),
    getCorporateActions(),
  ]);

  // Full ladders for the featured set — the hero field, the row expander and the
  // execution check all read these. Fetched in parallel, each degrading on its own.
  const ladderEntries = await Promise.all(
    featured.map(async (s) => [s, (await getPools(s))?.pools ?? []] as const),
  );
  const ladders: Record<string, Pool[]> = Object.fromEntries(ladderEntries);

  const featuredReadings = featured
    .map((s) => readings.find((r) => r.symbol === s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const references = Object.fromEntries(readings.map((r) => [r.symbol, r.reference.price]));
  const names = Object.fromEntries(readings.map((r) => [r.symbol, r.name]));
  const live = !allStale;

  // The multiplier explainer needs a token actually carrying one. Pick the largest
  // deviation from 1.0 so the arithmetic is unmistakable rather than a rounding
  // artefact — nine of 194 qualified on 2026-09-02.
  const multiplierExample: Reading | null =
    readings
      .filter((r) => r.reference.multiplier !== 1 && r.pool)
      .sort(
        (a, b) => Math.abs(b.reference.multiplier - 1) - Math.abs(a.reference.multiplier - 1),
      )[0] ?? null;

  return (
    <>
      <InstrumentBar session={session} live={live} />

      <main id="top" className="relative z-10">
        <Hero
          readings={featuredReadings}
          ladders={ladders}
          initialSession={session}
          capturedAt={CAPTURE_ISO}
        />

        {/* ------------------------------------------------------- 02 cost */}
        <section id="s2" className={SECTION}>
          <SectionHeader num="02" title="What the wrong pool costs">
            One token, a dozen pools, a dozen prices. Far more people lose money landing in the wrong
            one than will ever make money on the gap.
          </SectionHeader>
          <div className="mt-6">
            <ExecutionCheck
              symbols={featured}
              ladders={ladders}
              references={references}
              names={names}
            />
          </div>
        </section>

        {/* ---------------------------------------------------- 03 anatomy */}
        <section id="s3" className={SECTION}>
          <SectionHeader num="03" title="What you are holding, and where the numbers come from">
            Three prices, none of them ours, so a reading can be re-derived without trusting us. Hover
            a source to see which figures it feeds.
          </SectionHeader>

          <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-2">
            <TokenAnatomy example={multiplierExample} />
            <div className="flex flex-col">
              <NodeDiagram />
              <div className="font-data mt-6 max-w-[74ch] text-[12px] leading-[22px] text-white/50">
                basis = ( <span data-src="pool" className="c-pool">pool</span> ÷ ({' '}
                <span data-src="ref" className="c-ref">mid × uiMultiplier</span> ) − 1 ) × 10 000{' '}
                <span className="text-white/30">{'// is it priced right against the real world'}</span>
                <br />
                spread = ( <span data-src="pool" className="c-pool">dearest ÷ cheapest</span> − 1 ) × 10 000{' '}
                <span className="text-white/30">{'// do the pools even agree with each other'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- 04 readout */}
        <section id="s4" className={SECTION}>
          <SectionHeader num="04" title="The readout">
            Every tracked Stock Token against the real market. Sort by any column; open a row for its
            pool distribution and the commands that reproduce the number.
          </SectionHeader>

          {session === 'closed' ? (
            <div className="mt-6 max-w-[74ch] border p-4" style={{ borderColor: 'var(--ref)' }}>
              <span className="lab" style={{ color: 'var(--ref)' }}>Right now</span>
              <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/60">
                The underlying market is closed and the reference is frozen, so every row reads DARK. The
                gap is unmeasurable, not zero — the pools are still trading against a price that stopped
                moving.
              </p>
            </div>
          ) : null}

          {allStale ? (
            <div className="mt-6 max-w-[74ch] border p-4" style={{ borderColor: 'var(--warn)' }}>
              <span className="lab" style={{ color: 'var(--warn)' }}>Degraded</span>
              <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/60">
                An upstream source is unavailable, so these rows come from the stored capture of{' '}
                {dateStampUtc(CAPTURE_ISO)} and are flagged DARK. They are not current. See{' '}
                <a className="text-[#AFDDFF]" href="/api/v1/status">/api/v1/status</a> for which source failed.
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <ReadoutTable readings={readings} ladders={ladders} />
          </div>
          <p className="lab mt-3">
            Reference and pool in USD · basis and spread in bps · depth is the deepest pool&apos;s TVL, which
            is not executable size · {readings.length} of ~194 tokens tracked in this build
          </p>

          {/* The desk is live and free, and until now was reachable only from a
              footer link that did not say what it was. */}
          <div className="spec mt-6 flex flex-wrap items-center justify-between gap-5 p-5">
            <div>
              <span className="lab">Your own desk · free</span>
              <p className="font-manrope mt-2 max-w-[62ch] text-[13.5px] leading-[22px] text-white/55">
                Watch your own tokens, ask what a reading means in plain English, and see which corporate
                actions are about to pause an oracle while the pools keep trading.
              </p>
            </div>
            <Link className="btn btn-ghost shrink-0" href="/desk">
              Open the desk
            </Link>
          </div>
        </section>

        {/* --------------------------------------------------- 05 sessions */}
        <section id="s5" className={SECTION}>
          <SectionHeader num="05" title="When the market sleeps">
            The pools trade 168 hours a week, the underlying about 32. Chainlink on these feeds: they
            &ldquo;do not have heartbeats during off-hours.&rdquo;
          </SectionHeader>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <SessionStrip />
              <blockquote className="mt-7 border-l pl-5" style={{ borderColor: 'var(--ref)' }}>
                <p className="font-manrope text-[15.5px] leading-[25px] text-white/85">
                  &ldquo;With the equity market closed and no market makers on the other side, the on-chain
                  price ran 35 times past the real one.&rdquo;
                </p>
                <cite className="font-manrope mt-3 block text-[12.5px] not-italic text-white/45">
                  A Robinhood Chain launchpad, 31 August 2026, on what happened to AMC that Saturday — and
                  announcing &ldquo;risk labels so traders see a premium before they buy rather than after.&rdquo;
                </cite>
              </blockquote>
            </div>

            {/* The same component the desk uses. The inline version here filtered on
                IN_PROGRESS and captioned the result as imminent, which put dividends
                weeks out under a header saying the oracle was about to pause. */}
            <ActionCalendar actions={actions} />
          </div>
        </section>

        {/* ------------------------------------------------------ 06 proof */}
        <section id="s6" className={SECTION}>
          <SectionHeader num="06" title="How you would catch us lying">
            A measurement is only worth reading if someone who distrusts the publisher can check it.
            Two of these work today; two do not exist yet and say so.
          </SectionHeader>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="spec p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="lab c-pool">01 · Re-derive it</span>
                <span className="flag f-TIGHT">LIVE</span>
              </div>
              <h3 className="font-graphik mt-3 text-[17px]">Three commands, none of them ours</h3>
              <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/50">
                Every row expands to the issuer&apos;s price and multiplier endpoints and the pool index.
                If basis lies, one curl catches it.
              </p>
              <pre className="drawer mt-4 text-[10.5px]">{`# QQQ · 16:35 → 17:21 UTC
reference  708.77 → 707.84
pool       724.12 → 719.98
basis      +217 → +172 bps
# the gap closed while we watched`}</pre>
            </div>

            {/* The strongest thing the product does that the page never showed — it
                lived in a comment in src/lib/basis.ts and an assertion in the tests. */}
            <div className="spec p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="lab c-pool">02 · Ranked on turnover, not size</span>
                <span className="flag f-TIGHT">LIVE</span>
              </div>
              <h3 className="font-graphik mt-3 text-[17px]">The biggest pool is often a trap</h3>
              <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/50">
                A pool can hold millions and trade nothing, and its stale quote drags a naive reading
                anywhere. We rank on the deepest pool that turned over a tenth of its own depth in 24h.
              </p>
              <pre className="drawer mt-4 text-[10.5px]">{`# TSLA · 2026-09-03
largest pool  $418,744 held · $8,835 traded · 2%
              quotes 356.24
active pools  382-384       reference 383.29

ranked on size  -706 bps  a dislocation that isn't there
ranked on trade  -28 bps  TIGHT`}</pre>
            </div>

            <div className="spec p-5 md:col-span-2">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                <span className="lab c-pool">03 · 04 · Two more, once anything persists</span>
                <span className="flag f-DARK">NOT BUILT</span>
              </div>
              <p className="font-manrope mt-3 max-w-[92ch] text-[13.5px] leading-[22px] text-white/50">
                <b className="font-medium text-white/70">A hash-chained archive</b> — each sample storing
                the hash of the one before, the head anchored on chain daily, every missed minute logged
                with its cause. Then{' '}
                <b className="font-medium text-white/70">a weekend board</b>: the frozen reference posted
                each Friday, settled each Monday, so a claim made before the outcome can be checked
                after it. Both need a host with a database. This build keeps nothing between
                requests, so neither runs and no board exists. A feed claiming perfect uptime is one you
                should not read — so is a feed claiming an archive it does not have.
              </p>
              <p className="font-manrope mt-3 text-[13px] leading-[21px] text-white/40">
                What is live today:{' '}
                <a className="text-[#AFDDFF]" href="/api/v1/status">/api/v1/status</a>
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ 07 token */}
        <section id="s7" className={SECTION}>
          <SectionHeader num="07" title="The token, and what it is for">
            The readout is free and stays free. $BASIS is a claim on three engines running off the same
            data — one live from the first block, two gated on published conditions. No price on this page.
          </SectionHeader>

          <div className="spec mt-6 grid grid-cols-2 md:grid-cols-4">
            <div className="border-b border-r border-white/10 p-4 md:border-b-0">
              <span className="lab">Supply</span>
              <div className="font-graphik mt-2 text-[24px]">1,000,000,000</div>
              <div className="font-manrope mt-1 text-[11.5px] text-white/40">fixed · no mint function</div>
            </div>
            <div className="border-b border-white/10 p-4 md:border-b-0 md:border-r">
              <span className="lab">At launch</span>
              <div className="font-graphik mt-2 text-[24px]">100%</div>
              <div className="font-manrope mt-1 text-[11.5px] text-white/40">
                into the pool · no withdraw function
              </div>
            </div>
            <div className="border-r border-white/10 p-4">
              <span className="lab">Burned</span>
              <div className="font-data mt-2 text-[24px]">0</div>
              <div className="font-manrope mt-1 text-[11.5px] text-white/40">live counter · every tx linked</div>
            </div>
            <div className="p-4">
              <span className="lab">Treasury</span>
              <div className="font-data mt-2 text-[24px]">$0</div>
              <div className="font-manrope mt-1 text-[11.5px] text-white/40">arms at $50,000</div>
            </div>
          </div>

          <p className="lab mt-3">
            The launchpad&apos;s locker holds the pool and there is no withdraw function to call · no
            pre-mine and no team allocation is structurally possible · the only way the creator holds
            tokens is a disclosed buy at launch price
          </p>

          <div className="mt-5 grid items-start gap-3 lg:grid-cols-3">
            <Engine
              num="Engine 01"
              title="Buyback & burn"
              status="Live from block one"
              statusFlag="TIGHT"
              rules={[
                'SPLIT 50% market buy to the dead address · 50% to the treasury',
                'CADENCE weekly, one transaction',
                'SOURCE·1 creator share of the pool swap fee',
                'SOURCE·2 integrator licences, paid in USDG',
                'PROOF wallet public · burn counter on this page',
                'CAVEAT fee mechanics are the launchpad’s, not ours',
              ]}
              extra={
                <div className="mt-5 border-t border-white/10 pt-4">
                  <span className="lab">What the project earns · not a holder return</span>
                  <div className="font-data mt-3 grid max-w-[420px] grid-cols-[1fr_auto_auto] gap-x-5 gap-y-[6px] text-[11.5px]">
                    <span className="text-white/35">Pool volume / day</span>
                    <span className="text-right text-white/35">Each line / day</span>
                    <span className="text-right text-white/35">Each line / month</span>
                    <span className="text-white/60">$50,000</span>
                    <span className="text-right text-white/60">$175</span>
                    <span className="text-right text-white/60">$5,250</span>
                    <span className="text-white/60">$250,000</span>
                    <span className="text-right text-white/60">$875</span>
                    <span className="text-right text-white/60">$26,250</span>
                    <span className="text-white/60">$1,000,000</span>
                    <span className="text-right text-white/60">$3,500</span>
                    <span className="text-right text-white/60">$105,000</span>
                  </div>
                  <p className="font-manrope mt-3 max-w-[68ch] text-[12px] leading-[19px] text-white/40">
                    The burn and the treasury each take half, so both columns apply to each line.
                    Arithmetic on a 1% swap fee, a 70% creator share and a 30-day month — the
                    launchpad&apos;s fee mechanics, not ours, and unverified against a live pool because
                    none exists. This is what the project would earn at those volumes. It is not a yield,
                    not a distribution, and not a forecast of the volume or of the token.
                  </p>
                </div>
              }
            >
              <b className="font-medium text-white">
                Every dollar the project earns is split in half — one half buys the token off the
                market and destroys it, the other funds the treasury.
              </b>{' '}
              Two sources: the creator share of the pool&apos;s swap fees, and what launchpads pay to put
              the premium warning beside their own buy button.
            </Engine>

            <Engine
              num="Engine 02"
              title="The basis treasury"
              status="Arms at $50k"
              statusFlag="WATCH"
              rules={[
                'FUNDING half of Engine 01, permanently',
                'ARMS trading starts at $50,000 · ~10 months at $50k daily volume',
                'ASSETS canonical Stock Tokens + USDG only',
                'SIZE at most 5% of the shallower pool',
                'EXPOSURE at most 20% per token',
                'LEVERAGE none · no borrowing, no perps',
                'PROFIT 50% compounds · 50% burns',
                'LOSS stays inside the treasury · the burn never covers it',
                'COSTS infrastructure paid from this line, itemised first',
                'PROOF address public · monthly P&L with tx links',
                'REVIEW pooled capital managed for profit — first item for legal review before it arms',
              ]}
            >
              <b className="font-medium text-white">
                The instrument finds mispricings. The treasury trades them.
              </b>{' '}
              Pool-to-pool, weekend reversion, and corporate-action windows where the oracle pauses and
              the pools do not. The rule that keeps the feed honest:{' '}
              <b className="font-medium text-white/80">publish first, then trade the published number</b>
              , fills timestamped beside the alerts so the ordering is checkable. It costs the treasury
              its best fills; that is the price of the feed being worth reading.
            </Engine>

            <Engine
              num="Engine 03"
              title="Oracle staking"
              status="May never ship"
              statusFlag="DARK"
              rules={[
                'READ basis(token) → bps, ref, t, session',
                'STAKE reporters lock $BASIS to post readings',
                'FEES per read, USDG, to the reporters behind it',
                'SLASH a reading challenged against the reference',
                'GATE·1 90 days of history, weekends included',
                'GATE·2 a named protocol that wants to read it',
              ]}
            >
              <b className="font-medium text-white">
                basis moves on chain and the token becomes the thing you stake to run it.
              </b>{' '}
              A contract other protocols read — a peg guard, a collateral haircut, a router avoiding a
              dislocated pool. The second gate is the real one: with no protocol wanting to read it,
              building this would be infrastructure cosplay. The roadmap says may-never-ship for that
              reason.
            </Engine>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Link className="btn btn-ghost" href="/docs/token">Read the mandate</Link>
            <span className="lab">Not a sale. Not a forecast. A description of mechanics.</span>
          </div>
        </section>
      </main>

      <Footer asOf={asOf} />
    </>
  );
}
