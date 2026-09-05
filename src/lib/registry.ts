import type { Source } from './types';

/**
 * Canonical Stock Token addresses on Robinhood Chain (chain 4663), taken from the
 * issuer's published contract list.
 *
 * This registry is the imposter defence. The issuer's own documentation is blunt
 * about it: a token with a matching name or ticker at a *different* address is not
 * a Stock Token. Every symbol basis reports resolves through here — we never trust
 * a ticker string from a pool index.
 */
export const STOCK_TOKENS: Record<string, { address: string; name: string }> = {
  NVDA: { address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', name: 'NVIDIA' },
  SPY: { address: '0x117cc2133c37B721F49dE2A7a74833232B3B4C0C', name: 'SPDR S&P 500' },
  AAPL: { address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', name: 'Apple' },
  QQQ: { address: '0xD5f3879160bc7c32ebb4dC785F8a4F505888de68', name: 'Invesco QQQ' },
  TSLA: { address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', name: 'Tesla' },
  AMC: { address: '0x05a3d1Cd21d0C88145E82600E62e7E496e0F222B', name: 'AMC Entertainment' },
  MSFT: { address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74', name: 'Microsoft' },
  CRWD: { address: '0xea72Ecca2d0f6bFA1394DBBCff85b52CD4233931', name: 'CrowdStrike' },
  PLTR: { address: '0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A', name: 'Palantir' },
  GME: { address: '0x1b0E319c6A659F002271B69dB8A7df2F911c153E', name: 'GameStop' },
  SGOV: { address: '0x92FD66527192E3e61d4DDd13322Aa222DE86F9B5', name: 'iShares 0-3M Treasury' },
  MSTR: { address: '0xec262a75e413fAfD0dF80480274532C79D42da09', name: 'Strategy' },
};

/** Non-equity contracts on the same chain, for labelling quote assets. */
export const CHAIN = {
  id: 4663,
  name: 'Robinhood Chain',
  rpc: 'https://rpc.mainnet.chain.robinhood.com',
  explorer: 'https://robinhoodchain.blockscout.com',
  weth: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73',
  usdg: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
} as const;

export function featuredSymbols(): string[] {
  const raw = process.env.BASIS_FEATURED;
  const list = raw ? raw.split(',').map((s) => s.trim().toUpperCase()) : ['NVDA', 'SPY', 'AAPL', 'QQQ', 'TSLA', 'AMC'];
  return list.filter((s) => s in STOCK_TOKENS);
}

export function allSymbols(): string[] {
  return Object.keys(STOCK_TOKENS);
}

export function resolve(symbol: string): { symbol: string; address: string; name: string } | null {
  const key = symbol.toUpperCase();
  const hit = STOCK_TOKENS[key];
  return hit ? { symbol: key, ...hit } : null;
}

/** Which colour a figure gets. Kept beside the registry so the mapping has one home. */
export const SOURCE_COLOR: Record<Source, string> = {
  ref: 'var(--ref)',
  pool: '#AFDDFF',
  oracle: '#FFFFFF',
};
