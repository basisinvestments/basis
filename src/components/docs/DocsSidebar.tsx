'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { NavDoc } from '@/lib/docs';

/**
 * The documentation rail.
 *
 * Every document is always listed; the one being read expands to show its own
 * headings, and the heading under the top of the viewport is marked as you scroll.
 * Collapsing the inactive documents keeps eighty-seven headings from becoming the
 * page — the reader gets the shape of the whole reference and the detail of the part
 * they are actually in.
 *
 * Below `lg` it becomes a disclosure above the content rather than a fixed rail,
 * because a persistent 260px column on a phone is most of the screen.
 */

/** Which heading owns the top of the viewport. Measured, not observed — the sections
 *  are far taller than any sensible IntersectionObserver band. */
function useActiveHeading(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(',');

  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (!list.length) {
      setActive(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = 120; // just under the fixed bar
      let current: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = id;
      }
      const atFoot =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActive(atFoot ? (list[list.length - 1] ?? current) : (current ?? list[0] ?? null));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [key]);

  return active;
}

export function DocsSidebar({ nav }: { nav: NavDoc[] }) {
  const pathname = usePathname() ?? '/docs';
  const currentSlug = pathname.startsWith('/docs/') ? pathname.slice('/docs/'.length) : null;
  const current = nav.find((d) => d.slug === currentSlug);
  const active = useActiveHeading(current?.sections.map((s) => s.id) ?? []);
  const [open, setOpen] = useState(false);

  // A route change with the mobile drawer open leaves it covering the new page.
  useEffect(() => setOpen(false), [pathname]);

  const list = (
    <nav className="flex flex-col">
      <Link
        href="/docs"
        className={`font-manrope border-l py-[6px] pl-4 text-[13px] transition-colors ${
          currentSlug === null
            ? 'border-[#AFDDFF] text-[#AFDDFF]'
            : 'border-white/10 text-white/50 hover:border-white/40 hover:text-white'
        }`}
      >
        All documents
      </Link>

      {nav.map((doc, i) => {
        const isCurrent = doc.slug === currentSlug;
        return (
          <div key={doc.slug} className={i === 0 ? 'mt-3' : ''}>
            <Link
              href={`/docs/${doc.slug}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={`font-manrope flex items-baseline gap-2 border-l py-[6px] pl-4 text-[13.5px] leading-[19px] transition-colors ${
                isCurrent
                  ? 'border-[#AFDDFF] font-medium text-white'
                  : 'border-white/10 text-white/55 hover:border-white/40 hover:text-white'
              }`}
            >
              <span
                className={`font-data text-[10px] ${isCurrent ? 'text-[#AFDDFF]' : 'text-white/25'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {doc.title}
            </Link>

            {/* Only the open document lists its headings. */}
            {isCurrent && doc.sections.length ? (
              <div className="mb-2 flex flex-col">
                {doc.sections.map((s) => {
                  const on = active === s.id;
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      aria-current={on ? 'true' : undefined}
                      className={`font-manrope border-l py-[4px] text-[12.5px] leading-[17px] transition-colors ${
                        s.level === 3 ? 'pl-[38px]' : 'pl-[26px]'
                      } ${
                        on
                          ? 'border-[#AFDDFF] text-[#AFDDFF]'
                          : 'border-white/10 text-white/40 hover:border-white/40 hover:text-white/80'
                      }`}
                    >
                      {s.text}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Wide: a sticky rail that scrolls independently of the document. */}
      <aside className="hidden lg:block">
        <div className="sticky top-[92px] max-h-[calc(100svh-112px)] overflow-y-auto pr-2">
          <span className="lab mb-3 block">Documentation</span>
          {list}
        </div>
      </aside>

      {/* Narrow: a disclosure, closed by default. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="font-manrope flex w-full items-center justify-between border border-white/15 px-4 py-3 text-[13px] text-white/70 transition-colors hover:border-white/40 hover:text-white"
        >
          <span>
            <span className="lab mr-3">Docs</span>
            {current?.title ?? 'All documents'}
          </span>
          <span className="font-data text-[11px] text-white/40">{open ? 'CLOSE' : 'BROWSE'}</span>
        </button>
        {open ? <div className="mt-4">{list}</div> : null}
      </div>
    </>
  );
}
