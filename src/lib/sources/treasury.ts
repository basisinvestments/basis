import 'server-only';

import { CHAIN } from '@/lib/registry';

/**
 * The treasury balance, read from the chain — never typed in.
 *
 * A balance the site displays has to be a balance anyone can confirm. So the only
 * source is the wallet itself: `eth_getBalance` for the gas balance and an ERC-20
 * `balanceOf` for USDG, over the public RPC, with the block and the time of the read
 * stamped on the result. If no wallet is configured the site says so; it never shows
 * a placeholder figure.
 *
 * Read-only. This module holds no key and cannot move anything.
 */

export interface TreasuryBalance {
  configured: true;
  address: string;
  /** Native balance in ETH. Gas, not treasury capital. */
  eth: number;
  /** USDG balance — the treasury's capital under the mandate. */
  usdg: number;
  /** USD value: USDG at par. ETH is not counted; it is gas. */
  usd: number;
  block: number;
  readAt: string;
  explorer: string;
}

export interface TreasuryUnconfigured {
  configured: false;
  reason: string;
}

const RPC_HEADERS = {
  'content-type': 'application/json',
  // The public RPC rejects bare fetches. See docs/data-sources.md.
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) basis/0.2',
};

const SEL_BALANCE_OF = '0x70a08231';
const SEL_DECIMALS = '0x313ce567';

function pad(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

async function rpc<T>(calls: Array<{ method: string; params: unknown[] }>): Promise<T[]> {
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i + 1, ...c }));
  const res = await fetch(CHAIN.rpc, {
    method: 'POST',
    headers: RPC_HEADERS,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const out = (await res.json()) as Array<{ id: number; result?: T; error?: { message: string } }>;
  return out
    .sort((a, b) => a.id - b.id)
    .map((r) => {
      if (r.error) throw new Error(r.error.message);
      return r.result as T;
    });
}

export function treasuryAddress(): string | null {
  const a = process.env.TREASURY_ADDRESS?.trim();
  return a && /^0x[0-9a-fA-F]{40}$/.test(a) ? a : null;
}

export async function fetchTreasuryBalance(): Promise<TreasuryBalance | TreasuryUnconfigured> {
  const address = treasuryAddress();
  if (!address) {
    return {
      configured: false,
      reason: 'No treasury wallet is configured on this deployment. The balance shown is nothing, not a number.',
    };
  }

  const [blockHex, ethHex, usdgHex, decHex] = await rpc<string>([
    { method: 'eth_blockNumber', params: [] },
    { method: 'eth_getBalance', params: [address, 'latest'] },
    { method: 'eth_call', params: [{ to: CHAIN.usdg, data: SEL_BALANCE_OF + pad(address) }, 'latest'] },
    { method: 'eth_call', params: [{ to: CHAIN.usdg, data: SEL_DECIMALS }, 'latest'] },
  ]);

  const decimals = Number(BigInt(decHex ?? '0x6'));
  const usdgRaw = BigInt(usdgHex && usdgHex !== '0x' ? usdgHex : '0x0');
  const usdg = Number(usdgRaw) / 10 ** decimals;
  const eth = Number(BigInt(ethHex ?? '0x0')) / 1e18;

  return {
    configured: true,
    address,
    eth,
    usdg,
    usd: usdg,
    block: Number(BigInt(blockHex ?? '0x0')),
    readAt: new Date().toISOString(),
    explorer: `${CHAIN.explorer}/address/${address}`,
  };
}
