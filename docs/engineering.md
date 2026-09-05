# Engineering rules

Product code for basis, a premium-and-discount readout for Stock Tokens on Robinhood Chain.
This repository is canonical for the **product**, the **data**, the **API** and the **design**
**system**. Launch strategy is kept separately and is not part of this repository.

---

## Hard rules

1. **No transactions, ever.** This codebase reads public market data and renders it. It never
   signs, submits, simulates or constructs a transaction, holds funds, or takes custody. If a
   feature would require a wallet signature for anything beyond identity, stop and raise it.
2. **Never commit secrets.** No private keys, seed phrases, keystore files, treasury addresses
   with spending authority, or provider credentials. `.gitignore` covers the obvious cases;
   the judgement is still yours. basis needs no keys to run — if a change introduces one, that
   is a design decision worth questioning first.
3. **No number without provenance.** Every figure rendered or returned carries where it came
   from and when it was read. A stale value is labelled stale and flagged `DARK`. Silently
   showing a frozen number as current is the exact failure this product exists to catch in
   other people's dashboards.
4. **The multiplier is applied in one place.** `src/lib/basis.ts`. Never compare a pool price
   to a raw share price anywhere else. CrowdStrike carries a ×4.0 multiplier after a split;
   the naive comparison prints a +286% premium that does not exist.
5. **`DARK` outranks every other flag.** If the market is closed, the reference is stale, or
   the row came from the fallback, no claim about the gap can be made. It is unmeasurable,
   not zero.
6. **Gross is labelled gross.** A published spread is the difference between two quoted
   prices. It is not what you can execute — these are concentrated-liquidity pools, so TVL is
   not depth and the quoted price is the top of book. Never imply otherwise.
7. **No financial-advice framing.** State the measurement. Never recommend a trade, imply a
   return, or describe the token as an investment. The decision is always the reader's.

## Brand and naming (non-negotiable)

Robinhood's Terms of Service and Brand Guidelines bind any external-facing copy:

- Write **"Robinhood Chain"** in full. Never "Hood Chain", "Chain", or "Robinhood" alone.
- Say **"Stock Tokens"**, never "tokenized stocks" or "tokenized equities".
- **Never reference `$HOOD` or `HOOD`** in any context.
- No Robinhood mark, name or feather in a token name, ticker, logo, artwork or contract
  metadata.
- A non-affiliation line appears in the footer of every page.

Full detail and the verbatim clauses: `docs/brand-compliance.md`.

## Architecture constraints

- **`src/lib/sources/rhj.ts` is `server-only` and must stay that way.** The reference API
  sends no CORS headers, so a browser cannot call it. An accidental client import is a build
  error by design — do not remove the `server-only` import to "fix" one.
- **`getReadings()` in `src/lib/readings.ts` is the single assembler.** Both the page and every
  API route go through it, so they can never disagree about a number. Do not fetch upstream
  from a component.
- **Client islands are the exception, not the default.** `'use client'` belongs only on things
  that genuinely need browser state: the session clock, the canvas field, sorting, the
  calculator, drawers. Data rendering stays on the server.
- **Size canvases from a `ResizeObserver` on the element**, never a window `resize` listener.
  A pane or tab that starts collapsed reports zero width and never fires a window resize, so
  the backing store would stay 1px wide forever and the field would silently never appear.

## Conventions

- TypeScript strict, including `noUncheckedIndexedAccess`. Array access needs a guard.
- Two money formatters and they are **not** interchangeable: `depth()` is lossy and for pool
  TVL; `dollars()` is exact and for money a person pays. Using the lossy one for an
  overpayment figure once rendered $1,427 as "$1k".
- Gaps are signed, in basis points. Percentages only in prose.
- Design tokens live in `src/app/globals.css` as custom properties. Semantic data colours
  (`--ref`, `--pool`, `--hot`) mean something and are never used decoratively.
- Comments explain **why**, not what. The interesting comments in this codebase are the ones
  recording a trap: CORS, the multiplier, concentrated liquidity, the ResizeObserver.

## Before you call something done

```bash
npm run check    # tsc --noEmit && next lint
npm test         # session boundaries, the multiplier trap, execution maths
npm run build    # catches server/client boundary violations — the likeliest failure
```

**Never run `npm run build` while `npm run dev` is running.** They share `.next/`, the build
wins, and the dev server is left serving `Cannot find module './331.js'` — a 500 on pages that
worked a second ago, with the API routes still fine, which makes it look like a code bug. Stop
the dev server first, or recover with `npm run dev:clean`.

Stopping it needs care: killing the `npm run dev` wrapper leaves the `next dev` node child
holding port 3000, so the next start silently lands on 3001 while the orphan serves 500s from a
`.next/` that has been wiped underneath it. Kill by port, not by job:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

Then check the degradation path actually degrades: `BASIS_OFFLINE=1 npm run dev` should render
the whole site from the stored capture with every row flagged `DARK`, not error.
