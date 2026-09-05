'use client';

import { useState } from 'react';

/**
 * One engine: what it does, whether it is on, and — on demand — the rules it is
 * bound by.
 *
 * The published rules are the point of the section, but printed inline they were
 * sixteen lines of specification across three cards and turned the token section
 * into a third of the page's prose. Behind a toggle they are still one click from
 * anyone who wants to hold the project to them.
 *
 * Laid out as a column so three engines fit one row rather than three. Stacked, the
 * section ran past a full screen on its own.
 */
export function Engine({
  num,
  title,
  status,
  statusFlag,
  children,
  rules,
  extra,
}: {
  num: string;
  title: string;
  status: string;
  statusFlag: 'TIGHT' | 'WATCH' | 'DARK';
  children: React.ReactNode;
  rules: string[];
  /** Optional detail that opens with the rules — the revenue table, for one. */
  extra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="spec p-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <span className="lab">{num}</span>
          <span className={`flag f-${statusFlag}`}>{status}</span>
        </div>
        <h3 className="font-graphik mt-2 text-[19px]">{title}</h3>
        <div className="mt-3">
          <p className="font-manrope text-[13.5px] leading-[22px] text-white/55">
            {children}
          </p>
          <button type="button" className="verify mt-4" onClick={() => setOpen((v) => !v)}>
            {open ? '[ hide the published rules ]' : '[ the published rules ]'}
          </button>

          {open ? (
            <div className="mt-4">
              <div className="font-data grid gap-x-6 gap-y-[6px] text-[11.5px] text-white/50">
                {rules.map((r) => {
                  const [key, ...rest] = r.split(' ');
                  return (
                    <div key={r}>
                      <span className="c-pool">{key}</span> {rest.join(' ')}
                    </div>
                  );
                })}
              </div>
              {extra}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
