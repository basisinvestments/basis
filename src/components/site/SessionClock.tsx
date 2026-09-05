'use client';

import { useEffect, useState } from 'react';
import { SESSION_LABEL, currentSession, etParts } from '@/lib/session';
import type { SessionState } from '@/lib/types';

/**
 * The page knows what time it is.
 *
 * basis's meaning changes with the market session, so the page does too. This writes
 * `data-session` onto <html>, which re-tunes the reference colour everywhere at once
 * through CSS custom properties — no prop drilling, no re-render of the data.
 *
 * The server already rendered a session state into the markup, so the first paint is
 * correct; this only keeps it current and ticks the clock.
 */
export function SessionClock({ initial }: { initial: SessionState }) {
  const [state, setState] = useState<SessionState>(initial);
  const [clock, setClock] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const p = etParts(now);
      const s = currentSession(now);
      setState(s);
      document.documentElement.setAttribute('data-session', s);
      const pad = (n: number) => String(n).padStart(2, '0');
      setClock(`${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)} ET`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <span className="dot" />
      <span className="font-manrope hidden text-[12px] text-white sm:inline">{SESSION_LABEL[state]}</span>
      <span className="font-data hidden text-[12px] text-white/50 md:inline">{clock || '--:--:-- ET'}</span>
    </>
  );
}
