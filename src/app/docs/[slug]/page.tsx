import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/docs/Markdown';
import { allDocs, docSlugs, getDoc } from '@/lib/docs';

export const revalidate = 300;

/** Every document is known at build time, so all nine prerender. */
export function generateStaticParams() {
  return docSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: 'Not found — BASIS // SPREAD' };
  return {
    title: `${doc.meta.title} — BASIS // SPREAD`,
    description: doc.meta.blurb,
  };
}

/**
 * One document. The chrome — bar, sidebar, grid — belongs to the layout; the
 * headings rail is in the sidebar, so this is the document and nothing else.
 */
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const all = allDocs();
  const index = all.findIndex((d) => d.slug === slug);
  const prev = index > 0 ? all[index - 1] : undefined;
  const next = index >= 0 && index < all.length - 1 ? all[index + 1] : undefined;

  return (
    <article>
      <header>
        <h1 className="font-graphik max-w-[20ch] text-[34px] leading-[1.04] tracking-[-.025em] md:text-[46px]">
          {doc.meta.title}
        </h1>
        <p className="font-manrope mt-4 max-w-[74ch] text-[15.5px] leading-[26px] text-white/45">
          {doc.meta.blurb}
        </p>
      </header>

      <div className="mt-12">
        <Markdown body={doc.body} />
      </div>

      <nav className="mt-16 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-2">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="spec group p-5">
            <span className="lab">Previous</span>
            <div className="font-graphik mt-2 text-[16px] transition-colors group-hover:text-[#AFDDFF]">
              {prev.title}
            </div>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`} className="spec group p-5 sm:text-right">
            <span className="lab">Next</span>
            <div className="font-graphik mt-2 text-[16px] transition-colors group-hover:text-[#AFDDFF]">
              {next.title}
            </div>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
