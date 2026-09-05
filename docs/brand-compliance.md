# Brand and compliance

Robinhood's Terms of Service and Brand Guidelines bind any external-facing copy. These are not
style preferences — the trademark clauses are explicit about token names and metadata, and the
licence they grant auto-terminates on breach and carries its own indemnity.

Verified against the published documents 2026-09-01. Both are amendable without notice and
carry version stamps (ToS last updated 2026-08-24; Brand Guidelines v1.0 effective 2026-08-20).
**Re-check those stamps before relying on this summary.**

---

## Naming — hard rules

| Rule | Correct | Never |
|---|---|---|
| Network name in full | "Robinhood Chain" | "Hood Chain", "Chain", "Robinhood" alone |
| Asset terminology | "Stock Tokens" | "tokenized stocks", "tokenized equities" |
| The stock ticker | *(omit entirely)* | `$HOOD`, `HOOD`, in any context |
| Social handle | `@RobinhoodCrypto` | `@RobinhoodApp` |

`$HOOD` is a stock ticker with regulatory restrictions attached. It appears nowhere in this
repository, and a grep for it is part of the pre-release check.

## Token and metadata

Three clauses hit a token directly:

- **5.7(d)** — the marks, or anything confusingly similar, may not form part of a trademark,
  trade name, logo, domain, social handle, **token name**, or other distinctive identifier.
- **5.7(h)** — no incorporating the marks or any element of the brand identity into the
  artwork, iconography, metadata, or **smart contract attributes** of any token or NFT.
- **5.11(e)** — using the marks "in connection with a token issuance, initial exchange
  offering, or similar fundraising event" requires **prior written consent**.

**Practical consequence.** `BASIS` and `$BASIS` are clean. Nothing in the ticker, name, logo,
artwork or contract metadata leans on Robinhood, Hood, or the feather. Deploying *on* the chain
is invited by the documentation; trading on the brand is not.

Also binding: our own branding must be more prominent than the marks (5.7(c)); community
channels need a non-affiliation disclaimer (5.7(b)); no association with scams, rug pulls,
phishing or impersonation (5.7(g)); every external statistic needs its measure, period, source
and link stated.

## The unresolved question

Terms of Service **§2.4** contains an unqualified covenant that you will use the Services
"solely for lawful testing, experimentation, evaluation, and development purposes." It is not
scoped to the testnet, and it sits in obvious tension with a production token launch.

This does **not** affect the product. basis is an off-chain service reading public data; it
neither deploys a contract nor transacts. It is a live question for any *token* launch on this
network, and it belongs to a lawyer, not to this document.

## Standing copy rules

- **Non-affiliation in every footer.** basis is independent and not affiliated with, endorsed
  by or connected to Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Uniswap Labs,
  Chainlink, or any launchpad referenced.
- **What Stock Tokens are.** Tokenised debt securities issued by Robinhood Assets (Jersey)
  Limited, giving economic exposure to an underlying security without legal or beneficial
  rights in it. Say this rather than implying share ownership.
- **Market data, not advice.** State the measurement. Never recommend a trade or imply a
  return.
- **Every figure carries a timestamp**, and is stale on arrival.
- **Gross is labelled gross.** A spread is not what you can execute.

## Pre-release check

Run against `src/` only — this file and `docs/engineering.md` name the prohibited strings in order to
document them, so scanning `docs/` would flag the rules themselves.

```bash
grep -ri '\$HOOD\|tokeni[sz]ed stock\|tokeni[sz]ed equit' src/   # must be empty
grep -ri 'hood chain' src/ | grep -vi 'robinhood chain'          # must be empty
grep -c 'not affiliated with' src/components/site/Footer.tsx     # must be 1
```

The claim in `docs/data-sources.md` that the reference API sends no CORS headers, and every
market figure quoted in `docs/`, carry the date they were measured. If a figure is re-quoted
publicly it must carry that date with it.
