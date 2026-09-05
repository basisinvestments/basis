# Roadmap

Ordered by what unlocks the next thing, not by what demos best. No dates — dates on a
one-person project are decoration.

---

## Shipped

The landing page renders live from both upstreams with honest degradation. Six API endpoints
serve the same assembler the page uses. Session engine with holiday handling, the ERC-8056
multiplier applied in exactly one place, the readout with sorting and per-row pool ladders, the
execution check with depth guards, the verify drawer, the canvas pool field, and the design
system as CSS custom properties with `/system` rendering the real components.

## Next

| Stage | Contents | Gate |
|---|---|---|
| **v0.2** | Port the full `/docs` and `/system` pages from the written reference into React. | — |
| **v0.3** | All 194 tokens rather than the tracked 12; registry generated from `/rhj/assets` with our own addresses as the authority. | v0.2 stable |
| **v0.4** | Persistence: a store behind `/v1/history/{symbol}`, hash-chained samples, the gap log, and `/v1/status` reporting real uptime instead of the current request. | a host with a database |
| **v0.5** | Alerts and webhooks. The session filter is the useful part — `"session": "closed"` only fires in the frozen window. | v0.4 |
| **v0.6** | The weekend board, posted publicly each Friday and settled each Monday. This is the track record, and it costs nothing but consistency. | v0.4 |
| **v1** | The embeddable risk badge. This is the distribution play: a launchpad quoting new tokens against Stock Tokens inherits the premium problem and has an obvious reason to display the warning. | a first integrator |

---

## What might not ship

Documentation that only describes the happy path is marketing. These are genuinely uncertain,
with the actual reason rather than a hedge.

### Continuous executable quotes — **may not be possible**

A real net figure needs a quoter call per pool, per size, per token. Roughly 194 tokens × ~20
pools × 4 sizes is **15,000 calls a minute**, which no public RPC will serve and a paid one
prices well above this project's budget.

Likely outcome: quotes become **on-demand only**, computed when someone asks for a specific
token and size, with the continuous feed staying gross-and-labelled. `/v1/quote` may never have
a batch equivalent.

### Uniswap v4 pool keys — **hard, not blocked**

Quoting a v4 pool requires its PoolKey: currency pair, fee, tick spacing, hooks. Screener APIs
return an opaque pool id instead, so the keys have to be recovered by indexing `Initialize`
events from the PoolManager and maintaining that index forever. Solvable, but it is the largest
piece of engineering in the plan and everything above sits behind it.

### The signal itself could shrink — **market risk**

The weekend dislocation exists because nothing makes a market when the reference is frozen.
That is already being addressed: a launchpad said publicly it approached market makers about
weekend coverage, and the issuer is reported to be adding liquidity. **If they succeed, the
most dramatic part of this product gets smaller.** The pool-to-pool and cross-pair work
survives; the 35× headline probably does not repeat.

### The reference API has no contract — **dependency risk**

Keyless, undocumented as to stability, no service commitment. It could be gated, throttled or
moved without notice. Fallbacks exist — the on-chain Chainlink feed covers tokens that have
one, a commercial equities API covers the rest — but a free product with a paid dependency is
a different product.

### Real-time websocket — **later**

Persistent connections at any scale need more than one small server. It ships when there are
enough holder-tier users to justify it. The 60-second revalidated endpoint is the honest
default.

### The on-chain oracle — **may never ship**

Engine 03 in `docs/token.md` is the most valuable idea here and the least certain. It needs
contracts, a staking and dispute mechanism, and — the real gate — **a protocol that actually
wants to read it**. If no launchpad or lending market integrates, building it would be
infrastructure cosplay. It ships when a named consumer asks, and if none does, this section is
where that gets recorded.

### Cross-chain coverage — **later**

Tokenised equities exist elsewhere; Solana's xStocks carry real liquidity and the same basis
logic applies. Different chain, different pool infrastructure, different reference API. Out of
scope until the first chain is genuinely finished.

---

## Standing commitment

### Corrected 2026-09-03 — two roadmap items were on the landing page in the present tense

Found while restructuring the page, under the heading *How you would catch us lying*, which is
the worst place on the site to overstate anything.

- **Hash-chained samples (v0.4).** The page read *"Each sample stores the hash of the one before,
  and the head is anchored on chain daily. Every minute missed is logged with its cause, in
  public."* Nothing persists between requests in this build. Now stated as a plan, flagged
  `NOT BUILT`, with the gate named.
- **The weekend board (v0.6).** The page read *"Every Friday at 20:00 ET the frozen reference is
  published. Every Monday, what the pools did against it."* No board exists and nothing has been
  posted. Same treatment. The footer separately advertised *"Weekend report · Mondays 09:00 UTC"*,
  which nothing schedules; that line is gone.
- **The on-chain oracle (Engine 03).** The token section showed only `GATE 90 days of history`,
  which reads as a schedule for something on its way. This section says it may never ship, and
  the real gate is a protocol that wants to read it. Both now appear on the card.

Standing check, since the phrasing is easy to reintroduce:

```bash
grep -rn "Each sample stores\|the frozen reference is published\|Weekend report" src/   # must be empty
```

### Corrected 2026-09-03 — the landing page implied imminence it had not checked

The corporate-action panel filtered on `status === 'IN_PROGRESS'` and captioned the result
*"Each one pauses that token's oracle while it processes"* — the exact mistake `docs/data-sources.md`
warns about. On the day it was found it listed dividends 13 to 28 days out. It now renders the
desk's `ActionCalendar`, which separates the 14-day window from the 2-day imminence badge. One
component, one behaviour, both pages.

Anything in this section that turns out to be impossible gets marked as such **here**, with the
reason, rather than quietly disappearing from the roadmap. A roadmap that only ever grows is a
roadmap nobody should trust.
