import Link from 'next/link';
import { InstrumentBar } from '@/components/site/InstrumentBar';
import { currentSession } from '@/lib/session';

/**
 * The instrument's voice, not the framework's. Everything else on the site was
 * designed; the one page that would show the Next.js default is the one a person
 * lands on by mistake, which is the worst moment to look unfinished.
 */
export const metadata = { title: 'No reading — BASIS // SPREAD' };

export default function NotFound() {
  return (
    <>
      <InstrumentBar session={currentSession()} live />
      <main className="relative z-10 flex min-h-[100svh] flex-col justify-center px-5 pb-24 pt-[92px] md:px-[35px]">
        <div className="max-w-[60ch]">
          <span className="lab">No reading at this address</span>
          <div className="reading mt-6 text-[92px] text-white/20 sm:text-[140px]" aria-hidden="true">
            404
          </div>
          <h1 className="font-graphik mt-4 text-[28px] leading-[1.05] tracking-[-.02em] sm:text-[36px]">
            Nothing is measured here.
          </h1>
          <p className="font-manrope mt-4 text-[15px] leading-[25px] text-white/50">
            The page you asked for does not exist, or has moved. The readout, the desk and the
            documentation are all one link away — and every figure on them carries the time it
            was read.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="btn" href="/">
              <span className="text-[16px] leading-none">&#10022;</span>
              Open the readout
            </Link>
            <Link className="btn btn-ghost" href="/desk">
              The desk
            </Link>
            <Link className="btn btn-ghost" href="/docs">
              Documentation
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
