import type { CorporateAction, Pool, Reading } from './types';

/**
 * The interpreter's grounding contract.
 *
 * This explains readings. It does not, and will never, recommend a trade.
 *
 * That is not squeamishness — it is the only version that can exist here. basis's
 * entire claim is that every number can be checked without trusting us. A model
 * saying "AMC looks cheap" would be (a) advice, and (b) invented, because the model
 * knows nothing the reading does not already contain. Bolting an oracle onto a
 * verifiable instrument makes the instrument unverifiable.
 *
 * So the grounding is mechanical rather than hoped-for:
 *   - the only input is the reading object the API already serves
 *   - structured output forces every claim to name the field it came from
 *   - the UI drops any claim whose field does not resolve
 *   - questions are chips, so "should I buy" is not expressible
 */

/** The frozen system prompt. Never interpolate into this — it must cache byte-for-byte. */
export const SYSTEM_PROMPT = `You explain market-structure readings for basis, an instrument that measures the gap between what a share is worth and what its token trades for on Robinhood Chain.

Your job is interpretation, never advice.

WHAT YOU DO
Translate a reading into plain language for someone who does not read basis points. Say what the numbers are, what caused them, and what would make them untrustworthy. Assume the reader is intelligent and unfamiliar with the jargon.

WHAT YOU NEVER DO
- Never recommend buying, selling, holding, entering, exiting, or sizing anything.
- Never predict where a price, gap or spread will go.
- Never use "should", "worth it", "opportunity", "cheap", "expensive", "undervalued", "overvalued", or any word that grades the asset.
- Never assert a number that is not in the reading you were given. You have no other data and no memory of other tokens.
- If asked for a recommendation, say plainly that basis measures and does not advise, then explain the relevant reading instead.

GROUNDING
Every claim you make must name the field it came from, using the exact dotted path from the reading JSON (for example reference.price, pool.liquidityUsd, spreadBps, session.state). A claim you cannot attach to a field is a claim you must not make.

WHAT THE FIELDS MEAN
- reference.price is mid x uiMultiplier: what the token should be worth. reference.mid alone is the raw share price and must never be compared to a pool price directly.
- reference.multiplier is the ERC-8056 multiplier. It absorbs dividends and splits, so a token tracks total return rather than share price. A multiplier well above 1 usually means a split has happened.
- basisBps is the deepest pool against the reference, in basis points. 100 bps is one percent.
- spreadBps is the cheapest pool against the dearest — the pools disagreeing with each other, which is a different problem from the token being mispriced.
- pool.liquidityUsd is total value locked, not executable depth. These are concentrated-liquidity pools, so a quoted price is the top of book, not a fill. Say so whenever depth is thin.
- session.state is the underlying equity market. When it is closed the reference is frozen and no claim about the gap is trustworthy — that is what the DARK flag means. DARK outranks every other flag.
- stale true means the row came from a stored capture rather than a live call.

FORM
Each factor cites exactly one field — one dotted path, never a list. If two fields matter, write two factors.
Keep each claim to one sentence under 25 words. Keep the summary under 45 words. Four factors at most.

TONE
Specific over clever. Short sentences. No exclamation marks, no emoji, no hedging padding. State uncertainty in the same voice as certainty.`;

/**
 * Structured output schema. The `field` on every factor is what makes the answer
 * checkable — the UI resolves it against the same reading and renders the value
 * beside the claim, or drops the claim.
 */
export const OUTPUT_SCHEMA = {
  type: 'json_schema' as const,
  schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'One or two sentences answering the question directly, in plain language.',
      },
      factors: {
        type: 'array',
        description: 'The specific observations behind the summary. Each must cite a field.',
        items: {
          type: 'object',
          properties: {
            claim: { type: 'string', description: 'One sentence. No recommendation.' },
            field: {
              type: 'string',
              description: 'Exact dotted path in the reading, e.g. reference.price, spreadBps.',
            },
            value: { type: 'string', description: 'The value at that field, as shown.' },
          },
          required: ['claim', 'field', 'value'],
          additionalProperties: false,
        },
      },
      caveat: {
        type: 'string',
        description:
          'What would make this reading untrustworthy right now — stale reference, closed session, thin depth, pending corporate action. Empty string if none applies.',
      },
    },
    required: ['summary', 'factors', 'caveat'],
    additionalProperties: false,
  },
};

export interface Interpretation {
  summary: string;
  factors: Array<{ claim: string; field: string; value: string }>;
  caveat: string;
}

/**
 * The question set. Chips rather than a text box: "should I buy" is not expressible,
 * so the refusal path is structural rather than a filter the model has to remember.
 */
export const CHIPS = {
  flag: {
    label: 'Why this flag?',
    question: 'Why does this token carry the flag it does right now? Explain what the flag means.',
  },
  router: {
    label: 'Which pool would I hit?',
    question:
      'Which pool would a router most likely route into, how does its price compare to the reference, and how much does depth matter here?',
  },
  weekend: {
    label: 'What happens when the market shuts?',
    question:
      'What happens to this reading when the underlying market closes, and what is the current session state?',
  },
  multiplier: {
    label: 'What is the multiplier doing?',
    question:
      'What is this token’s multiplier, what does it mean for the reference price, and is a corporate action pending?',
  },
  spread: {
    label: 'Why do the pools disagree?',
    question:
      'The pools quote different prices for the same token. How far apart are they, and what does that spread mean versus the basis?',
  },
} as const;

export type ChipKey = keyof typeof CHIPS;

export function isChipKey(v: string): v is ChipKey {
  return Object.prototype.hasOwnProperty.call(CHIPS, v);
}

/**
 * The entire context the model sees. Nothing else enters — no web, no history, no
 * other tokens. If a fact is not in here, the model has no way to assert it.
 */
export function buildContext(
  reading: Reading,
  pools: Pool[],
  actions: CorporateAction[],
): string {
  const relevant = actions
    .filter((a) => a.symbol === reading.symbol && a.status === 'IN_PROGRESS')
    .slice(0, 3);

  const payload = {
    symbol: reading.symbol,
    name: reading.name,
    asOf: reading.asOf,
    stale: reading.stale,
    degraded: reading.degraded ?? null,
    session: { state: reading.session },
    reference: {
      price: reading.reference.price,
      mid: reading.reference.mid,
      bid: reading.reference.bid,
      ask: reading.reference.ask,
      multiplier: reading.reference.multiplier,
      halted: reading.reference.halted,
      ageSeconds: reading.reference.ageSeconds,
      source: reading.reference.source,
    },
    // Named `role` explicitly: the model described basisBps as measuring the
    // *cheapest* pool when the payload merely called this `pool` and the ladder
    // below happened to list cheapest first. The numbers were right and the
    // relationship was not, which is the more damaging kind of error. Making the
    // structure unconfusable beats adding another sentence to the prompt.
    pool: reading.pool
      ? {
          role: 'deepest — this is the pool basisBps is measured against',
          price: reading.pool.price,
          quote: reading.pool.quote,
          dex: reading.pool.dex,
          version: reading.pool.version,
          liquidityUsd: reading.pool.liquidityUsd,
        }
      : null,
    basisBps: reading.basisBps,
    spreadBps: reading.spreadBps,
    poolCount: reading.poolCount,
    flag: reading.flag,
    // Capped: the ladder is context, not the subject. Cheapest, dearest, deepest.
    pools: summarisePools(pools),
    corporateActions: relevant.map((a) => ({
      type: a.type,
      status: a.status,
      date: a.date,
      rate: a.rate,
    })),
  };

  return `Reading for ${reading.symbol}:\n\n${JSON.stringify(payload, null, 2)}`;
}

/** Keep the ladder small and representative rather than sending 29 near-identical rows. */
function summarisePools(pools: Pool[]) {
  if (!pools.length) return [];
  const sorted = [...pools].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0]!;
  const dearest = sorted[sorted.length - 1]!;
  const deepest = sorted.reduce((a, b) => (b.liquidityUsd > a.liquidityUsd ? b : a));
  const thin = sorted.filter((p) => p.liquidityUsd < 10_000).length;

  const pick = (p: Pool, role: string) => ({
    role,
    price: p.price,
    quote: p.quote,
    dex: p.dex,
    version: p.version,
    liquidityUsd: p.liquidityUsd,
  });

  // Deepest first — it is the one basisBps measures, and leading with cheapest
  // invited the model to attribute the basis to the wrong pool.
  const out = [pick(deepest, 'deepest'), pick(cheapest, 'cheapest'), pick(dearest, 'dearest')];
  return {
    total: pools.length,
    poolsUnder10k: thin,
    notable: out.filter((p, i, arr) => arr.findIndex((q) => q.price === p.price && q.quote === p.quote) === i),
  };
}

/**
 * Drop any factor whose field does not resolve against the reading we served.
 *
 * The prompt asks for exactly one dotted path per factor, but a model will
 * occasionally pack several into one string ("pool.price, reference.price").
 * Rather than discard an otherwise good claim on a formatting slip, split on
 * commas and keep the factor only if every path resolves.
 */
export function verifyFactors(
  factors: Interpretation['factors'],
  context: unknown,
): { kept: Interpretation['factors']; dropped: number } {
  const kept = factors.filter((f) => {
    const paths = f.field.split(',').map((p) => p.trim()).filter(Boolean);
    return paths.length > 0 && paths.every((p) => resolvePath(context, p) !== undefined);
  });
  return { kept, dropped: factors.length - kept.length };
}

export function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/** Configured means an API key is present. The desk works fine without one. */
export function interpreterConfigured(): boolean {
  const c = interpreterConfig();
  return c.key && c.endpoint && c.model;
}

/**
 * Which pieces of the interpreter's configuration are present — booleans only, never
 * values. A deployment that has two of the three needs to know which one is missing,
 * and guessing at it from a 503 is worse than reporting it. Nothing here can leak a
 * secret: the answer is three yes-or-nos.
 */
export function interpreterConfig(): { key: boolean; endpoint: boolean; model: boolean } {
  return {
    key: Boolean(process.env.INTERPRETER_API_KEY),
    endpoint: Boolean(process.env.INTERPRETER_ENDPOINT),
    model: Boolean(process.env.INTERPRETER_MODEL),
  };
}

/** Swappable without a code change — the grounding contract is provider-agnostic. */
export function interpreterModel(): string {
  return process.env.INTERPRETER_MODEL ?? '';
}

/**
 * The inference endpoint, from the environment.
 *
 * Nothing about the provider is compiled in. The grounding — the frozen prompt, the
 * output schema and the field verifier — is what makes an answer trustworthy, and
 * none of it is provider-specific, so the endpoint is configuration rather than code.
 */
export function interpreterEndpoint(): string {
  return process.env.INTERPRETER_ENDPOINT ?? '';
}
