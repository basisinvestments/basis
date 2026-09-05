# Use cases

What basis is actually for, with the figures that make each case, measured on the dates given.

Everything here is a measurement. None of it is a recommendation, a forecast, or a claim about
what any price will do next — see hard rule 7 in [`engineering.md`](engineering.md). The
figures are gross, they carry the timestamp at which they were read, and they are stale on
arrival. That is stated rather than hidden because a number without its age is not evidence.

---

## 1. Before you press buy

**The largest audience by far, and the one that loses money quietly.**

The same Stock Token trades in a dozen Uniswap pools at a dozen prices. A router picks one. If
it picks badly you receive fewer tokens for the same money, and nothing on the screen tells you
so — the trade succeeds, the tokens arrive, and the loss is invisible because you never see the
price you could have had.

| Order | Wrong pool costs | As a share of the order |
|---|---|---|
| $100,000 of TSLA | **$3,669** | 3.67% |
| $25,000 of NVDA | **$1,364** | 5.46% |

*Measured 2026-09-03. Same token, same second, same number of tokens received.*

The NVDA case in full: $25,000 buys 112.709 tokens at the best available pool. Routed into the
dearest pool holding the same token, the identical 112.709 tokens cost $26,364. The real NVIDIA
share was $227.83 at that moment.

**What basis shows you:** every pool holding that token, ranked, with the price each one is
quoting and how deep it is. The execution check on the landing page takes an order size and
names the best and worst outcome for it.

**What it deliberately will not do:** route, sign, or execute anything. It is the thing you
check before you press buy, in someone else's interface.

> **Gross is labelled gross.** These are quoted prices, not fills. On concentrated liquidity,
> TVL is not depth and the quoted price is the top of book. A pool is only offered for a given
> order if it holds at least four times it, and above a tenth of a pool's depth the reading
> warns that the quote is the top of book. An earlier model that tried to compute executable
> size from a screener API produced +83% on a $2,000 trade and was thrown away.

---

## 2. While the market is shut

**The pools trade 168 hours a week. The underlying trades about 32.**

For roughly 136 hours of every week there is no live share price behind the token. The
exchange is closed, the oracle holds its last value — its own documentation says these feeds
*"do not have heartbeats during off-hours"* — and the pools keep quoting to whoever turns up.

What that looks like when it goes wrong: on **30 August 2026**, a token launched against AMC
pushed the on-chain AMC price **35 times** past the real one. Equity market shut, no market
maker on the other side. A Robinhood Chain launchpad described it the next day and announced it
was adding *"risk labels so traders see a premium before they buy rather than after."*

**What basis shows you:** the session state on every reading, and the flag that follows from
it. When the reference is frozen a row reads `DARK` — the gap is **unmeasurable, not zero**.
`DARK` outranks every numeric band precisely so that a token cannot appear tight at 2am on a
Sunday when there is nothing to be tight against.

**What still works off-hours:** pool-against-pool. The *spread* needs no reference at all, which
is why the landing page keeps reading in basis points all weekend.

---

## 3. Around a corporate action

**The issuer pauses the oracle. The pools do not pause.**

Stock Tokens never pay a cash dividend and never rebase. A corporate action moves an on-chain
multiplier defined by ERC-8056: your raw balance never changes, what each token *represents*
does.

`underlying_shares = raw_balance × uiMultiplier() / 1e18`

Skip that multiplier and the arithmetic invents a premium. CrowdStrike carried a multiplier of
exactly `4.000000` after a split on **2026-09-03**:

```
bid 203.35 / ask 204.12   ->  mid 203.735
reference = 203.735 x 4.0  =  814.94
deepest pool               =  897.53
correct:  +1013 bps        naive:  +34,058 bps
```

The naive comparison prints a premium of roughly 340% that does not exist. Nine of 194 tokens
carried a non-unit multiplier on 2026-09-02.

**What basis shows you:** the multiplier on every reading, an `ACTION` flag when one is staged
or a corporate action is within two days, and a fortnight calendar of what is scheduled.
`IN_PROGRESS` on the issuer's calendar does **not** mean imminent — it once listed an NVDA
dividend a month out — so imminence is gated on a staged multiplier or a two-day window. A flag
that cries wolf is worse than no flag.

---

## 4. Reading the pools against each other

**Two numbers, deliberately, because they answer different questions.**

- **basis** — is this token priced correctly against the real world?
- **spread** — do the pools even agree with each other?

NVDA has sat at **2 bps of basis and 571 bps of spread at the same instant**. Publishing only
the first would hide the whole story. SPY sat **8.54% apart across two of its own pools** on
2026-09-02.

The structural finding behind those numbers: deep stablecoin pools cluster tightly — SPY's
$3.8M USDG pool and its next four largest sat inside a 0.5% band — and the outliers are almost
all **stock-token-against-stock-token** pairs, where both legs are tokens and neither side is
anchored to anything.

**Which pool counts as "the" pool:** the deepest that turned over at least 10% of its own depth
in 24 hours. On 2026-09-03 TSLA's largest pool held **$418,744** and had traded **$8,835** —
2% turnover — while quoting 356.24 against a reference of 383.29, with every actively traded
pool between 382 and 384. Ranking on size alone would have published a **−706 bps dislocation
that did not exist**. The turnover rule gives −25 bps, `TIGHT`.

---

## 5. For a protocol

**A peg guard, a collateral haircut, a router avoiding a dislocated pool.**

The read a protocol would want is small:

```
basis(token) -> (bps, reference, updatedAt, session)
```

Today that is available as read-only JSON over HTTP at
[`/api/v1/basis/{symbol}`](api.md) — no key, no rate card, the same assembler that renders the
site, so the page and the API cannot disagree about a number.

On-chain, it does not exist. It is gated on ninety days of history **and a named consumer**,
and [`roadmap.md`](roadmap.md) says plainly that it may never ship: if no launchpad or lending
market wants to read it, building it would be infrastructure with no reader.

---

## 6. Understanding a reading you do not have the vocabulary for

Not every reader trades in basis points. The desk carries an interpreter that explains what a
reading currently says in plain English — which pool a router would reach, what the flag means,
what happens to this token when the market shuts, what the multiplier is doing.

It **never recommends a trade**, and that is structural rather than a promise: the questions are
a fixed set of chips, so *"should I buy"* is not something a user can ask. Every sentence it
returns names the field it came from, and any claim that cannot be traced back to the reading
that was served is dropped before it reaches the screen.

Full mechanics in [`desk.md`](desk.md).

---

## What this is not

- **Not a price feed.** basis measures a relationship between two prices it does not produce.
- **Not a router.** It never signs a transaction, holds funds, or takes custody.
- **Not a signal service.** A wide gap is an observation, not an instruction. What it means
  depends on execution costs, depth and timing that this project does not model and says so.

---

## Sources for every figure above

Each number here is reproduced from the documents that record how it was measured:
[`product.md`](product.md) for the methodology and the audiences,
[`data-sources.md`](data-sources.md) for the upstreams and the multiplier,
[`token.md`](token.md) for the token mechanics, and [`roadmap.md`](roadmap.md) for what is
gated and what may never ship. Live figures are re-read every 60 seconds; the dated ones above
are point-in-time measurements and are labelled as such.
