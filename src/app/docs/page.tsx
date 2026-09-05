import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { allDocs } from '@/lib/docs';

export const metadata = {
  title: 'Docs — BASIS // SPREAD',
  description:
    'The written reference for basis: what it measures, where every number comes from, the API, and what might never ship.',
};
export const revalidate = 300;

/**
 * The index.
 *
 * Each entry opens the actual markdown from `docs/` — the same file a reader would
 * open in the repository, not a second copy written for the web. This page used to
 * render ten titles and blurbs under a promise that the real port was coming.
 *
 * The bar, the sidebar and the grid belong to `layout.tsx`.
 */
export default function DocsPage() {
  const docs = allDocs();

  return (
    <>
      <div className="max-w-[74ch]">
        <span className="lab">Documentation</span>
        <h1 className="font-graphik mt-4 text-[38px] leading-[1.02] tracking-[-.025em] md:text-[52px]">
          How every number is built.
        </h1>
        <p className="font-manrope mt-5 text-[16px] leading-[26px] text-white/50">
          Ten documents, canonical for both product and design. They are the markdown files in{' '}
          <code className="font-data text-[14px] text-[#AFDDFF]">docs/</code>, rendered here rather
          than rewritten — so the page and the repository cannot drift apart. They include the
          parts that are uncertain and the parts that may never ship.
        </p>
      </div>

      <div id="d-contents" className="spec mt-10">
        {docs.map((d, i) => (
          <Link
            key={d.slug}
            href={`/docs/${d.slug}`}
            className="group flex gap-5 border-b border-white/[0.06] p-5 transition-colors last:border-b-0 hover:bg-[rgba(175,221,255,0.04)]"
          >
            <span className="font-data text-[12px] tracking-[.1em] text-[#AFDDFF]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h2 className="font-graphik text-[17px] transition-colors group-hover:text-[#AFDDFF]">
                {d.title}
              </h2>
              <p className="font-manrope mt-1 max-w-[74ch] text-[13.5px] leading-[22px] text-white/45">
                {d.blurb}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div id="d-api" className="mt-12">
        <SectionHeader num="—" title="Call it now">
          These endpoints are live in this build. They read the same assembler the landing page
          uses, so the page and the API cannot disagree about a number.
        </SectionHeader>
        <div className="spec mt-6 p-5">
          <pre className="drawer">
            {[
              'curl /api/v1/basis',
              'curl /api/v1/basis/NVDA',
              'curl /api/v1/pools/NVDA',
              'curl "/api/v1/board?min_spread_bps=400"',
              'curl /api/v1/sessions',
              'curl /api/v1/status',
            ].join('\n')}
          </pre>
          {/* Plain anchors: JSON endpoints, not pages. A client-side route transition
              would render nothing — the browser needs a real navigation. */}
          <div className="mt-5 flex flex-wrap gap-4">
            {['basis', 'pools/NVDA', 'board', 'sessions', 'status'].map((p) => (
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a key={p} className="btn btn-ghost" href={`/api/v1/${p}`}>
                /v1/{p}
              </a>
            ))}
          </div>
        </div>
      </div>

      <p className="font-manrope mt-10 text-[13px] text-white/40">
        <Link className="text-[#AFDDFF]" href="/">
          ← Back to the readout
        </Link>
      </p>
    </>
  );
}
