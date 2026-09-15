import type { Config } from '@netlify/functions';

/**
 * Once a minute, ask the site to record the ledger.
 *
 * /api/v1/treasury records the current minute on every call, idempotently. This
 * exists so the ledger fills when nobody is looking at the site — a record that
 * only exists while it has an audience is not a record. The function does nothing
 * itself; the site's own assembler does the work, so there is one code path.
 */
export default async () => {
  const base = process.env.URL;
  if (!base) return new Response('no site url', { status: 500 });
  const res = await fetch(`${base}/api/v1/treasury?tail=1`, {
    headers: { 'user-agent': 'basis-ledger-tick' },
  });
  return new Response(res.ok ? 'recorded' : `upstream ${res.status}`, { status: res.ok ? 200 : 502 });
};

export const config: Config = {
  schedule: '* * * * *',
};
