# Product

## The landing page, and why it is ordered this way

Rebuilt 2026-09-03. It measured 7,123px — 7.9 screens at 1440x900, 2,878 words, about a twelve
minute read — and the most persuasive fact on it, the dollar cost of landing in the wrong pool,
sat 3,600px down as section four of seven.

Now 5,922px, 6.58 screens, with four themes added that were not there before. The order:

| | Section | What it answers |
|---|---|---|
| Hero | One share. Two prices. | What is wrong, and what it costs you |
| 02 | What the wrong pool costs | The mass-market use, promoted from fourth |
| 03 | What you are holding | Stock Tokens, ERC-8056, and the three sources |
| 04 | The readout | Every tracked token, measured |
| 05 | When the market sleeps | The 168-versus-32 hour mismatch |
| 06 | How you would catch us lying | What is checkable, and what does not exist |
| 07 | The token | Three engines and their published rules |

**Detail opens, it does not scroll.** Every section is scannable at a glance and every piece of
depth sits behind a `[ … ]` toggle on the same page — the full pool ladder, all twelve tokens,
all nine columns, the multiplier arithmetic, each engine's published rules. Nothing was moved
elsewhere and nothing was deleted. The uncapped `PriceLadder` in the execution check alone was
920px of the old page; it is a `PoolStrip` now, with the ladder one click away.

**The hero names both numbers.** It shipped with a 546 bps spread in 200px type and a −4 bps
basis in 12px type directly beneath, neither labelled, which read as one measurement
contradicting itself. They answer different questions and the page now says which: *spread* asks
whether the pools agree with each other, *basis* asks whether the token is priced correctly
against the real world. The hero also carries the dollar consequence, computed through the same
`executionQuote()` the section below uses, so the two can never disagree.

**Every claim about an unbuilt feature carries its gate.** See `docs/roadmap.md` — two claims on
this page were written in the present tense for features that do not exist.

## What basis measures

A Stock Token on Robinhood Chain is an ERC-20 giving economic exposure to a listed share. It
has two prices at all times, set by completely unrelated processes.

The **reference price** is what the underlying share is worth, published by the issuer, times
the ERC-8056 multiplier. The **pool price** is whatever the last person to trade that token in
a Uniswap pool happened to pay. Nothing forces them to agree.

```
basis   = ( deepest pool / reference − 1 ) × 10 000     // bps
spread  = ( dearest pool / cheapest pool − 1 ) × 10 000 // bps
```

Two numbers, deliberately. **basis** asks "is the token priced correctly against the real
world". **spread** asks "do the pools even agree with each other". On 2026-09-03 NVDA was
perfectly priced on aggregate — 2 bps — while carrying a 571 bps disagreement internally.
Publishing only the first would hide the whole story.

## What it is not

- **Not a price feed.** basis does not tell you what a token is worth. It tells you how far
  two existing prices have drifted apart and how much confidence each deserves right now.
- **Not a router.** It never signs a transaction, never holds funds, never takes custody. It
  shows prices and links to pools.
- **Not a signal service.** A wide gap is an observation, not an instruction. Whether it is an
  opportunity or a trap depends on depth, which is the hardest part — see below.

## Sessions, and why a reading is meaningless without one

The pools trade all 168 hours of the week. The underlying trades about 32.

| State | Eastern time | Reference |
|---|---|---|
| `pre` | 04:00–09:30 | thin |
| `regular` | 09:30–16:00 | fully alive |
| `post` | 16:00–20:00 | thinning |
| `overnight` | 20:00–04:00 weeknights | thin |
| `closed` | Fri 20:00 → Sun 20:00, and holidays | **frozen** |

Chainlink's documentation on these feeds is explicit: off-hours they "may hold the last
published price" and "do not have heartbeats during off-hours". The contract still answers.
The answer just stops changing.

A 4% gap during a regular session and a 4% gap at 03:00 on a Sunday are not the same event,
and basis will never label them the same way.

**Why this matters commercially.** On 30 August 2026 a token launched against AMC pushed the
on-chain AMC price 35× past the real one, with the equity market shut and no market maker on
the other side. The launchpad's own announcement the next day described adding "risk labels so
traders see a premium before they buy rather than after". That is the gap this instrument
fills, described by an incumbent.

## Flags

Published so they can be argued with. A flag is a function of the numbers and the session,
with no discretion in it.

| Flag | Condition | Reading |
|---|---|---|
| `TIGHT` | \|basis\| < 100 bps, live reference | Behaving. The token tracks the share. |
| `WATCH` | 100 ≤ \|basis\| < 200 bps | Drifting. Worth a look before trading size. |
| `WIDE` | \|basis\| ≥ 200 bps | Materially dislocated against a live reference. |
| `DARK` | session closed, reference > 900 s old, or row is a fallback | No trustworthy reference exists. |
| `ACTION` | staged multiplier, or a corporate action within 2 days | Prices either side are not comparable. |

**`DARK` outranks everything.** A token cannot be `TIGHT` at 2am on a Sunday because there is
nothing to be tight against. Getting this precedence wrong is the most misleading thing a
readout can do, and it is the rule a naive implementation breaks first.

Pool disagreement gets its own scale, because it is a different problem with a different
cause: `< 100` normal, `100–400` notable, `≥ 400` flagged.

## Depth, and the net problem

This is the difference between a screener and an instrument, and the part most likely to be
got wrong — including by us, in a first attempt that had to be thrown out.

A published spread is **gross**: the difference between two quoted prices. What you can
actually execute is smaller, sometimes much smaller, sometimes negative. Swap fees on every
leg, price impact against real depth, and routing hops when two pools do not share a quote
asset all eat it.

An early model applied constant-product maths to pool reserves and produced +83% on a $2,000
trade. The cause: **these are concentrated-liquidity pools.** The reserve ratio does not give
the price and TVL does not give the depth. It follows that nobody can compute an executable
number from a screener API — including every dashboard currently quoting these spreads.

So basis:

1. **Publishes gross, labelled gross.** Never dressed up as achievable.
2. **Publishes depth alongside every price.** A 35× print on a $4k pool and a 2% gap on a
   $3.8M pool are different facts and never share a column.
3. **Applies a size guard.** A pool is only offered for a given notional if it holds at least
   four times it. Below that the tool says so rather than quoting a price it cannot stand
   behind, and above a tenth of the best pool's depth it warns that the quote is the top of
   book, not your fill.

## Which pool counts as "the" pool

`basisBps` compares the reference to one pool, so which one is chosen is a methodology
decision, not a detail.

Ranking on TVL alone is wrong. Parked liquidity nobody trades against holds a stale price, and
depth-ranking picks it. Observed live on 2026-09-03: TSLA's largest pool held **$418,744** but
had traded **$8,835** in 24 hours — 2% turnover — and quoted **356.24** while the reference was
**383.29** and every actively traded pool sat at **382–384**. Ranking on depth would have
published a −706 bps dislocation that did not exist.

So a pool has to be both deep and awake: among pools above the dust threshold, `deepestPool()`
takes the deepest that turned over at least **10% of its own depth** in 24 hours. Where no pool
reports volume — the stored capture does not carry it — it falls back to depth alone. With the
rule applied, that same TSLA reading is **−25 bps, TIGHT**.

This is the same class of error as comparing a pool to a raw share price: a number that looks
like a finding and is actually an artifact of how it was computed.

## Who this is for

**People about to overpay** — the larger audience by far. Someone buying $100,000 of TSLA who
lands in the wrong pool pays $3,669 more for the identical tokens (measured live,
2026-09-03). Far more people lose money this way than will ever make money on the gap. basis
is the thing you check before you press buy.

**Arbitrageurs** — real but contested. The gaps do close: QQQ went from +217 bps to +172 bps
in 46 minutes while we watched. Capturing that means racing bots on a sequencer with
first-come-first-served ordering, so it is a latency race rather than a capital one.

**Protocols** — a launchpad's peg guard, a lending market's collateral haircut, a router
avoiding a dislocated pool. This is what the on-chain oracle in `docs/token.md` would serve,
and it ships only when a named consumer wants it.

## The structural finding

Once pools are ranked properly, the dislocation is not where people assume. The deep
stablecoin pools cluster tightly — SPY's $3.8M USDG pool and its next four largest sat inside
a 0.5% band. The outliers are almost all **stock-token-against-stock-token** pairs, where both
legs are tokens and neither side is anchored to anything.
