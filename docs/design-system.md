# Design system

A committed single-theme design: an instrument read in the dark. Pure black ground, one
interface accent, three semantic data colours, square corners everywhere except one chip.

Tokens live in `src/app/globals.css`. `/system` renders the **actual components**, so the
reference cannot drift from what ships.

---

## 1. Colour

Two layers that must not be confused.

### Interface

| Token | Value | Use |
|---|---|---|
| accent | `#AFDDFF` | nav numbers, CTA fill, badges, card stroke, links |
| accent hover | `#c8e8ff` | CTA background only |
| ground | `#000000` | pure black, never a near-black |
| text | `#FFFFFF` | primary |

There are no grey hexes. Every neutral is white at a fixed opacity over black, which keeps
depth consistent and makes the whole palette one decision:

`white/[0.03]` grid · `white/10` dividers · `white/25` connectors · `white/50` muted copy ·
`white/70` plus marks · `white/80` node borders.

### Data semantics

These carry meaning and are **never decorative**. A reader must be able to trust that an amber
mark is a reference price.

| Token | Value | Means |
|---|---|---|
| `--ref` | `#FFB454` | the real world: exchange price × multiplier |
| `--pool` | `#AFDDFF` | on-chain; doubles as the UI accent |
| `--hot` | `#FF6B4A` | the gap — basis, spread, overpayment |

### Session states

The reference loses saturation as it loses authority. This is the one genuinely novel thing in
the system: **the page restyles itself according to the state of a market.**

```css
:root                          { --ref: #FFB454; }  /* regular */
:root[data-session='pre'],
:root[data-session='post'],
:root[data-session='overnight'] { --ref: #D9A24A; }  /* thin */
:root[data-session='closed']    { --ref: #B8925A; }  /* frozen */
```

When closed, `.refmark` becomes hatched and the status dot goes hollow. Because these are
custom properties, one attribute on `<html>` restyles every figure at once — including the
canvas, which reads `--ref` at paint time.

### Flags

Outline only. A filled pill would compete with the CTA, the one solid accent block allowed on
a screen.

`TIGHT #5BD6A0` · `WATCH #FFC773` · `WIDE #FF6B4A` · `DARK #6E7488` · `ACTION #B79CFF`

---

## 2. Typography

Three families, strictly separated jobs. If unsure which to use, ask what the text *is*: a
name, a sentence, or a number.

| Role | Face | Where |
|---|---|---|
| Display | Graphik LCG *(Archivo placeholder)* | wordmark and H1 only |
| Interface | Manrope 400/500 | every sentence, label, nav item, button |
| Data | IBM Plex Mono, `tabular-nums` | every price, bps figure, address, ticker |

Graphik is licensed separately and not included — see `LICENSING.md`.

### Scale

| Role | Size | Family |
|---|---|---|
| **Reading** | 92 / 140 / 200px, tracking −.03em | Data |
| H1 | 28 / 36 / 44px | Display |
| H2 | 27 / 34px | Display |
| H3 | 17px | Display |
| Body | 15px / 25px | Interface |
| UI | 13px / 15.6px | Interface |
| Caption | 11px / 14px | Interface |
| Label | 10px / .22em uppercase | Data |

**Numeral-first hierarchy.** The `.reading` role is the only element allowed above H1 size.
Every landing page makes the headline the biggest thing; an instrument makes the *measurement*
the biggest thing, with the H1 small and quiet beneath it. That is the one real aesthetic bet
here, and it works because the number is true.

`leading-[15.6px]` is 13 × 1.2 and recurs throughout. Keep it exact — rounding to 16px breaks
alignment between the nav, the chips and the cards.

---

## 3. Space

The whole composition hangs off a two-value gutter: **20px below `md`, 35px at `md` and
above**. Nav padding, the H1 offset and the bottom row all declare it independently and must
match, or the layout visibly skews.

The global reset kills every default, so **every gap on the page is declared**. If you see
space you did not write, something is wrong.

Values in use: `2px` chip padding · `3px` nav number gap and the one radius · `4px` above node
descriptions · `10px` CTA internal gap · `12px` status-strip gap · `18px` card paragraph
margin · `20px` mobile gutter and card padding · `40px` nav group gaps and tap targets.

Sections below the fold are `72px` tall on mobile, `96px` at `md`, separated by `white/10`.
Body copy caps at `68ch`. Tables go full width inside `overflow-x-auto` — the page body never
scrolls sideways.

---

## 4. Motion

**Motion obeys the same rule as colour: it carries meaning, or it is not there.** Every
animation on the site is either the data moving, or something only this product has a reason
to do. Nothing floats, parallaxes or bounces.

Two curves, both now applied — the interactive one was documented and printed on `/system` for
weeks while being used nowhere, which is the kind of gap a design system exists to close.

- **Entrance** `cubic-bezier(0.16, 1, 0.3, 1)` — expo-out. `--ease-out`.
- **Interactive** `cubic-bezier(0.76, 0, 0.24, 1)` — expo-in-out. `--ease-io`. The default for
  every Tailwind `transition-*` utility and every hover, toggle and row in `globals.css`.

### The page breathes with the market

The session pip (`.dot`) has a heartbeat while the underlying market is open — 2.4s in the
regular session, slower in the thin ones — and holds still when it is closed. The pool field's
light columns drift while live and lock when closed. The site is visibly alive at 10am and
visibly frozen at 2am on a Sunday. Nothing else on the web does this because nothing else has
the reason to.

### Tick flashes

A figure that changes blooms in its own colour for 700ms and settles (`Tick`, `.tick-*`). The
terminal convention. Never on first mount — a page that flashes every figure on load is a page
shouting. This requires the page to actually change: `useLiveReadings` polls the same assembler
on the same 60-second cadence as the server, pausing while the tab is hidden.

### Source highlight

Hover any figure and everything not from the same source dims (`html.hi-*`, `[data-src]`).
The mechanism predates this section; what changed is the trigger. It used to be three squares
in one diagram. `SourceHighlight` now makes every carrier on the site a trigger, by delegation,
mouse pointers only.

### The diagram assembles itself

Once, on scroll-in: connectors draw (`drawLine`, `pathLength="100"`), then labels, then the
squares (`scaleIn`). **The choreography rule** — labels and connectors precede the things they
point to — is the same one the hero performs on load.

### Routes

Content arrives and the bar stays put (`.route-in`, 450ms). This is a keyed CSS entrance, not
the View Transitions API, which needs React 19.

### The rest

`.a-up` `.a-in` `.a-sl` `.a-sr` `.a-sc` `.a-gv` `.a-gh` remain available. Below the fold, only
the section header and the diagram animate, and only once — staggering every child reads as
decoration.

`prefers-reduced-motion` collapses every duration and forces final states, including the
heartbeat, the ticks and the diagram.

---

## 5. Surfaces and components

There are no filled cards. A surface is its border plus at most a 1.5% white wash.

`.spec` panel · `.btn` and `.btn-ghost` · `.flag` · `.seg` segmented control · `.drawer`
(verify output — a plain panel, never a modal) · `.rung` price-ladder row · `.dayrow` session
strip · `.tb` readout table.

Rules worth stating:

- **One solid accent block per viewport.** The filled CTA is the brightest object on screen and
  earns that by being the only one.
- **`rounded-[3px]` appears exactly once**, on the session chip. A second border radius is a bug.
- **Table row hover shifts background, never a border** — a border change moves the layout by a
  pixel.
- **Node squares stay empty.** An icon inside collapses the diagram into a feature grid.
- **The chamfered card is a signature — one per page.** Signatures repeated stop signifying.

---

## 6. Data display

### The hero field is the chart

Behind the reading, every live pool is a column of light — positioned by price, brightened by
depth on a log scale — with the reference burning through in amber. It used to sit under a
scrim as texture. It now has a priced axis at 75% of the hero's height with round-number ticks,
the reference named (`REAL NVDA · $229.01`), and the deepest pool named with its depth. The
canvas and the labels derive from one range function in `PoolField.tsx`, so a label can never
sit off its column. The two named labels drop to separate rows when they would overlap, which
they usually would — the deepest pool tracks the reference.

This is the one visual no other site can have, because it only exists if the product is
running. The video behind it is atmosphere at 28%. Below `md` the axis is hidden and the
canvas dimmed: there the copy spans the full width, and an axis under it is clutter.


**The dimension line.** Two marks on an axis, ticks above, the measured span between them
carrying the figure. Amber left is always the reference, ice blue right is always the pool, the
span gradient runs between them.

**The pool field.** Every pool as a column of light, positioned by price, brightened by depth
on a log scale, with the reference burning through. This is the hero background and the one
asset a competitor cannot copy, because it only exists if the product is running.

**Never plot a pool price against a raw share price.** The multiplier must be applied first.
CRWD sits at ×4.0 after a split; the naive comparison prints a premium that does not exist.

**Two money formatters, not interchangeable.** `depth()` is lossy on purpose for pool TVL;
`dollars()` is exact for money a person pays. Using the lossy one for an overpayment figure
once rendered $1,427 as "$1k".

---

## 7. Navigation

### Progressive disclosure

The house pattern for depth, used on the desk and now on every landing-page section: show the
answer, put the evidence behind a `.verify` button reading `[ what it opens ]`.

It applies wherever a component would otherwise render a long list — the 30-rung price ladder,
twelve table rows, nine columns, six lines of engine mandate, a worked multiplier example. The
collapsed state is the one a glance needs; the open state is complete. Nothing is summarised away
and nothing moves to another page, so a reader who wants everything gets everything without a
reader who wants the number having to scroll past it.

Two rules that keep it honest:

- **The label says what opens, and counts it.** `[ list all 30 pools ]`, `[ all 12 tokens ]` —
  never `[ more ]`. A reader should know the size of what they are about to open.
- **Never hide a caveat behind it.** Gross-versus-executable, stale flags, the size warning and
  every `NOT BUILT` gate stay visible in the collapsed state. Detail is optional; a qualification
  on a number is not.

`PoolStrip` is the other half of the pattern — where a list can be redrawn as one axis, redraw it
rather than truncating it. Thirty pools as thirty rows is 920px; as a strip it is 46px, and the
strip loses nothing a reader was actually using.

One bar, fixed at 56px, on every page. Three rules.

**The numbered list is the current page's table of contents.** Not a fixed copy of one page's
sections repeated everywhere. The first build hardcoded the landing page's `#s1`-`#s7` on all
four pages, so twenty-one of the twenty-eight section links pointed at ids that did not exist on
the page showing them — they looked live and did nothing. A page with no sections worth listing
(the desk is under two screens) shows no numbers rather than borrowed ones.

**Position is always stated.** The current page is accented and underlined; the section under
the bar is too, tracked on scroll. `aria-current` carries the same fact for a screen reader.

**Every page is reachable from every page, at every width.** Below `lg` the links move into a
`MENU` panel listing the pages and, when the page has them, its sections. Hiding a route on
small screens is not a responsive decision, it is a dead end — `/docs` and `/system` have no
footer, so on a phone they previously had no way out but the back button.

Anchored targets carry `scroll-margin-top: 72px` so a section clears the fixed bar instead of
landing under it. The rule is scoped to `[id]`, which is every target the nav can address.

## 8. Voice

`[ REFERENCE ]` — system entities, brackets with inner spaces. `POOL_SPREAD` — underscores,
never hyphens. `01.` — nav numbers carry a trailing period. `+217 bps` — gaps signed, in basis
points; percentages only in prose. Every figure carries a timestamp; a price without one is a
bug.

State the measurement, never recommend a trade. Publish thresholds so they can be argued with.
Name uncertainty in the same voice as certainty. Specific over clever: *"$3,669 more for the
same tokens"* beats *"save on slippage"*. No exclamation marks. No emoji.

Brand constraints are hard rules — see `docs/brand-compliance.md`.
