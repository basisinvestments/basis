# The desk

The landing page answers *what is this*. The desk answers *I'm here, what do I do*.

Route `/desk`.

---

## What a holder actually has

Not a prediction. An edge on **venue** and **timing**:

- Which pool is cheapest and which is a trap, right now, per token.
- When the reference is frozen and the pools are untethered — every weekend, every
  holiday, roughly 136 of the week's 168 hours.
- When a corporate action is about to pause a token's oracle while its pools keep trading.
- Once history exists: how fast gaps close, and which ones don't.

Every one of those is measurable, timestamped and checkable. None of them is advice. The desk
is a personal instrument panel over those four things.

---

## The interpreter

**It explains readings. It does not, and will never, recommend a trade.**

### It sits open, and says what it is

It first shipped inside an expanded watchlist row, which meant the most interesting thing on the
desk was invisible until a visitor happened to click a token — and once found, nothing on screen
said what it was for or what it would refuse to do.

It now renders on load, below the table, with its own token picker over the watched list. Clicking
a row still aims it at that token, so the click does something useful without being the only way
in. The panel states the contract in the open: plain English, never a recommendation, no text box
on purpose, every sentence naming the field it came from. Before a first question the answer area
says what will land there rather than sitting blank, which reads as broken.

**One bug this surfaced.** The daily-usage counter read `localStorage` during render. That was
invisible while the panel only mounted after a click; rendering on load made it a hydration
mismatch — `0/12` from the server against `1/12` in the browser. It now starts at zero and adopts
the stored count in an effect, the same pattern `Watchlist` uses for the list itself.

That is not caution, it is the only version that can exist here. basis's whole claim is that
every number can be checked without trusting us. A model saying *"AMC looks cheap"* would be
advice, and it would be invented — the model knows nothing the reading does not already
contain. Bolting an oracle onto a verifiable instrument makes the instrument unverifiable.

So the job is inverted: plain language for someone who does not read basis points.

> *Why is AMC flagged WATCH?* → "The deepest pool sits 114 basis points above the reference —
> just over one percent. Three of its seven pools hold under $10,000, so most of the spread you
> can see is dust rather than tradeable price. The $85k USDG pool is the one a router would
> actually reach."

### The grounding is mechanical, not hoped-for

| Mechanism | Effect |
|---|---|
| The only input is the reading object | No web, no history, no other tokens. A fact not in the payload has no route into the answer. |
| Structured output (`response_format` with a strict JSON schema) | Every factor must name the dotted field it came from — `reference.price`, `spreadBps`, `pool.liquidityUsd`. |
| Server-side field resolution | `verifyFactors()` drops any claim whose field does not resolve against the reading that was served. The count of dropped claims is shown to the reader. |
| Questions are chips, not free text | "Should I buy" is **not expressible**. The API rejects any `chip` outside the fixed set with a 400 before a model call happens. |
| The payload names roles, not just values | A field called plainly `pool` invited the model to attribute the basis to the wrong one. Structure that cannot be misread beats prompt text asking it not to. |

The last one is the important one. The refusal is structural rather than a rule the model has
to remember — verified: `POST /api/v1/interpret {"chip": "should i buy this"}` returns
`400 unknown_question`.

### The question set

`flag` · `router` · `weekend` · `multiplier` · `spread` — defined in `src/lib/interpret.ts`.

### Inference configuration

One chat completion per question: no tools, no loop, nothing to wander off into. A plain
`fetch` rather than an SDK — it is a single POST carrying a strict JSON schema the answer has
to satisfy.

**Where inference runs is not load-bearing and is not compiled in.** Endpoint, model and key
are environment configuration (`INTERPRETER_ENDPOINT`, `INTERPRETER_MODEL`,
`INTERPRETER_API_KEY`). What makes an answer trustworthy is in this repository and is not
provider-specific: the frozen system prompt, the output schema, and `verifyFactors()` dropping
any claim it cannot trace to a field of the reading that was served.

**Low reasoning effort is not a cost compromise — it measured better.** On the same question:

| Configuration | Completion tokens | Factors | Multi-field cites |
|---|---|---|---|
| Default effort, no form rules | 2,530 (1,856 reasoning) | 9 | 0 |
| Default effort + form rules | 2,461 | 4 | 0 |
| **Low effort + form rules** | **464** | 4 | 0 |

Roughly a fifth of the tokens and tighter output — four focused claims instead of nine
sprawling ones.

`max_tokens` is 4,000. A model that reasons before answering spends completion tokens on both,
so the ceiling has to cover the thinking as well as the answer; a `finish_reason` of `length`
returns `502 truncated` rather than surfacing a JSON parse error.

**The response is the reading, not the machinery.** An answer carries the summary, the factors
with their fields, the caveat and the timestamp. It does not report which model produced it or
what it cost — that is operational detail, and publishing it would invite readers to weigh the
provider rather than the grounding, which is the part that can actually be checked.

**Free tier:** 12 questions a day, counted in `localStorage`. Not a security boundary — it is a
courtesy limit on an unauthenticated endpoint, and it is why per-IP rate limiting belongs on the
route before this is public.

### Two things that had to be fixed after live testing

**Multi-field citations.** The model occasionally packed several paths into one `field`
(`"pool.price, reference.price"`), and the verifier dropped otherwise-good claims. It now splits
on commas and keeps the factor when every path resolves. The prompt also asks for exactly one
path per factor, which removed the behaviour entirely in testing.

**A mislabelled relationship.** The model described `basisBps` as measuring the *cheapest* pool.
The numbers were right and the relationship was wrong — the more damaging kind of error, because
it reads as authoritative. The cause was structural: the payload called the field plainly `pool`,
and the ladder beneath it happened to list cheapest first. Fixed by naming the role in the data
(`role: "deepest — this is the pool basisBps is measured against"`) and putting deepest first in
the ladder. Making the structure unconfusable beat adding another sentence to the prompt.

### Without a key

The interpreter's configuration is optional. Unset, the panel says it is not running and the
rest of the desk is unaffected. The endpoint returns `503 interpreter_not_configured` — after
validating the request, so a caller with a bad symbol still gets `400 unknown_symbol` rather
than a misleading answer about credentials.

Put the real key in `.env.local`, which is gitignored. Never in `.env.example`.

---

## Layout — measured, then fixed

The first build gave the desk a hero: a title, two paragraphs, then the data. Measured
at 1440x900 it read as a document rather than an instrument.

| | Before | After |
|---|---|---|
| First number on screen | 556px down | **212px** |
| Page height, nothing open | 3,822px (4.2 screens) | **1,504px (1.67)** |
| Opening one row adds | +998px | **+214px** |
| Watchlist columns | 9 | **5** (4 below 640px) |
| Calendar rows | 16 | **5**, with a count for the rest |

Four changes did it.

**No hero.** A landing page earns one; a desk does not. `/` already answers *what is this*.
The desk opens on a `StatusLine` — one row, worst-flag-wins, reading either *All 3 tracking the
reference* or *1 of 3 drifting — AMC*, with the live session beside it. That single line is what
most visits are for.

**`PoolStrip` replaces `PriceLadder` on expansion.** The ladder is one row per pool: 31 rows and
982px for NVDA. Nobody reads thirty-one rows — it is a wall, not a chart. The question is *are the
pools clustered or scattered, and where does the reference sit in that*, which is one axis. The
strip is ~46px: a tick per pool positioned by price and sized by log depth, the deepest one
doubled in width, the reference as the single warm mark, and a footer giving cheapest, count,
deepest and dearest. `PriceLadder` is still there behind `[ list all N pools ]` — the detail is
not deleted, it is just no longer the default.

**Five columns, not nine.** Token, real price, pool price, gap, state. Depth, spread and pool
count moved into the expansion, where someone has already asked for detail. Below 640px the
pool price drops too — it is recoverable from the reference and the gap, and losing it is better
than a sideways scroll that hides the gap and the flag.

**The calendar shows five.** Sixteen scheduled actions in a fortnight is real, but rows six
through sixteen are a fortnight away. Five, then `[ 11 more in the window ]`. The imminence badge
moved from every row to the header once (`6 PAUSING IN 48H`) — when all five visible rows carry
the same red badge it distinguishes nothing; rows now carry a small warm tick instead.

The session strip and the calendar sit below the working area in one two-column row, and the
three unbuilt features are a single sentence rather than three cards.

---

## Sections

| # | Section | State | Tier |
|---|---|---|---|
| 1 | **Watchlist** — your tokens, live; click a row for its ladder and an explanation | live | free (12 in `localStorage`) · holder: synced, unlimited |
| 2 | **Interpreter** — open on load, own token picker, each factor linked to its field | live (needs a key) | free: 12/day · holder: uncapped |
| 3 | **The clock** — session state, this week's strip, frozen banner when closed | live | free |
| 4 | **Action calendar** — 14-day window, imminent ones marked "oracle will pause" | live | free |
| 5 | **Alerts** | needs a database and a scheduler | holder |
| 6 | **Weekend board** | needs persistence | free to view |
| 7 | **History** | needs persistence | free summary · holder export |

Sections 5–7 are rendered on the page as stated placeholders with their gate named, in the same
voice as `docs/roadmap.md`. Nothing is implied to exist that does not.

**Alerts are the real holder value.** Nobody watches a dashboard on a Saturday — which is
exactly when the reference is frozen and the gaps open. A rule that fires *only* when the
market is closed and a token drifts past a threshold is the product's thesis delivered to a
phone. That is worth holding a token for in a way a faster feed never was.

---

## The holder tier

Deferred until there is persistence, because without a database there is nothing to sync and
the free tier already delivers the desk.

When it lands, the gate is **identity, never a transaction**:

1. A wallet signs a message (SIWE-style). This proves control of an address.
2. The server reads `balanceOf(address)` on chain 4663 over RPC — a read.
3. Balance at or above the threshold → a signed cookie carrying `tier: holder`.

Nothing is custodied and nothing moves, consistent with hard rule 1 in `docs/engineering.md`. Until
`$BASIS` exists the gate reads `BASIS_TOKEN_ADDRESS` from the environment and can be exercised
against any ERC-20 on the chain.

---

## Files

| Path | Role |
|---|---|
| `src/lib/interpret.ts` | Frozen system prompt, output schema, chip set, context builder, field verifier |
| `src/app/api/v1/interpret/route.ts` | Validate → check config → build context → one call → verify factors |
| `src/components/desk/Interpreter.tsx` | Chips, answer rendering, per-field attribution, daily cap |
| `src/components/desk/Watchlist.tsx` | localStorage list, five columns, expandable rows |
| `src/components/desk/StatusLine.tsx` | The glance answer — worst flag wins, plus the live session |
| `src/components/desk/PoolStrip.tsx` | Pool distribution on one axis; the default expansion view |
| `src/components/data/PriceLadder.tsx` | The full per-pool ladder, behind a toggle |
| `src/components/desk/ActionCalendar.tsx` | 14-day window with imminence marking |
| `src/app/desk/page.tsx` | Composition; server component |
