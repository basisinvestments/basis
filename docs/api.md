# API

Read-only JSON. No key. Base `/api/v1`.

Every route calls `getReadings()` in `src/lib/readings.ts`, the same assembler the landing page
uses, so the page and the API cannot disagree about a number.

Responses carry `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`, except
`/sessions` and `/status` which are `no-store` because they describe *now*.

---

## Readings

### `GET /v1/basis`

Every tracked token.

| Query | Effect |
|---|---|
| `symbols=NVDA,SPY` | restrict the set |
| `featured=1` | the landing-page subset |

```json
{
  "readings": [ /* Reading[] */ ],
  "session": "regular",
  "asOf": "2026-09-03T05:40:26.900Z",
  "health": [ { "name": "rhj/assets", "ok": true, "ms": 10 } ],
  "allStale": false
}
```

### `GET /v1/basis/{symbol}`

One reading in full. `400 unknown_symbol` if it is not a canonical Stock Token — a matching
ticker at a different address is not the same asset.

```json
{
  "symbol": "NVDA",
  "name": "NVIDIA",
  "address": "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
  "asOf": "2026-09-03T05:39:08.515Z",

  "reference": {
    "price": 225.37,          // mid x multiplier — use this one
    "mid": 225.37,            // raw underlying mid; never compare a pool to this
    "bid": 225.33, "ask": 225.41,
    "multiplier": 1,
    "halted": false,
    "ageSeconds": 34,
    "source": "rhj"           // "fallback" when degraded
  },

  "pool": {
    "price": 225.42,
    "quote": "USDG", "dex": "uniswap", "version": "v3",
    "liquidityUsd": 6064982,  // TVL, not executable depth
    "pairId": "0x…"
  },

  "poolCount": 29,
  "basisBps": 2,              // deepest pool vs reference
  "spreadBps": 571,           // cheapest pool vs dearest
  "flag": "TIGHT",
  "session": "overnight",
  "stale": false
}
```

### `GET /v1/pools/{symbol}`

Every pool holding the token as base, cheapest first, above the $3,000 dust threshold. Carries
a `note` restating that `liquidityUsd` is TVL rather than executable depth.

### `GET /v1/board`

All tokens ranked by pool-to-pool spread — the working list, where the same asset wears two
price tags at the same second.

| Query | Effect |
|---|---|
| `min_spread_bps=400` | filter to the flagged band |

---

## Context

### `GET /v1/sessions`

```json
{
  "state": "overnight",
  "label": "Overnight session · reference thin",
  "easternTime": "01:39:07",
  "nextTransition": "2026-09-03T08:00:00.908Z",
  "referenceFrozen": false,
  "frozenSince": null
}
```

When `state` is `closed`, `frozenSince` is the last weekday 20:00 ET and `referenceFrozen` is
true. Every reading depends on this: a 4% gap in a regular session and a 4% gap at 03:00 on a
Sunday are not the same event.

### `GET /v1/status`

Upstream health, per-source timings, and how many rows in the current response are live versus
stale — with the reason for each stale row.

```json
{
  "ok": true,
  "assembledInMs": 37,
  "sources": [ { "name": "rhj/assets", "ok": true, "ms": 1 } ],
  "rows": { "total": 12, "live": 12, "stale": 0 },
  "staleSymbols": [],
  "fallbackCapture": "2026-09-02T18:33:00.000Z"
}
```

A feed claiming perfect uptime is a feed you should not read. This one reports its failures.

---

## Errors

| Code | Meaning |
|---|---|
| `400 unknown_symbol` | Not a canonical Stock Token. Check `/v1/basis` for the tracked list. |
| `503 no_reading` | No reading could be assembled, and the fallback did not cover it. |
| `503 no_pools` | No pools above the dust threshold. |

Degradation is **not** an error. If an upstream fails, the response is still `200` with
affected rows marked `stale: true`, `flag: "DARK"` and a `degraded` reason. Returning a
plausible-looking number without saying where it came from would defeat the point of the
product.

---

## Build status

| Endpoint | Status |
|---|---|
| `/v1/basis`, `/v1/basis/{symbol}`, `/v1/pools/{symbol}`, `/v1/board` | live |
| `/v1/sessions`, `/v1/status` | live |
| `/v1/history/{symbol}` | not built — needs a store; see `docs/roadmap.md` |
| `/v1/quote/{symbol}?usd=` | uncertain — see `docs/roadmap.md` |
| `/v1/alerts` | not built |

Nothing above is described as shipping until it does.
