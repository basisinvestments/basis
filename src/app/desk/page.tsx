import Link from 'next/link';

import { ActionCalendar } from '@/components/desk/ActionCalendar';
import { Watchlist } from '@/components/desk/Watchlist';
import { Footer } from '@/components/site/Footer';
import { InstrumentBar } from '@/components/site/InstrumentBar';
import { SessionStrip } from '@/components/site/SessionStrip';
import { interpreterConfigured } from '@/lib/interpret';
import { getCorporateActions, getPools, getReadings } from '@/lib/readings';
import { allSymbols } from '@/lib/registry';
import type { Pool } from '@/lib/types';

/**
 * The desk — a personal instrument panel.
 *
 * A landing page earns a hero. A desk does not: it is opened repeatedly to check
 * state, so the state goes first and the explanation goes away. The landing page
 * already said what basis is.
 *
 * Secondary context — the week's session strip, the action calendar, what does not
 * exist yet — sits below the fold in a single row rather than three full sections.
 */
export const metadata = { title: 'Desk — BASIS // SPREAD' };
export const revalidate = 60;

export default async function DeskPage() {
  const [{ readings, session, asOf }, actions] = await Promise.all([
    getReadings(),
    getCorporateActions(),
  ]);

  const ladderFor = ['NVDA', 'SPY', 'AMC', 'AAPL', 'QQQ', 'TSLA'];
  const ladderEntries = await Promise.all(
    ladderFor.map(async (s) => [s, (await getPools(s))?.pools ?? []] as const),
  );
  const ladders: Record<string, Pool[]> = Object.fromEntries(ladderEntries);

  return (
    <>
      <InstrumentBar session={session} live={readings.some((r) => !r.stale)} />

      <main className="relative z-10 px-5 pb-16 pt-[76px] md:px-[35px] md:pt-[84px]">
        {/* One line of identity, then straight into the data. */}
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-graphik text-[22px] tracking-[-.02em]">Desk</h1>
          <span className="lab">Your tokens · click a row for its pools · ask about any of them below</span>
        </div>

        <Watchlist
          readings={readings}
          ladders={ladders}
          available={allSymbols()}
          interpreterConfigured={interpreterConfigured()}
          session={session}
        />

        {/* Context, deliberately below the working area and in one row. */}
        <div className="mt-12 grid gap-4 border-t border-white/10 pt-8 lg:grid-cols-2">
          <div>
            <span className="lab mb-3 block">The week · when the reference is frozen</span>
            <SessionStrip />
          </div>
          <div>
            <span className="lab mb-3 block">Scheduled to move</span>
            <ActionCalendar actions={actions} />
          </div>
        </div>

        {/* Three cards became one line. These do not exist yet, and saying so does
            not require a section. */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="font-manrope max-w-[80ch] text-[13px] leading-[21px] text-white/40">
            <span className="flag f-DARK mr-3">SOON</span>
            <b className="font-medium text-white/70">Alerts</b> that fire only while the reference is
            frozen, a <b className="font-medium text-white/70">weekend board</b> settled every Monday,
            and <b className="font-medium text-white/70">history</b> showing how fast gaps actually
            close. All three need somewhere to keep data, which this build does not have — the order
            and the reasoning are in the{' '}
            <Link className="text-[#AFDDFF]" href="/docs">
              documentation
            </Link>
            .
          </p>
        </div>

        <p className="font-manrope mt-10 text-[13px] text-white/40">
          <Link className="text-[#AFDDFF]" href="/">
            ← The full readout, every token
          </Link>
        </p>
      </main>

      <Footer asOf={asOf} />
    </>
  );
}
