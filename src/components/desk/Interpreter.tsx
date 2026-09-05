'use client';

import { useEffect, useState } from 'react';
import { Seg } from '@/components/ui/Seg';
import { CHIPS, type ChipKey } from '@/lib/interpret';

/**
 * Explains a reading. Never recommends.
 *
 * Questions are chips, not a text box — so "should I buy" is not something a user
 * can ask, rather than something the model has to refuse. Each returned factor
 * carries the field it came from and is rendered beside it; the server has already
 * dropped any factor whose field did not resolve against the reading it served.
 *
 * It sits open on the desk with its own token picker. It used to appear only inside
 * an expanded watchlist row, which meant the most useful thing on the page was
 * invisible until you happened to click one — and once found, nothing said what it
 * was for or what it would refuse to do.
 */

interface Factor {
  claim: string;
  field: string;
  value: string;
}

interface Answer {
  symbol: string;
  question: string;
  asOf: string;
  stale: boolean;
  summary: string;
  factors: Factor[];
  droppedFactors: number;
  caveat: string;
}

const DAILY_CAP = 12;
const CAP_KEY = 'basis.interpret.usage';

function readUsage(): { day: string; n: number } {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(CAP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { day: string; n: number };
      if (parsed.day === today) return parsed;
    }
  } catch {
    /* storage unavailable — treat as fresh */
  }
  return { day: today, n: 0 };
}

function bumpUsage(): number {
  const u = readUsage();
  const next = { day: u.day, n: u.n + 1 };
  try {
    localStorage.setItem(CAP_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next.n;
}

/** What it is and what it will not do. Shown whether or not a key is set. */
function Preamble() {
  return (
    <p className="font-manrope mt-3 max-w-[76ch] text-[13.5px] leading-[22px] text-white/55">
      Plain English for anyone who does not read basis points. Pick a token, then pick a question,
      and it explains what that token&apos;s reading currently says.{' '}
      <b className="font-medium text-white/80">It never recommends a trade.</b> There is no text box
      on purpose — &ldquo;should I buy&rdquo; is not one of the questions, so it is not something that
      has to be refused. Every sentence it returns names the field it came from, and anything it
      could not point at is dropped before you see it.
    </p>
  );
}

export function Interpreter({
  symbol,
  symbols,
  onSymbolChange,
  configured,
}: {
  symbol: string;
  /** The watched list, so the picker offers what the desk is already showing. */
  symbols: string[];
  onSymbolChange: (s: string) => void;
  configured: boolean;
}) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState<ChipKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Server and first client render must agree, so start at zero and adopt the stored
  // count after mount. Reading localStorage during render printed 0/12 on the server
  // and 1/12 in the browser, which is a hydration mismatch — it only surfaced once
  // this panel started rendering on load instead of after a click.
  const [used, setUsed] = useState(0);

  useEffect(() => {
    setUsed(readUsage().n);
  }, []);

  // An NVDA answer under an AMC heading would be worse than no answer at all.
  useEffect(() => {
    setAnswer(null);
    setError(null);
  }, [symbol]);

  async function ask(chip: ChipKey) {
    if (used >= DAILY_CAP) {
      setError(`Free tier is ${DAILY_CAP} questions a day. Resets at midnight UTC.`);
      return;
    }
    setLoading(chip);
    setError(null);
    try {
      const res = await fetch('/api/v1/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, chip }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? 'Could not produce an interpretation.');
        setAnswer(null);
      } else {
        setAnswer(data as Answer);
        setUsed(bumpUsage());
      }
    } catch {
      setError('Network error reaching the interpreter.');
    } finally {
      setLoading(null);
    }
  }

  if (!configured) {
    return (
      <div className="spec p-5">
        <span className="lab">Ask about a reading</span>
        <Preamble />
        <p className="font-manrope mt-4 max-w-[76ch] text-[13px] leading-[21px] text-white/40">
          Not running on this deployment. Everything else on the desk works without it.
        </p>
      </div>
    );
  }

  return (
    <div className="spec p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="lab">Ask about a reading</span>
        <span className="font-data text-[11px] text-white/35">
          {used}/{DAILY_CAP} today · free
        </span>
      </div>

      <Preamble />

      {symbols.length > 1 ? (
        <div className="mt-5">
          <span className="lab mb-2 block">1 · Which token</span>
          <Seg items={symbols} value={symbol} onChange={onSymbolChange} label="Choose a token" />
        </div>
      ) : null}

      <div className="mt-5">
        <span className="lab mb-2 block">
          {symbols.length > 1 ? '2 · ' : ''}What do you want to know about {symbol}
        </span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CHIPS) as ChipKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => ask(key)}
              disabled={loading !== null}
              className="font-manrope border border-white/20 px-[12px] py-[7px] text-[12px] text-white/70 transition-colors hover:border-white/50 hover:text-white disabled:opacity-40"
            >
              {loading === key ? 'Reading…' : CHIPS[key].label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="font-data mt-4 text-[12px]" style={{ color: 'var(--warn)' }}>
          {error}
        </p>
      ) : null}

      {answer ? (
        <div className="mt-5 border-t border-white/10 pt-5">
          <span className="lab">
            {answer.symbol} · {answer.question}
          </span>
          <p className="font-manrope mt-3 max-w-[68ch] text-[15px] leading-[25px] text-white/85">
            {answer.summary}
          </p>

          {answer.factors.length ? (
            <div className="mt-4 flex flex-col gap-[10px]">
              {answer.factors.map((f, i) => (
                <div key={i} className="grid gap-[10px] sm:grid-cols-[1fr_auto] sm:items-baseline">
                  <p className="font-manrope text-[13.5px] leading-[21px] text-white/60">{f.claim}</p>
                  <span className="font-data whitespace-nowrap text-[11.5px] text-white/40">
                    <span className="c-pool">{f.field}</span> = {f.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {answer.caveat ? (
            <p
              className="font-manrope mt-4 max-w-[68ch] border-l pl-4 text-[13px] leading-[21px] text-white/55"
              style={{ borderColor: 'var(--warn)' }}
            >
              {answer.caveat}
            </p>
          ) : null}

          <p className="lab mt-4">
            Read at {new Date(answer.asOf).toISOString().slice(11, 16)} UTC
            {answer.stale ? ' · from a stored capture' : ''}
            {answer.droppedFactors > 0
              ? ` · ${answer.droppedFactors} unverifiable claim${answer.droppedFactors === 1 ? '' : 's'} dropped`
              : ''}
          </p>
        </div>
      ) : (
        /* An empty panel under a row of buttons reads as broken. Say what lands here. */
        <p className="font-manrope mt-5 max-w-[68ch] border-t border-white/10 pt-5 text-[13px] leading-[21px] text-white/35">
          The answer appears here, each claim beside the field it was read from — so you can check it
          against the table above rather than take its word for it.
        </p>
      )}
    </div>
  );
}
