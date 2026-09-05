'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SessionClock } from './SessionClock';
import type { SessionState } from '@/lib/types';

/**
 * Proof the instrument is on, before anything else on the page loads — and the only
 * navigation on the site.
 *
 * The numbered list is the CURRENT page's table of contents, not a fixed copy of the
 * landing page's. The first build shipped one hardcoded set of `#s1`–`#s7` anchors on
 * every page, so on /desk, /docs and /system all seven pointed at ids that did not
 * exist there. A link that silently does nothing is worse than no link.
 *
 * Pages with no sections worth listing get no numbers — the desk is under two screens.
 */

type Section = readonly [string, string, string];

const SECTIONS: Record<string, readonly Section[]> = {
  '/': [
    ['01', 'READING', 's1'],
    ['02', 'THE COST', 's2'],
    ['03', 'ANATOMY', 's3'],
    ['04', 'READOUT', 's4'],
    ['05', 'SESSIONS', 's5'],
    ['06', 'PROOF', 's6'],
    ['07', 'THE TOKEN', 's7'],
  ],
  '/docs': [
    ['01', 'CONTENTS', 'd-contents'],
    ['02', 'API', 'd-api'],
  ],
  // A document page (/docs/<slug>) is intentionally absent: it builds its own contents
  // rail from the markdown headings, which the bar cannot know statically. The `?? []`
  // fallback gives it no numbered nav, which is correct.
  '/system': [
    ['01', 'COLOUR', 'y-colour'],
    ['02', 'FLAGS', 'y-flags'],
    ['03', 'SURFACES', 'y-surfaces'],
    ['04', 'MOTION', 'y-motion'],
  ],
};

const PAGES = [
  // 'HOME', not 'READOUT' — section 04 of the landing page is called the readout and
  // two entries reading READOUT in one bar is a collision, not a shorthand.
  ['/', 'HOME'],
  ['/desk', 'DESK'],
  ['/docs', 'DOCS'],
  ['/system', 'SYSTEM'],
] as const;

/** Sentence case for the menu, except where the label is an acronym. */
const PROPER: Record<string, string> = { API: 'API' };
const title = (s: string) => PROPER[s] ?? s.charAt(0) + s.slice(1).toLowerCase();

/** Home matches only itself; every other page also owns its subpaths, so DOCS stays
 *  lit while you are reading /docs/product. */
const isCurrent = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

/**
 * Which section is under the bar right now. Null on pages with no sections.
 *
 * Measured on scroll rather than observed. IntersectionObserver fires on threshold
 * crossings, and these sections are far taller than any sensible observation band —
 * once one spans the band it never fires again, so the highlight sticks on whichever
 * section happened to fire first. Reading rects against a fixed line is deterministic.
 */
function useActiveSection(ids: readonly string[]): string | null {
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
      const line = 96; // just under the 56px bar
      let current: string | null = null;
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) {
          current = id;
          break;
        }
        if (r.top <= line) current = id; // passed it; keep the latest
      }
      // The last section is often shorter than the run-out at the foot of the page.
      const atFoot =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActive(atFoot ? (list[list.length - 1] ?? current) : current);
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

export function InstrumentBar({ session, live }: { session: SessionState; live: boolean }) {
  const pathname = usePathname() ?? '/';
  const sections = useMemo(() => SECTIONS[pathname] ?? [], [pathname]);
  const ids = useMemo(() => sections.map(([, , id]) => id), [sections]);
  const active = useActiveSection(ids);
  const [menu, setMenu] = useState(false);

  // A route change with the menu still open leaves it covering the new page.
  useEffect(() => setMenu(false), [pathname]);

  return (
    <header className="fixed left-0 top-0 z-40 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="flex h-[56px] items-center gap-5 px-5 md:gap-[40px] md:px-[35px]">
        <Link
          href="/"
          className="font-graphik whitespace-nowrap text-[15px] leading-[21px] text-white sm:text-[17px]"
        >
          BASIS // SPREAD
        </Link>

        <nav className="hidden items-center gap-[26px] lg:flex">
          {sections.map(([n, label, id]) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={on ? 'true' : undefined}
                className="flex items-center gap-[3px] border-b border-transparent pb-[2px] transition-colors"
                style={on ? { borderBottomColor: '#AFDDFF' } : undefined}
              >
                <span className="font-manrope text-[12px] text-[#AFDDFF]/80">{n}.</span>
                <span
                  className={`font-manrope text-[12px] hover:text-[#AFDDFF] ${
                    on ? 'text-[#AFDDFF]' : 'text-white/80'
                  }`}
                >
                  {label}
                </span>
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-[12px]">
          <SessionClock initial={session} />
          <span className="font-manrope hidden text-[12px] text-[#AFDDFF] sm:ml-[8px] sm:inline">
            {live ? '[ LIVE ]' : '[ CAPTURE ]'}
          </span>

          {/* Every page link, from lg up. Below that they move into the menu — the old
              bar hid SYSTEM on a phone, and /docs and /system have no footer, so it
              was genuinely unreachable there. */}
          <nav className="ml-[8px] hidden items-center gap-[12px] lg:flex">
            {PAGES.map(([href, label]) => {
              const on = isCurrent(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? 'page' : undefined}
                  className={`font-manrope border-b border-transparent pb-[2px] text-[12px] transition-colors hover:text-[#AFDDFF] ${
                    on ? 'text-[#AFDDFF]' : 'text-white/60'
                  }`}
                  style={on ? { borderBottomColor: '#AFDDFF' } : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-controls="bar-menu"
            className="font-manrope border border-white/20 px-[9px] py-[4px] text-[11px] text-white/70 transition-colors hover:border-white/50 hover:text-white lg:hidden"
          >
            {menu ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </div>

      {menu ? (
        <div
          id="bar-menu"
          className="max-h-[70svh] overflow-y-auto border-t border-white/10 bg-black px-5 py-4 lg:hidden"
        >
          <span className="lab">Pages</span>
          <div className="mt-3 flex flex-col">
            {PAGES.map(([href, label]) => {
              const on = isCurrent(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`font-manrope border-b border-white/[0.06] py-[10px] text-[14px] ${
                    on ? 'text-[#AFDDFF]' : 'text-white/75'
                  }`}
                >
                  {title(label)}
                  {on ? <span className="lab ml-3">current</span> : null}
                </Link>
              );
            })}
          </div>

          {sections.length ? (
            <>
              <span className="lab mt-6 block">On this page</span>
              <div className="mt-3 flex flex-col">
                {sections.map(([n, label, id]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    onClick={() => setMenu(false)}
                    className="font-manrope flex gap-3 border-b border-white/[0.06] py-[10px] text-[14px] text-white/75"
                  >
                    <span className="font-data text-[12px] text-[#AFDDFF]/80">{n}.</span>
                    {title(label)}
                  </a>
                ))}
              </div>
            </>
          ) : null}

          <span className="font-manrope mt-5 block text-[12px] text-white/40">
            {live ? 'Live data' : 'Stored capture'}
          </span>
        </div>
      ) : null}
    </header>
  );
}
