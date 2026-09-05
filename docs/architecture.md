# Architecture

Next.js 15 App Router · React 18 · TypeScript strict · Tailwind 3.4 · deployed on Netlify.

## Why there is a server at all

The reference price API sends **no CORS headers**, so a browser cannot fetch it. That single
fact decides the shape of the whole application: the number everything is measured against has
to be read server-side.

Server components fetch both upstreams during render, so the first paint already contains real
data — no loading spinner, no client waterfall, no exposed API surface for the reference. See
`docs/data-sources.md` §1.

## Data flow

```
  RHJ prices ─┐
  RHJ assets ─┼─► lib/sources/rhj.ts ────┐
  RHJ actions ┘   (server-only)          │
                                          ├─► lib/readings.ts ──► getReadings()
  DEX Screener ─► lib/sources/dexscreener.ts                         │
                                                    ┌───────────────┴──────────────┐
                                                    ▼                              ▼
                                            app/page.tsx                   app/api/v1/*
                                        (server component)                (route handlers)
```

**`getReadings()` is the single assembler.** Both the page and every API route call it, so
they can never disagree about a number — which would be the fastest possible way to lose the
credibility the product is built on. Components never fetch upstream.

Revalidation is 60 s (`BASIS_REVALIDATE_SECONDS`). The reference endpoint is itself cached 15 s
upstream, so anything below that wastes calls.

## Server and client boundaries

Almost everything is a server component. `'use client'` appears only where browser state is
genuinely required:

| Island | Why |
|---|---|
| `site/SessionClock` | Ticks the clock, writes `data-session` on `<html>` |
| `hero/Hero` | Token switching, live spread, the pool field with its priced axis |
| `data/PoolField` | Canvas |
| `data/ReadoutTable` | Sorting and row expansion |
| `data/ExecutionCheck` | Size and token selection |
| `data/VerifyDrawer` | Open state, clipboard |
| `site/NodeDiagram` | Hover highlighting |
| `site/SessionStrip` | Live now-marker |
| `ui/SectionHeader` | IntersectionObserver reveal |

`npm run build` is the real guard here — a server-only import leaking into a client component
fails the build rather than surfacing at runtime.

## Degradation

Each source is timed independently and can fail on its own. When one does, the affected rows
come from `lib/fallback.ts` (the verified 2026-09-02 capture), are marked `stale`, and flag
`DARK`. `/api/v1/status` reports which source failed and how many rows are affected.

The UI then *says so* — a banner on the readout, and `[ CAPTURE ]` rather than `[ LIVE ]` in
the instrument bar. Nothing is silently presented as current.

## The session engine

`lib/session.ts` is pure and has no I/O, so it produces identical results on the server and in
the browser. That matters: the server renders `data-session` into the markup for a correct
first paint, and `SessionClock` then keeps it current. If the two disagreed, the page would
flash the wrong reference colour on hydration.

Eastern time comes from `Intl.DateTimeFormat` with a `timeZone`, not a fixed UTC offset, so
daylight saving is the platform's problem rather than ours.

## Design system as code

`app/globals.css` holds the tokens as CSS custom properties, the eight motion keyframes, and
the `:root[data-session]` overrides that re-tune the reference colour as the market state
changes. Because it is a custom property, changing the session restyles every figure on the
page at once with no prop drilling and no re-render of the data.

`/system` renders the **actual components**, never copies, so the design reference cannot
drift from what ships.

## Testing

`src/lib/logic.test.mjs` runs under `node --test` with no framework and no build step. It
covers the two things that would be genuinely damaging to get wrong: the session boundaries
that decide whether a reading is trustworthy at all, and the multiplier that decides whether a
number is real. Plus the execution maths, pinned to an independently verified figure
(NVDA $25k → $1,427).

## Deployment

**Netlify.** `netlify.toml` pins Node 22, declares the Next.js runtime explicitly rather than
leaving it to auto-detection, and sets the security headers. Server components and route
handlers run as functions; `revalidate` maps onto the platform's ISR, and the handlers under
`/api/v1` become serverless functions.

No environment variables are required — both upstreams are keyless, so a deploy with none set
still renders live numbers. The interpreter's three variables (`INTERPRETER_API_KEY`,
`INTERPRETER_ENDPOINT`, `INTERPRETER_MODEL`) are the only ones worth setting, and only to turn
on the explanations at `/desk`; unset, that panel says so and nothing else changes.

CI builds with `BASIS_OFFLINE=1` so the build never depends on a third-party API being up.
That also exercises the degradation path: every row falls back to the stored capture and
renders `DARK`.

Any Node host works. Add `output: 'standalone'` to `next.config.mjs` and run
`node .next/standalone/server.js`. A static export is not viable: it would lose the live
reference and the API routes, leaving a snapshot.
