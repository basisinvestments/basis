'use client';

import { useEffect, useState } from 'react';
import { MARKET_HOLIDAYS, etParts } from '@/lib/session';

/**
 * One week of the underlying market, in Eastern time, with a live marker for now.
 *
 * The hatched bands are the point: the reference is frozen for roughly 48 hours every
 * weekend while every pool on the chain keeps trading. That gap is where the large
 * dislocations live and where nobody is watching a dashboard.
 */

const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday-first

type Seg = [cls: string, minutes: number];

/* Segments always total 1440 minutes. */
function segmentsFor(weekday: number, holiday: boolean): Seg[] {
  if (weekday === 6 || holiday) return [['sg-cl', 1440]];
  if (weekday === 0) return [['sg-cl', 1200], ['sg-ov', 240]];       // Sunday reopens 20:00
  if (weekday === 5) return [['sg-ov', 240], ['sg-edge', 330], ['sg-reg', 390], ['sg-edge', 240], ['sg-cl', 240]];
  return [['sg-ov', 240], ['sg-edge', 330], ['sg-reg', 390], ['sg-edge', 240], ['sg-ov', 240]];
}

export function SessionStrip() {
  const [now, setNow] = useState<{ weekday: number; minutes: number } | null>(null);
  const [holidays, setHolidays] = useState<string[]>([]);

  useEffect(() => {
    function tick() {
      const p = etParts(new Date());
      setNow({ weekday: p.weekday, minutes: p.hour * 60 + p.minute });
    }
    tick();
    const id = setInterval(tick, 30_000);

    // Which of this week's days are exchange holidays.
    const today = new Date();
    const p = etParts(today);
    const monday = new Date(today.getTime() - ((p.weekday + 6) % 7) * 86_400_000);
    const hits: string[] = [];
    ORDER.forEach((wd, i) => {
      const key = etParts(new Date(monday.getTime() + i * 86_400_000)).key;
      if (MARKET_HOLIDAYS.has(key)) hits.push(`${NAMES[wd]} ${key.slice(5)}`);
    });
    setHolidays(hits);

    return () => clearInterval(id);
  }, []);

  const today = new Date();
  const tp = etParts(today);
  const monday = new Date(today.getTime() - ((tp.weekday + 6) % 7) * 86_400_000);

  return (
    <div className="spec p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="lab">
          This week · Eastern time · <span className="c-hot">now</span> marked
        </span>
        <span className="font-data text-[11px] text-white/45">
          {holidays.length ? `holiday: ${holidays.join(', ')} · reference frozen` : 'no exchange holiday this week'}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-[7px]">
        {ORDER.map((wd, i) => {
          const key = etParts(new Date(monday.getTime() + i * 86_400_000)).key;
          const segs = segmentsFor(wd, MARKET_HOLIDAYS.has(key));
          const isToday = now?.weekday === wd;
          return (
            <div key={wd} className="grid grid-cols-[36px_1fr] items-center gap-[10px]">
              <span className="lab">{NAMES[wd]}</span>
              <div className="dayrow">
                {segs.map((s, j) => (
                  <div key={j} className={s[0]} style={{ width: `${((s[1] / 1440) * 100).toFixed(2)}%` }} />
                ))}
                {isToday && now ? (
                  <div className="now" style={{ left: `${((now.minutes / 1440) * 100).toFixed(2)}%` }} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <span className="lab"><i className="sg-reg mr-2 inline-block h-2 w-3 align-middle" />regular</span>
        <span className="lab"><i className="sg-edge mr-2 inline-block h-2 w-3 align-middle" />pre · post</span>
        <span className="lab"><i className="sg-ov mr-2 inline-block h-2 w-3 align-middle" />overnight</span>
        <span className="lab"><i className="sg-cl mr-2 inline-block h-2 w-3 border border-white/10 align-middle" />reference frozen</span>
      </div>
    </div>
  );
}
