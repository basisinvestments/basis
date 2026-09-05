import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { InstrumentBar } from '@/components/site/InstrumentBar';
import { docsNav } from '@/lib/docs';
import { currentSession } from '@/lib/session';

/**
 * The documentation shell: rail on the left, document on the right.
 *
 * The nav is built here rather than per page, so the whole reference is visible from
 * any document — you can see there are nine and where you are among them without
 * going back to an index. It is computed at build time from the markdown itself,
 * which means adding a heading to a file adds it to the sidebar and nothing has to
 * be kept in step by hand.
 */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const nav = docsNav();

  return (
    <>
      <InstrumentBar session={currentSession()} live />
      <main className="relative z-10 px-5 pb-24 pt-[92px] md:px-[35px] md:pt-[112px]">
        <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[262px_minmax(0,1fr)] lg:gap-14">
          <DocsSidebar nav={nav} />
          <div className="min-w-0">{children}</div>
        </div>
      </main>
    </>
  );
}
