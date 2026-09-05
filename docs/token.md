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

| Pool volume / day | Swap fee 1% | Creator 70% | To the burn | To the treasury | Each, per month |
|---|---|---|---|---|---|
| $50,000 | $500 | $350 | $175 | $175 | $5,250 |
| $250,000 | $2,500 | $1,750 | $875 | $875 | $26,250 |
| $1,000,000 | $10,000 | $7,000 | $3,500 | $3,500 | $105,000 |

Arithmetic on a 1% swap fee and a 70% creator share, on a 30-day month. **Fee mechanics are the
launchpad's, not ours**, and none of this is verified against a live pool because none exists.
This is what the project would earn at those volumes — not a yield, not a distribution, and not
a forecast of the volume or of the token.

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

How long the threshold takes, on the same arithmetic as the table above:

| Pool volume / day | To the treasury, per month | Reaches $50,000 in |
|---|---|---|
| $50,000 | $5,250 | ~10 months |
| $250,000 | $26,250 | ~2 months |
| $1,000,000 | $105,000 | ~2 weeks |

At low volume this is a slow engine, and saying so is more useful than a threshold that reads
like a near-term milestone. It arms when it arms, and the balance is public throughout.

**Published mandate:** canonical Stock Tokens and USDG only, never launchpad tokens · maximum
5% of the shallower pool's liquidity per position · maximum 20% of the treasury in one token ·
no leverage, no borrowing, no perps · infrastructure costs paid from this line and itemised
before profit is struck · treasury address public · monthly P&L with transaction links.

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
launchpad's locker — there is no withdraw function to call. No pre-mine and no team allocation
is structurally possible; the only way the creator holds tokens is a disclosed developer buy at
launch price.

Holders also get the feed without the 60-second delay, threshold alerts and history exports.
That is a perk, not the reason.

---

## What the site never shows

No price, market cap, chart or ticker. No countdown. No buy button. No partner logo wall. No
roadmap with quarters. The token section carries one call to action — read the mandate — and
appears last, after a visitor has already used the product.
