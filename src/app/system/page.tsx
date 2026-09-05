import Link from 'next/link';
import { InstrumentBar } from '@/components/site/InstrumentBar';
import { Flag } from '@/components/ui/Flag';
import { currentSession } from '@/lib/session';
import type { Flag as FlagType } from '@/lib/types';

export const metadata = { title: 'System — BASIS // SPREAD' };
export const revalidate = 300;

const FLAGS: FlagType[] = ['TIGHT', 'WATCH', 'WIDE', 'DARK', 'ACTION'];

/**
 * The design system renders the ACTUAL components, never copies. That is the whole
 * point of putting it in the app rather than in a separate document — the reference
 * and the shipped code cannot drift apart, because they are the same thing.
 */
export default function SystemPage() {
  return (
    <>
      <InstrumentBar session={currentSession()} live />
      <main className="relative z-10 px-5 pb-24 pt-[92px] md:px-[35px] md:pt-[112px]">
        <div className="max-w-[74ch]">
          <span className="lab">Design reference</span>
          <h1 className="font-graphik mt-4 text-[38px] leading-[1.02] tracking-[-.025em] md:text-[54px]">
            The system behind the readout.
          </h1>
          <p className="font-manrope mt-5 text-[16px] leading-[26px] text-white/50">
            The full written reference is in the repository at{' '}
            <code className="font-data text-[14px] text-[#AFDDFF]">docs/design-system.md</code>. Every
            specimen below is the live component, so this page cannot drift from what ships.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div id="y-colour" className="spec p-5">
            <span className="lab">Data semantics</span>
            <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/50">
              Three colours that carry meaning and are never used decoratively. The reference desaturates
              with the session state — reload this page on a weekend and the amber will have changed.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <div className="h-[34px]" style={{ background: 'linear-gradient(90deg,var(--ref),transparent)' }} />
                <div className="font-data c-ref mt-2 text-[12px]">--ref · the real world</div>
              </div>
              <div>
                <div className="h-[34px]" style={{ background: 'linear-gradient(90deg,#AFDDFF,transparent)' }} />
                <div className="font-data c-pool mt-2 text-[12px]">--pool · on-chain</div>
              </div>
              <div>
                <div className="h-[34px]" style={{ background: 'linear-gradient(90deg,#FF6B4A,transparent)' }} />
                <div className="font-data c-hot mt-2 text-[12px]">--hot · the gap</div>
              </div>
            </div>
          </div>

          <div id="y-flags" className="spec p-5">
            <span className="lab">Flags</span>
            <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/50">
              Outline only — a filled pill would compete with the CTA, the one solid accent block allowed
              on a screen. DARK outranks every numeric band.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {FLAGS.map((f) => (
                <Flag key={f} flag={f} />
              ))}
            </div>

            <span className="lab mt-7 block">Type roles</span>
            <div className="reading c-hot mt-3 text-[56px]">571</div>
            <p className="font-manrope mt-1 text-[12px] text-white/40">
              Reading — the only element allowed above H1 size
            </p>
            <div className="font-graphik mt-4 text-[24px]">Display · Graphik</div>
            <div className="font-manrope mt-1 text-[14px] text-white/60">Interface · Manrope</div>
            <div className="font-data mt-1 text-[14px]">Data · 225.03 tabular</div>
          </div>

          <div id="y-surfaces" className="spec p-5">
            <span className="lab">Surfaces</span>
            <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/50">
              There are no filled cards. A surface is its border and at most a 1.5% white wash over pure
              black. Square corners everywhere.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn">
                <span className="text-[16px] leading-none">&#10022;</span>
                Primary
              </button>
              <button type="button" className="btn btn-ghost">
                Secondary
              </button>
            </div>
          </div>

          <div id="y-motion" className="spec p-5">
            <span className="lab">Motion</span>
            <p className="font-manrope mt-2 text-[13.5px] leading-[22px] text-white/50">
              Two curves. Expo-out for entrances, expo-in-out for interaction. Nothing loops, nothing
              bounces. Below the fold only the section header animates, and only once.
            </p>
            <div className="font-data mt-4 text-[12px] leading-[21px] text-white/60">
              <div><span className="c-pool">ENTRANCE</span> cubic-bezier(0.16, 1, 0.3, 1)</div>
              <div><span className="c-pool">INTERACTIVE</span> cubic-bezier(0.76, 0, 0.24, 1)</div>
            </div>
          </div>
        </div>

        <p className="font-manrope mt-10 text-[13px] text-white/40">
          <Link className="text-[#AFDDFF]" href="/">← Back to the readout</Link>
        </p>
      </main>
    </>
  );
}
