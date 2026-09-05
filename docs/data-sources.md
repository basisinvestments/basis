# Data sources

Everything basis renders comes from two public, keyless upstreams and neither of them is ours.
That is deliberate: a reading nobody has to trust us for is the whole product.

Verified **2026-09-03**. Re-check before relying on any of it — these are other people's APIs
with no service commitment to us.

---

## 1. The endpoints, measured

| Endpoint | Server fetch | Browser fetch | Payload |
|---|---|---|---|
| `api.robinhood.com/rhj/prices/{symbol}` | 200 · 88ms | **blocked** | ~400 B |
| `api.robinhood.com/rhj/assets` | 200 · 121ms | **blocked** | ~154 KB |
| `api.robinhood.com/rhj/corporate-actions` | 200 · 78ms | **blocked** | ~19 KB |
| `api.dexscreener.com/latest/dex/tokens/{address}` | 200 · 106ms | allowed | ~25 KB |

### The constraint that decided the architecture

The reference API returns **no `access-control-allow-origin` header**. A browser cannot call
it, at all, ever. DEX Screener does send `access-control-allow-origin: *`.

So the reference price — the number everything else is measured against — has to be fetched
server-side. That is why basis is a Next.js app with server components rather than a static
page: a server is not a performance choice here, it is the only way the site can be live.

`src/lib/sources/rhj.ts` imports `server-only` so this cannot be undone by accident.

---

## 2. Reference prices — `/rhj/prices/{symbol}`

```json
{"quotes":[{"tokenSymbol":"NVDA","bid":"225.11","ask":"225.19",
  "isTradingHalt":false,"generatedAt":"2026-09-03T05:18:33Z", ...}]}
```

**The trap.** This returns the **raw underlying equity** bid and ask. It is *not*
multiplier-adjusted. Comparing a pool price to this directly is the single most damaging
mistake available — see §4.

Cached 15 s upstream, so polling faster than that wastes calls. Rate limit 60 req/s.

Undocumented fields observed in responses: `dailyHigh`, `dailyLow`, `mintBurnTokenVolume`,
`mintBurnUsdVolume`. The mint/burn figures are primary-market activity by Authorised
Participants — a free signal of real creation and redemption demand, currently unused.

---

## 3. Multipliers and the registry — `/rhj/assets`

One call returns all ~194 assets. **Query parameters are rejected**:

```
?limit=5  ->  400  Could not find field "limit" in the type
                   "crypto_tokenization.service.v1.GetAssetsRequest"
```

So there is no way to ask for a subset — fetch once, index by symbol, which is what
`fetchAssets()` does.

**Schema drift seen in the wild:** `deployments[].networkName` was an empty string on
2026-09-02 and populated with `"Robinhood Chain"` by 2026-09-03. Nothing in this codebase
depends on it. The canonical contract address comes from our own registry
(`src/lib/registry.ts`), never from an upstream response — a token with a matching ticker at
a different address is not the same asset, and the issuer's own documentation says so.

Also exposed here and worth using more: `pendingMultiplier` and
`pendingMultiplierEffectiveTime`. A staged multiplier is the strongest available signal that
a corporate action is genuinely imminent.

---

## 4. The multiplier

Stock Tokens never pay a cash dividend and never rebase. Corporate actions move an on-chain
multiplier defined by **ERC-8056**. Your raw balance never changes; what each token
*represents* does.

```
underlying_shares = raw_balance × uiMultiplier() / 1e18
```

**Worked example, 2026-09-03.** CrowdStrike carried a multiplier of exactly `4.000000` after
a split.

```
bid 203.35 / ask 204.12          ->  mid 203.735
reference = 203.735 × 4.0        =  814.94
deepest pool                     =  897.53   ($7,230 TVL)

correct:  ( 897.53 / 814.94 − 1 ) × 10000  =  +1013 bps
naive:    ( 897.53 / 203.735 − 1 ) × 10000 =  +34,058 bps
```

The naive comparison invents a 340% premium. `src/lib/logic.test.mjs` asserts exactly this.

Nine of 194 tokens carried a multiplier other than 1.0 on 2026-09-02, including SGOV at
1.005102 and CCL at 1.0215 — small drifts from reinvested dividends, which is why a Stock
Token tracks **total return** rather than share price and will sit above the headline price
over time. That is correct behaviour, not a depeg, and basis never reports it as one.

---

## 5. Pools — DEX Screener

Two things `src/lib/sources/dexscreener.ts` is careful about.

**Only base-side pools are ours.** A pool listing `CINEMA/AMC` is a launchpad token quoted in
AMC; its `priceUsd` is the price of CINEMA, not AMC. Filtering on
`baseToken.address === ours` is mandatory. Without it, AMC reads as $0.0004.

**TVL is not depth.** These are concentrated-liquidity pools. The reserve ratio does not give
the price and the total does not give what you can execute. An early impact model in the
concept build applied constant-product maths to the reserves and returned +83% on a $2,000
trade — obvious nonsense, and the reason `executionQuote()` publishes gross figures with a
size guard rather than pretending to quote a fill.

Pools below **$3,000 TVL** are dropped as dust; they distort the spread without being
tradeable.

---

## 6. Corporate actions — `/rhj/corporate-actions`

Cached 1 h. 43 entries on 2026-09-02.

**`IN_PROGRESS` does not mean imminent.** It means scheduled and not yet completed. On
2026-09-03 that included an NVDA cash dividend dated **1 October** — flagging that token
`ACTION` a month early would tell a reader the price is untrustworthy when it is fine, and a
flag that cries wolf is worse than no flag.

`pendingActionSymbols()` therefore fires on either a **staged multiplier** or a process date
within **2 days**.

---

## 7. Failure and degradation

Every source can fail and each is timed independently. When one does, affected rows come from
`src/lib/fallback.ts` — the verified 2026-09-02 18:33 UTC capture — marked `stale: true` and
flagged `DARK`, with the reason surfaced in `/api/v1/status`.

This is the rule the product rests on: **never display a number without its provenance.**

```bash
BASIS_OFFLINE=1 npm run dev   # force the fallback path and watch it degrade honestly
```

---

## 8. Standing risks

- **No service commitment.** The reference API is keyless, undocumented as to stability, and
  could be gated or throttled without notice. Fallbacks: the on-chain Chainlink feed covers
  tokens that have one; a commercial equities API covers the rest. A free product with a paid
  dependency is a different product.
- **The signal itself could shrink.** The weekend dislocation exists because nothing makes a
  market when the reference is frozen. A launchpad publicly said it approached market makers
  about weekend coverage, and the issuer is reported to be adding liquidity. If they succeed,
  the most dramatic part of this product gets smaller. The pool-to-pool and cross-pair work
  survives.
- **Rate limits.** 60 req/s on the reference API is generous, but `/assets` is 154 KB and the
  featured set fans out per symbol. Revalidation is 60 s by default; do not lower it below 15
  without reason.
