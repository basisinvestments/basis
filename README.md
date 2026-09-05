# basis

**The distance between what a share is worth and what its token just traded for.**

A Stock Token on Robinhood Chain is meant to be worth the underlying share. In a Uniswap
pool it is worth whatever the last buyer paid. Nothing forces those two numbers to agree.
basis measures the gap — for every token, once a minute, with the market session attached
so a reader knows whether the reference behind it was even alive.

```
basis = ( pool / ( mid × uiMultiplier ) − 1 ) × 10 000     // basis points
```

---

[![check](https://github.com/basisinvestments/basis/actions/workflows/ci.yml/badge.svg)](https://github.com/basisinvestments/basis/actions/workflows/ci.yml)
[![live](https://img.shields.io/badge/live-melodic--syrniki--2d566a.netlify.app-AFDDFF?labelColor=000)](https://melodic-syrniki-2d566a.netlify.app)
![chain](https://img.shields.io/badge/Robinhood%20Chain-id%204663-FFB454?labelColor=000)
![api](https://img.shields.io/badge/API-read--only%20JSON%2C%20no%20key-AFDDFF?labelColor=000)
![source](https://img.shields.io/badge/source-published%20for%20audit-6E7488?labelColor=000)

**Live:** [melodic-syrniki-2d566a.netlify.app](https://melodic-syrniki-2d566a.netlify.app) · **Desk:** [/desk](https://melodic-syrniki-2d566a.netlify.app/desk) · **Docs:** [/docs](https://melodic-syrniki-2d566a.netlify.app/docs) · **API:** [/api/v1/basis](https://melodic-syrniki-2d566a.netlify.app/api/v1/basis)

![The share card, generated from live data at the moment a link is unfurled. This one was captured with the market shut.](docs/assets/share-card.png)

## At a glance

| | |
|---|---|
| **Measures** | The distance between a Stock Token's pool price and its underlying share, in basis points, re-read every 60 seconds with the market session attached |
| **Two numbers, on purpose** | *basis* — is the token priced right against the real world? *spread* — do the pools even agree with each other? NVDA has sat at 2 bps basis and 571 bps spread at the same instant |
| **Coverage** | 12 Stock Tokens on Robinhood Chain, every Uniswap v3/v4 pool above the dust floor — around 30 for NVDA alone |
| **Verifiable** | Three public endpoints reproduce any figure on the site. None of them are ours. If basis lies, one `curl` catches it |
| **The multiplier** | ERC-8056 applied in exactly one place. Skip it and a 4-for-1 split prints a +289% premium that does not exist |
| **Honesty gates** | `DARK` outranks every flag: a closed market is unmeasurable, not zero. The copy gate fails the build if an unbuilt feature is described as if it exists |
| **The desk** | A personal watchlist and an interpreter that explains a reading in plain English — and structurally cannot recommend a trade. "Should I buy" is not a question it accepts |
| **Stack** | Next.js 15 · React 18 · TypeScript strict · Tailwind 3.4 · Netlify · 15 logic tests · CI on every push |

## Project status

**v0.1 — live.** Readout, desk, interpreter, documentation, share card and the read-only API
are deployed and verified against the running site. The pieces that need persistence — a
hash-chained archive, the weekend board, alerts, history — are listed in
[`docs/roadmap.md`](docs/roadmap.md) with the thing each one is gated on, including the ones
that may never ship and why. Nothing on the site or in this README describes a feature that
does not exist.

## Why this is not another dashboard

**Every number can be checked without trusting us.** The reference price and the ERC-8056
multiplier come from the issuer's public API; the pool price comes from a public index.
Three commands, none of them ours, reproduce any figure on the site. If basis lies, one
`curl` catches it. That property is the product.

**The page knows what time it is.** The underlying market trades about 32 hours a week; the
pools trade all 168. When the exchange shuts, the reference freezes — Chainlink's own
documentation says these feeds "do not have heartbeats during off-hours" — while every pool
keeps quoting. The site renders that state: on a weekend the hero stops showing a spread and
starts counting how long the reference has been frozen.

**Nothing is displayed without provenance.** If a source fails, rows fall back to a stored
capture, are marked stale, and flag `DARK` — never silently presented as current.

---

## Quickstart

```bash
npm install
npm run dev          # http://localhost:3000
```

No API keys. Both upstream sources are keyless and public. `.env.example` documents the few
optional overrides, including `BASIS_OFFLINE=1` to force the fallback path.

```bash
npm run check        # typecheck + lint
npm test             # pure-logic tests: sessions, the multiplier trap, execution maths
npm run build        # production build
```

## The live API

The endpoints the documentation describes are real and running. The page and the API read
the same assembler (`src/lib/readings.ts`), so they cannot disagree about a number.

```bash
curl localhost:3000/api/v1/basis            # every tracked token
curl localhost:3000/api/v1/basis/NVDA       # one reading, in full
curl localhost:3000/api/v1/pools/NVDA       # every pool, cheapest first
curl "localhost:3000/api/v1/board?min_spread_bps=400"
curl localhost:3000/api/v1/sessions         # market state, next transition
curl localhost:3000/api/v1/status           # upstream health and the stale-row log
```

## Layout

| Path | What lives there |
|---|---|
| `src/lib/` | The measurement. `basis.ts` is the only place the multiplier is applied. |
| `src/lib/sources/` | The two upstream adapters. `rhj.ts` is `server-only` — see below. |
| `src/app/api/v1/` | The public API. |
| `src/components/` | `ui/` primitives, `data/` displays, `hero/`, `site/` chrome. |
| `docs/` | **Canonical reference** for product, data, API, design system and token. |

## The one architectural constraint

The reference price API returns **no CORS headers**, so a browser can never call it. Verified
2026-09-03. The reference has to be fetched server-side, which is why this is a Next.js app
with server components rather than a static page — a server is not a convenience here, it is
the only way basis can be live at all.

`src/lib/sources/rhj.ts` imports `server-only`, so an accidental client import becomes a
build error rather than a runtime mystery.

## Deploying

Hosted on **Netlify**. `netlify.toml` pins Node 22, declares the Next.js runtime explicitly
rather than relying on auto-detection, and sets the security headers. The API routes under
`/api/v1` become serverless functions; the pages keep their `revalidate`.

**Environment variables go in the Netlify UI, never in the repo.** Only one matters:

| Key | Needed? | Notes |
|---|---|---|
| `INTERPRETER_API_KEY` | optional | Turns on the interpreter at `/desk`. Unset, that panel says so and the rest of the site is unaffected. |
| `INTERPRETER_ENDPOINT` | optional | Where inference runs. Configuration, never compiled in. |
| `INTERPRETER_MODEL` | optional | Which model to ask. |
| `BASIS_FEATURED` | optional | Which symbols the landing page features. |
| `BASIS_OFFLINE` | optional | `1` forces the stored capture and skips every upstream call. |

Both data sources are public and keyless, so a deploy with no environment variables at all
still renders live numbers.

## Checks

```bash
npm run check   # types, lint, and the copy gate
npm test        # the measurement logic — the multiplier trap, pool selection, execution quotes
npm run build   # catches server/client boundary violations, the likeliest failure
```

`npm run gate` runs [`scripts/copy-gate.mjs`](scripts/copy-gate.mjs), which enforces the rules
in [`docs/brand-compliance.md`](docs/brand-compliance.md): the naming prohibitions, the
non-affiliation notice, and — the one that matters most — that no unbuilt feature is ever
named without its `NOT BUILT` marker beside it. A measurement product that quietly describes
things it has not built is the single failure this repo cannot afford. GitHub Actions runs the
same file, so a rule cannot pass locally and fail in CI.

## Reading further

Start with [`docs/use-cases.md`](docs/use-cases.md) for what it is for and the figures behind
each case, then [`docs/product.md`](docs/product.md) for what it measures and what it refuses
to claim, then [`docs/data-sources.md`](docs/data-sources.md) for the upstream quirks that shaped
the code. [`docs/roadmap.md`](docs/roadmap.md) includes the parts that may never ship, with
reasons.

---

basis is an independent project, not affiliated with Robinhood Markets, Inc., Robinhood
Assets (Jersey) Limited, Uniswap Labs or Chainlink. Market data and commentary on market
structure; not investment advice. See [`docs/brand-compliance.md`](docs/brand-compliance.md).
