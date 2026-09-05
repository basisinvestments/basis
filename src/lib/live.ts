'use client';

import { useEffect, useRef, useState } from 'react';
import type { Reading } from '@/lib/types';

/**
 * Keeps a server-rendered set of readings current without a reload.
 *
 * The pages are static with a 60-second revalidate, which means a value never
 * changes while someone is looking at it — the page a visitor sees is the page they
 * loaded. For an instrument that is wrong: the point is that it is on. This polls
 * `/api/v1/basis`, the same assembler that rendered the page, on the same cadence.
 *
 * Paused while the tab is hidden. A background tab polling an API it will not
 * display is a cost with no reader.
 *
 * One fetch serves every instance. The landing page mounts this twice (hero and
 * readout) and the desk once; without sharing, each would make its own identical
 * call every minute. An in-flight promise is shared, and a result younger than a
 * few seconds is reused rather than refetched.
 */

const INTERVAL_MS = 60_000;
const FRESH_MS = 5_000;

let inflight: Promise<Reading[] | null> | null = null;
let last: { at: number; readings: Reading[] } | null = null;

async function fetchReadings(): Promise<Reading[] | null> {
  if (last && Date.now() - last.at < FRESH_MS) return last.readings;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/v1/basis', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as { readings?: Reading[] };
      if (!Array.isArray(data.readings) || !data.readings.length) return null;
      last = { at: Date.now(), readings: data.readings };
      return data.readings;
    } catch {
      return null; // the page keeps what it has; a failed poll is not an error to show
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useLiveReadings(initial: Reading[]): Reading[] {
  const [readings, setReadings] = useState(initial);
  const initialRef = useRef(initial);

  // A new server render (navigation back, revalidation) resets the baseline.
  useEffect(() => {
    if (initialRef.current !== initial) {
      initialRef.current = initial;
      setReadings(initial);
    }
  }, [initial]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    async function pull() {
      if (document.visibilityState !== 'visible') return;
      const next = await fetchReadings();
      if (!cancelled && next) setReadings(next);
    }

    function schedule() {
      timer = setTimeout(async () => {
        await pull();
        if (!cancelled) schedule();
      }, INTERVAL_MS);
    }

    function onVisible() {
      // Coming back to the tab after a while: refresh now rather than in up to 60s.
      if (document.visibilityState === 'visible') void pull();
    }

    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return readings;
}
