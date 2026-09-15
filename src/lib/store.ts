import 'server-only';

import { getStore } from '@netlify/blobs';
import type { LedgerEntry } from './treasury';

/**
 * The ledger's memory.
 *
 * `docs/roadmap.md` listed persistence as "needs a host with a database". The host
 * has one: Netlify Blobs is a key-value store that exists on every site, needs no
 * provisioning, and is reachable from the functions this app already runs as. This
 * is the first thing in the project that remembers anything between requests.
 *
 * Locally there is no Netlify context, so the same interface runs on a Map. That
 * means the local ledger forgets on restart — which is fine for development and is
 * said plainly in the API response (`storage: "memory"`), so nobody mistakes a local
 * run for a record.
 */

const STORE = 'treasury-ledger';
/** Keep this many minutes. A week at one a minute is ~10,000 entries; this is plenty. */
const KEEP = 10_080;

interface Backend {
  kind: 'netlify' | 'memory';
  get(key: string): Promise<LedgerEntry | null>;
  set(key: string, value: LedgerEntry): Promise<void>;
  keys(): Promise<string[]>;
}

const memory = new Map<string, LedgerEntry>();

function memoryBackend(): Backend {
  return {
    kind: 'memory',
    async get(k) {
      return memory.get(k) ?? null;
    },
    async set(k, v) {
      memory.set(k, v);
    },
    async keys() {
      return [...memory.keys()];
    },
  };
}

function netlifyBackend(): Backend {
  const store = getStore({ name: STORE, consistency: 'strong' });
  return {
    kind: 'netlify',
    async get(k) {
      return (await store.get(k, { type: 'json' })) as LedgerEntry | null;
    },
    async set(k, v) {
      await store.setJSON(k, v);
    },
    async keys() {
      const { blobs } = await store.list();
      return blobs.map((b) => b.key);
    },
  };
}

let backend: Backend | null = null;

function pick(): Backend {
  if (backend) return backend;
  // The Netlify runtime injects the context these need; absent that, getStore()
  // throws on first use rather than at construction, so probe it.
  try {
    if (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT) {
      backend = netlifyBackend();
      return backend;
    }
  } catch {
    /* fall through */
  }
  backend = memoryBackend();
  return backend;
}

export function storageKind(): Backend['kind'] {
  return pick().kind;
}

/** Record one minute. Idempotent: the same minute recorded twice is one entry. */
export async function record(entry: LedgerEntry): Promise<{ recorded: boolean }> {
  const b = pick();
  const existing = await b.get(entry.minute);
  if (existing) return { recorded: false };
  await b.set(entry.minute, entry);
  return { recorded: true };
}

/** The most recent `n` entries, newest first. */
export async function tail(n = 120): Promise<LedgerEntry[]> {
  const b = pick();
  const keys = (await b.keys()).sort().slice(-Math.min(n, KEEP)).reverse();
  const out: LedgerEntry[] = [];
  for (const k of keys) {
    const e = await b.get(k);
    if (e) out.push(e);
  }
  return out;
}

/** How much history exists, and since when. */
export async function extent(): Promise<{ entries: number; since: string | null; storage: Backend['kind'] }> {
  const b = pick();
  const keys = (await b.keys()).sort();
  return { entries: keys.length, since: keys[0] ?? null, storage: b.kind };
}
