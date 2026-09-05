'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Numbered section header. The numbering is the site's spine — it matches the nav,
 * so a reader always knows where they are.
 *
 * Below the fold this is the only thing that animates, and only once. Staggering
 * every child would read as decoration; the choreography belongs to the hero.
 */
export function SectionHeader({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  return (
    <div ref={ref} className={`rv${seen ? ' in' : ''}`}>
      <div className="flex items-baseline gap-4">
        <span className="font-data text-[12px] tracking-[.1em] text-[#AFDDFF]">{num}</span>
        <h2 className="font-graphik text-[27px] tracking-[-.02em] md:text-[34px]">{title}</h2>
      </div>
      {children ? (
        <p className="font-manrope mt-4 max-w-[68ch] text-[15px] leading-[25px] text-white/50">{children}</p>
      ) : null}
    </div>
  );
}
