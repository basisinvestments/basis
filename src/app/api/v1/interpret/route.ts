import { NextResponse } from 'next/server';

import {
  CHIPS,
  OUTPUT_SCHEMA,
  SYSTEM_PROMPT,
  buildContext,
  interpreterConfigured,
  interpreterEndpoint,
  interpreterModel,
  isChipKey,
  verifyFactors,
  type Interpretation,
} from '@/lib/interpret';
import { getCorporateActions, getPools, getReadings } from '@/lib/readings';
import { resolve } from '@/lib/registry';

/**
 * POST /v1/interpret  { symbol, chip }
 *
 * One model call, no tools, no loop. The reading is the entire context — see
 * src/lib/interpret.ts for why the grounding is mechanical rather than a promise.
 *
 * A plain fetch rather than an SDK: it is a single POST to a chat-completions
 * endpoint, and the request carries a strict JSON schema the answer must satisfy.
 *
 * Where inference runs is not load-bearing and is never compiled in. The grounding
 * lives in the frozen prompt, the output schema and the field verifier — all of it
 * in this repository, none of it tied to a provider. Endpoint, model and key are
 * environment configuration.
 *
 * Not cached: the answer describes a reading at an instant, and serving a stale
 * explanation of a moved number is precisely the failure this product exists to
 * catch elsewhere.
 */
export const dynamic = 'force-dynamic';

// Provider is configuration, never compiled in. See lib/interpret.ts.
const ENDPOINT = interpreterEndpoint();

/**
 * A model that reasons before answering spends completion tokens on both, so the cap
 * has to cover the thinking as well as the answer. Measured in this build: roughly
 * 460 completion tokens at low effort against ~2,500 at default. 4,000 leaves
 * headroom without inviting a runaway.
 */
const MAX_TOKENS = 4000;

interface ChatResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  model?: string;
  error?: { message?: string; code?: number | string };
}

export async function POST(request: Request) {
  // Validate the request before checking configuration. A malformed request is a
  // 400 whether or not a key is present — short-circuiting on config first would
  // answer "no key" to a caller whose real problem is a bad symbol.
  let body: { symbol?: unknown; chip?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'bad_request', message: 'Body must be JSON.' } },
      { status: 400 },
    );
  }

  const symbolRaw = typeof body.symbol === 'string' ? body.symbol : '';
  const chipRaw = typeof body.chip === 'string' ? body.chip : '';
  const meta = resolve(symbolRaw);

  if (!meta) {
    return NextResponse.json(
      { error: { code: 'unknown_symbol', message: 'Not a canonical Stock Token.' } },
      { status: 400 },
    );
  }
  // Only the fixed question set is accepted. Free text is not a supported input,
  // which is what keeps "should I buy" from being expressible at all.
  if (!isChipKey(chipRaw)) {
    return NextResponse.json(
      {
        error: {
          code: 'unknown_question',
          message: `chip must be one of: ${Object.keys(CHIPS).join(', ')}`,
        },
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.INTERPRETER_API_KEY;
  if (!interpreterConfigured() || !apiKey) {
    return NextResponse.json(
      {
        error: {
          code: 'interpreter_not_configured',
          message:
            'The interpreter is not configured on this deployment. Everything else on the desk works without it.',
        },
      },
      { status: 503 },
    );
  }

  const [{ readings }, poolData, actions] = await Promise.all([
    getReadings({ symbols: [meta.symbol] }),
    getPools(meta.symbol),
    getCorporateActions(),
  ]);

  const reading = readings[0];
  if (!reading) {
    return NextResponse.json(
      { error: { code: 'no_reading', message: 'No reading available for this symbol.' } },
      { status: 503 },
    );
  }

  const pools = poolData?.pools ?? (reading.pool ? [reading.pool] : []);
  const context = buildContext(reading, pools, actions);
  const model = interpreterModel();

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Application attribution, sent for provider-side reporting.
        'HTTP-Referer': 'https://basis.xyz',
        'X-Title': 'basis',
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        // Explaining supplied facts is not a hard problem. Low effort cut completion
        // tokens from ~2,500 to ~460 and improved the output — tighter claims, one
        // field each — at roughly a quarter of the cost.
        reasoning: { effort: 'low' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `${context}\n\nQuestion: ${CHIPS[chipRaw].question}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'interpretation', strict: true, schema: OUTPUT_SCHEMA.schema },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    const data = (await res.json()) as ChatResponse;

    if (!res.ok || data.error) {
      const status = res.status === 429 ? 429 : 502;
      return NextResponse.json(
        {
          error: {
            code: res.status === 429 ? 'rate_limited' : 'upstream_error',
            message: data.error?.message ?? `Model provider returned ${res.status}.`,
          },
        },
        { status },
      );
    }

    const choice = data.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: { code: 'empty_response', message: 'No content returned.' } },
        { status: 502 },
      );
    }
    // A reasoning model that runs out of budget mid-answer returns truncated JSON.
    // Say so rather than surfacing a parse error.
    if (choice?.finish_reason === 'length') {
      return NextResponse.json(
        {
          error: {
            code: 'truncated',
            message: 'The model hit its token ceiling before finishing. Try again.',
          },
        },
        { status: 502 },
      );
    }

    let parsed: Interpretation;
    try {
      parsed = JSON.parse(content) as Interpretation;
    } catch {
      return NextResponse.json(
        { error: { code: 'unparseable', message: 'Response was not valid JSON.' } },
        { status: 502 },
      );
    }

    // The verification step: a claim whose field does not resolve against the
    // reading we served is dropped before it reaches the reader.
    const contextObject: unknown = JSON.parse(context.slice(context.indexOf('{')));
    const { kept, dropped } = verifyFactors(parsed.factors ?? [], contextObject);

    return NextResponse.json(
      {
        symbol: meta.symbol,
        chip: chipRaw,
        question: CHIPS[chipRaw].label,
        asOf: reading.asOf,
        stale: reading.stale,
        summary: parsed.summary,
        factors: kept,
        droppedFactors: dropped,
        caveat: parsed.caveat ?? '',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: { code: 'timeout', message: 'The model provider did not respond in time.' } },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: { code: 'internal', message: 'Could not produce an interpretation.' } },
      { status: 500 },
    );
  }
}
