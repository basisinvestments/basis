# Third-party assets

## Hero background video — REPLACE BEFORE PUBLIC LAUNCH

`public/video/basis-hero-1280.mp4`

**Source:** rendered asset distributed with the MotionSites "LUMEN // INDEX" landing-page
template, retrieved from their CloudFront distribution 2026-09-02.

**Status:** used here as concept artwork only. basis has no licence to it.

**What it is:** three luminous orchid forms on black, 1912x1080, 10s, re-encoded to 1280px at
CRF 22 (7.08 MB -> 0.46 MB; the source is ~95% pure black and compresses extraordinarily well).

**Why it must go:** it is someone else's render, and it has nothing to do with Stock Tokens.
The three forms happen to sit where the LUMEN template's three node squares were, which is why
the composition works — that is a coincidence of the template, not a design decision about
this product.

**The replacement, when it happens:** the canvas pool field in
`src/components/data/PoolField.tsx` already renders basis's own data as light. A bespoke loop
would be that renderer run over a long time window and exported as video — no third-party
asset, and the background becomes the dataset rather than decoration. The hero already has a
Both / Video / Data toggle so the two can be compared directly.

---

## Fonts

| Face | Role | Licence |
|---|---|---|
| Archivo | Display — **placeholder** | SIL Open Font License 1.1, via Google Fonts |
| Manrope | Interface | SIL Open Font License 1.1, via Google Fonts |
| IBM Plex Mono | Data | SIL Open Font License 1.1, via Google Fonts |

The intended display face is **Graphik LCG**, which is a commercial licence from Commercial
Type and is not included. Archivo stands in as the closest neo-grotesque available under an
open licence. Swapping it is a one-line change in `src/app/layout.tsx` plus the fallback stack
in `tailwind.config.ts`.

---

## Data

Both upstream sources are public and keyless. basis reads them, computes a derived measurement,
and attributes both in the footer of every page and in `docs/data-sources.md`. No data is
redistributed in bulk; the stored capture in `src/lib/fallback.ts` is a small fixture retained
for the degradation path and is labelled as a capture wherever it is rendered.

Neither provider has endorsed, reviewed or is affiliated with this project. See
`docs/brand-compliance.md`.
