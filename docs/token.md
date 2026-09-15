# $BASIS

The readout is free and stays free. The token is a claim on three engines that all run off the
same data, each with a published switch-on condition.

**This document describes mechanics. It is not an offer, a forecast, or investment advice, and
no page on the site shows a price.**

---

## Why a token needs a real job

A data feed that costs $20/month to run does not naturally need one. "Hold the token for a
faster feed" is utility theatre — nobody buys a token to save $5 on a subscription, and a
token with no stated job is the failure mode this whole space keeps repeating. Two comparable
projects on this chain shipped genuinely good software attached to tokens their own
documentation never assigned a role to.

So the job is written down before the token exists, and the conditions are testable.

---

## Engine 01 — Buyback and burn

**Live from block one.**

Every dollar the project earns is split in half: one half buys the token off the market and
sends it to the dead address, the other half funds the treasury in Engine 02. Weekly, one
transaction, public wallet.

An earlier version sent 90% to the burn and 10% to infrastructure, and separately claimed that
same 10% seeded the treasury. One slice cannot do two jobs, and at the lower volume tier the
treasury would have taken four years to arm. A 50/50 split funds both lines from a stated
number, and infrastructure is paid from the treasury's line and disclosed before profit is
struck.

Two revenue lines: the creator share of swap fees on the pool, and what launchpads and
terminals pay to put the premium warning next to their own buy button.

The venue pays the creator two things on every trade: **70% of its 1% base fee**, and a
**creator tax the creator sets at launch, 0–10% of volume**, on top. Both were read on a mainnet
fork of the venue's live contracts on 2026-09-12: a 500 USDG buy at a 2% setting accrued 10 USDG of
tax on the curve, and 800 USDG of buys swept 24 USDG to the escrow of which 21.6 went to the
creator — the tax plus 70% of the base. The creator's take is therefore **the tax plus 0.7% of
volume**. A trader pays the base fee plus the tax.

**The floor — a 0% tax, 0.7% of volume — split in half, on a 30-day month:**

| Pool volume / day | Base fee 1% | Creator 70% of it | To the burn | To the treasury | Each, per month |
|---|---|---|---|---|---|
| $50,000 | $500 | $350 | $175 | $175 | $5,250 |
| $250,000 | $2,500 | $1,750 | $875 | $875 | $26,250 |
| $1,000,000 | $10,000 | $7,000 | $3,500 | $3,500 | $105,000 |

**Each point of creator tax adds 1% of volume to the creator's take — and to the trader's cost.**
At a 2% tax the take is 2.7% and each line receives $20,250 a month at the lowest tier; at 5% it
is 5.7% and $42,750, and a trader pays 6% to go round. The tax is a dial with both hands on it.
It is set once, at launch, and published here when it is.

**Fee mechanics are the launchpad's, not ours**, and none of this is verified against a live pool
for this token because none exists. This is what the project would earn at those volumes — not a
yield, not a distribution, and not a forecast of the volume or of the token.

Published rules: 50/50 split · weekly cadence, claim and burn in one transaction · creator
wallet public · burn counter reads the chain, not our database.

---

## Engine 02 — The basis treasury

**Arms at $50,000.**

The instrument finds mispricings; the treasury trades them. This is the engine no other token
can copy, because it runs on data the product produces.

Three trades, all visible in the readout:

- **Pool-to-pool.** The same Stock Token at two prices. SPY sat 8.54% apart across two of its
  own pools on 2026-09-02. No view on the underlying required.
- **Weekend reversion.** When the reference freezes on Friday and a token runs away from it on
  thin liquidity, take the other side from inventory and unwind when the Sunday overnight
  session reprices it. The 35× AMC print was this trade with nobody on the other side.
- **Corporate-action windows.** The oracle pauses; the pools do not. The multiplier is known in
  advance and the pools misprice it anyway.

**Funded by half of Engine 01, permanently** — not only until it arms. Trading begins once the
balance reaches $50,000; below that the engine accumulates and does not trade. Trading profits
split half compounding and half to the burn. **Losses stay inside the treasury** — the burn
never pauses to cover them.

How long the threshold takes, at the floor and at a 2% creator tax:

| Pool volume / day | At the floor (0% tax) | At a 2% tax |
|---|---|---|
| $50,000 | $5,250 / mo · ~10 months | $20,250 / mo · ~2.5 months |
| $250,000 | $26,250 / mo · ~2 months | $101,250 / mo · ~15 days |
| $1,000,000 | $105,000 / mo · ~2 weeks | $405,000 / mo · ~4 days |

At the floor and low volume this is a slow engine, and saying so is more useful than a threshold
that reads like a near-term milestone. It arms when it arms, and the balance is public throughout
at `/treasury`, read from the chain.

**Published mandate:** canonical Stock Tokens and USDG only, never launchpad tokens · maximum
5% of the shallower pool's liquidity per position · maximum 20% of the treasury in one token ·
no leverage, no borrowing, no perps · infrastructure costs paid from this line and itemised
before profit is struck · treasury address public · monthly P&L with transaction links.

### The ledger — the treasury before it has traded

`/treasury` shows three things from the day the token exists, each with its provenance:

- **The balance, read from the wallet on chain.** `eth_getBalance` and an ERC-20 `balanceOf` for
  USDG, over the public RPC, with the block and the time of the read stamped beside it. When no
  wallet is configured the page says so and shows a dash. It never shows a placeholder figure —
  a balance the site displays has to be one anyone can confirm on the explorer.
- **What the mandate would do right now.** The published rules above, applied as code
  (`src/lib/treasury.ts`) to the readings on screen: buy the cheapest live pool, sell the
  dearest, sized at 5 % of the shallower pool or 20 % of the treasury, whichever binds, with a
  30 bps-a-leg fee assumption shown beside every net figure because the pool tier is not in the
  index data. Before the treasury is funded the signals are sized against the $50,000 threshold
  — *what it would do once armed* — and the page says so.
- **A ledger, one row a minute,** of what the mandate saw. Recorded on every read of
  `/api/v1/treasury` and by a scheduled function once a minute so the record fills whether or
  not anyone is watching.

**Every figure under the ledger is simulated and labelled so** — a signal at quoted prices, not
a fill, not executable size. The label is defined once and the build fails if the page stops
rendering it. Only pool-to-pool is simulated in this pass; weekend reversion and corporate-action
windows need a position held across time and are recorded as not yet simulated rather than
approximated.

What the ledger is *for*: before anyone trusts real capital to the mandate, it shows whether the
instrument finds gaps that clear the fees — and how often the answer is *nothing*. On a closed
Saturday the honest reading is two small signals and ten quiet tokens, and the page says why each
is quiet. That is the demonstration, and it is the opposite of a demo.

When the treasury trades, the fills are read from chain and shown beside the reading they were
published from, so the ordering below is checkable.

### The conflict, and the rule that resolves it

A service that publishes gaps and also trades them can front-run its own users. The rule is
fixed and public: **publish first, then trade the published number.** Treasury fills appear on
the same page as the alerts, timestamped, so the ordering is checkable. This costs the treasury
its best fills, and that cost is the price of the feed being worth reading.

Engine 02 is also the piece under the most scrutiny — pooled capital managed for profit — and
is the first item for legal review before it arms.

---

## Engine 03 — Oracle staking

**After 90 days of history.**

basis moves on chain and the token becomes the thing you stake to run it.

```solidity
basis(token) -> (bps, reference, updatedAt, session)
```

Read by a launchpad's peg guard before it allows a launch, a lending market before it accepts a
token as collateral, an aggregator before it routes through a dislocated pool.

Reporters lock $BASIS to post readings. Every read a consumer makes is paid in USDG and goes to
the reporters who staked behind that reading. A reading that disagrees with the published
reference can be challenged, and the reporter who posted it loses stake.

**This is where supply leaves the market for a reason.** Reads need stake behind them, so the
amount locked scales with how much the oracle is used — not because holding is rewarded, but
because the work requires it.

It needs a track record first: ninety days of the off-chain feed, including a dozen weekends,
before a contract asks anyone to trust it. And it needs a **named consumer**. If no launchpad
or lending market integrates, building it would be infrastructure cosplay, and this section is
where that gets recorded.

---

## Supply

Fixed 1,000,000,000, no mint function. 100% into the pool at launch, locked permanently by the
launchpad's locker — there is no withdraw function to call, and that is read from the locker's
bytecode (fourteen selectors, none of them an exit), not from its documentation. No pre-mine and
no team allocation is structurally possible; the only way the creator holds tokens is a disclosed
developer buy at launch price.

**Inherited, and stated.** The launchpad is unaudited. Between launch and graduation the token
sits on a bonding curve its operator holds powers over — it can force a graduation, and can move
a swept-but-unpooled launch after seven days. Those powers end when the pool is created: the token
contract has no owner, no mint, no pause and no fee setter, and the locker has no way out. On every
launch this project has watched, the curve phase lasted between fourteen seconds and three hours.

Holders also get the feed without the 60-second delay, threshold alerts and history exports.
That is a perk, not the reason.

---

## What the site never shows

No price, market cap, chart or ticker. No countdown. No buy button. No partner logo wall. No
roadmap with quarters. The token section carries one call to action — read the mandate — and
appears last, after a visitor has already used the product.
