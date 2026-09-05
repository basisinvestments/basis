'use client';

import { useEffect } from 'react';

/**
 * Hover any figure, and everything not from the same source dims.
 *
 * The CSS for this already existed — `html.hi-ref`, `html.hi-pool`, `html.hi-orc`
 * dim every `[data-src]` that does not match and glow the ones that do. What was
 * missing was the trigger: only the three squares in the sources diagram set the
 * class, while fourteen figures across the site carried `data-src` and did nothing
 * when hovered. This makes every carrier a trigger.
 *
 * One delegated listener on the document, no per-element handlers. Pointer events,
 * so it never fires from a touch — on a phone there is no hover and this would be
 * a dead class stuck on the page.
 *
 * Clearing is delayed a beat. Two cells of the same source sit with a gap between
 * them, and without the delay crossing that gap clears the highlight and relights
 * it — a flicker on every row.
 */

const SOURCES = ['ref', 'pool', 'orc'] as const;
const CLEAR_AFTER_MS = 140;

export function SourceHighlight() {
  useEffect(() => {
    const root = document.documentElement;
    let current: string | null = null;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;

    function apply(src: string | null) {
      if (src === current) return;
      for (const s of SOURCES) root.classList.remove(`hi-${s}`);
      if (src && (SOURCES as readonly string[]).includes(src)) root.classList.add(`hi-${src}`);
      current = src;
    }

    function onOver(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      const carrier = (e.target as Element | null)?.closest?.('[data-src]');
      const src = carrier?.getAttribute('data-src') ?? null;

      if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = undefined;
      }
      if (src) apply(src);
      else clearTimer = setTimeout(() => apply(null), CLEAR_AFTER_MS);
    }

    function onLeave() {
      if (clearTimer) clearTimeout(clearTimer);
      apply(null);
    }

    document.addEventListener('pointerover', onOver, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointerover', onOver);
      root.removeEventListener('pointerleave', onLeave);
      if (clearTimer) clearTimeout(clearTimer);
      apply(null);
    };
  }, []);

  return null;
}
