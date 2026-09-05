'use client';

import { usePathname } from 'next/navigation';

/**
 * Content arrives; the bar stays put.
 *
 * Re-keying on the pathname remounts the wrapper on every route change, which
 * replays a short entrance on the new page's content while the fixed header does
 * not move. Four pages start to feel like one instrument with different faces.
 *
 * This is not the View Transitions API — that needs React 19's ViewTransition and
 * this is React 18. It is a keyed CSS entrance, which is honest about what it is and
 * degrades to nothing under prefers-reduced-motion like everything else here.
 */
export function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-in">
      {children}
    </div>
  );
}
