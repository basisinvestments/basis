import type { Pool } from './types';

/**
 * The 2026-09-02 capture, kept as a typed fixture.
 *
 * This is not seed data and it is not a demo. It is what the site renders when an
 * upstream source fails, and every row served from here is marked `stale: true` and
 * flagged DARK. The rule the product rests on: never display a number without its
 * provenance. A frozen figure presented as live is the exact failure basis exists to
 * catch in other people's dashboards.
 *
 * Captured 2026-09-02 18:33 UTC during a regular session, verified against both
 * upstreams at the time.
 */

export const CAPTURE_ISO = '2026-09-02T18:33:00.000Z';

export interface FallbackEntry {
  mid: number;
  multiplier: number;
  pools: Pool[];
}

const p = (
  price: number,
  quote: string,
  dex: string,
  version: string,
  liquidityUsd: number,
): Pool => ({ price, quote, dex, version, liquidityUsd });

export const FALLBACK: Record<string, FallbackEntry> = {
  NVDA: {
    mid: 225.03,
    multiplier: 1,
    pools: [
      p(216.03, 'WETH', 'uniswap', 'v4', 448709), p(216.51, 'WETH', 'uniswap', 'v4', 102024),
      p(216.84, 'WETH', 'uniswap', 'v4', 381305), p(217.2, 'ETH', 'uniswap', 'v4', 18675),
      p(217.67, 'WETH', 'uniswap', 'v4', 125871), p(217.68, 'ETH', 'uniswap', 'v4', 164054),
      p(218.28, 'WETH', 'uniswap', 'v4', 603592), p(218.33, 'WETH', 'uniswap', 'v4', 488289),
      p(218.91, 'WETH', 'uniswap', 'v4', 408116), p(220.25, 'WETH', 'uniswap', 'v4', 590111),
      p(220.6, 'WETH', 'uniswap', 'v4', 483659), p(222.49, 'WETH', 'uniswap', 'v4', 505261),
      p(223.63, 'WETH', 'uniswap', 'v4', 387108), p(224.01, 'WETH', 'uniswap', 'v4', 482627),
      p(224.78, 'ETH', 'uniswap', 'v4', 20214), p(224.96, 'WETH', 'alandale', '', 19730),
      p(224.97, 'WETH', 'uniswap', 'v4', 18815), p(225.04, 'USDG', 'up', 'v3', 41020),
      p(225.07, 'USDG', 'uniswap', 'v3', 6089856), p(225.16, 'ETH', 'uniswap', 'v4', 22395),
      p(225.17, 'WETH', 'ramses', 'v3', 9902), p(225.26, 'WETH', 'uniswap', 'v3', 518894),
      p(225.32, 'WETH', 'uniswap', 'v4', 491718), p(225.33, 'USDG', 'uniswap', 'v3', 25888),
      p(225.58, 'WETH', 'uniswap', 'v3', 186503), p(225.73, 'WETH', 'uniswap', 'v4', 666783),
      p(227.17, 'WETH', 'uniswap', 'v4', 441810), p(228.36, 'WETH', 'uniswap', 'v4', 423299),
    ],
  },
  SPY: {
    mid: 765.49,
    multiplier: 1,
    pools: [
      p(760.26, 'GIGA', 'giga', 'v3', 87613), p(764.54, 'USDG', 'uniswap', 'v4', 40705),
      p(764.69, 'USDG', 'uniswap', 'v4', 85198), p(765.65, 'PONS', 'ramses', 'v3', 14408),
      p(765.69, 'WETH', 'alandale', '', 6464), p(766.54, 'USDG', 'uniswap', 'v3', 26501),
      p(766.75, 'USDG', 'uniswap', 'v4', 3825918), p(767.33, 'ETH', 'uniswap', 'v4', 22709),
      p(768.03, 'USDG', 'ramses', 'v3', 346826), p(768.16, 'USDG', 'alandale', '', 81895),
      p(768.19, 'USDG', 'ramses', 'v3', 720008), p(768.22, 'USDG', 'uniswap', 'v3', 110797),
      p(768.27, 'USDG', 'up', 'v3', 43175), p(768.29, 'NVDA', 'uniswap', 'v3', 3899),
      p(768.43, 'USDG', 'giga', 'v3', 83274), p(768.53, 'WETH', 'ramses', 'v3', 228767),
      p(768.72, 'WETH', 'uniswap', 'v3', 1354023), p(770.14, 'NVDA', 'uniswap', 'v4', 397431),
      p(770.75, 'NVDA', 'uniswap', 'v4', 4442), p(782.89, 'ETH', 'uniswap', 'v4', 24010),
    ],
  },
  AAPL: {
    mid: 326.33,
    multiplier: 1.000566,
    pools: [
      p(322.95, 'ETH', 'uniswap', 'v4', 21136), p(325.61, 'USDG', 'alandale', '', 12031),
      p(326.23, 'USDG', 'uniswap', 'v4', 783490), p(326.27, 'USDG', 'uniswap', 'v3', 250371),
      p(326.28, 'USDG', 'uniswap', 'v3', 200026), p(326.3, 'SPCX', 'uniswap', 'v4', 3716),
      p(326.34, 'USDG', 'uniswap', 'v4', 20311), p(326.34, 'USDG', 'uniswap', 'v4', 22099),
      p(326.36, 'USDG', 'ramses', 'v3', 14463), p(326.37, 'USDG', 'up', 'v3', 347718),
      p(326.4, 'USDG', 'uniswap', 'v4', 203796), p(326.53, 'WETH', 'uniswap', 'v3', 60241),
      p(326.61, 'USDG', 'giga', 'v3', 4076), p(327.14, 'SPY', 'uniswap', 'v3', 6446),
      p(327.23, 'NVDA', 'uniswap', 'v4', 7199),
    ],
  },
  QQQ: {
    mid: 708.78,
    multiplier: 1,
    pools: [
      p(707.38, 'USDG', 'uniswap', 'v4', 11646), p(709.28, 'USDG', 'uniswap', 'v3', 76930),
      p(709.67, 'SPY', 'uniswap', 'v4', 1692816), p(710.45, 'USDG', 'ramses', 'v3', 4362),
      p(710.62, 'USDG', 'uniswap', 'v3', 1000623), p(710.77, 'WETH', 'ramses', 'v3', 3528),
      p(711.14, 'SPY', 'ramses', 'v3', 56585), p(711.5, 'SPY', 'uniswap', 'v3', 13449),
      p(711.96, 'WETH', 'uniswap', 'v3', 92929), p(712.46, 'ETH', 'uniswap', 'v4', 35463),
    ],
  },
  TSLA: {
    mid: 352.6,
    multiplier: 1,
    pools: [
      p(346.62, 'OPTIMUS', 'uniswap', 'v4', 239974), p(352.42, 'SPY', 'uniswap', 'v4', 278459),
      p(352.64, 'USDG', 'uniswap', 'v4', 3664), p(352.65, 'USDG', 'up', 'v3', 29221),
      p(352.99, 'USDG', 'uniswap', 'v4', 8163), p(353.1, 'USDG', 'uniswap', 'v3', 356606),
      p(353.38, 'USDG', 'uniswap', 'v4', 260556), p(353.45, 'WETH', 'uniswap', 'v3', 93184),
      p(353.5, 'WETH', 'alandale', '', 65377), p(353.56, 'USDG', 'alandale', '', 15439),
      p(354.62, 'USDG', 'uniswap', 'v4', 3884), p(365.66, 'ETH', 'uniswap', 'v4', 69667),
    ],
  },
  AMC: {
    mid: 2.66,
    multiplier: 1,
    pools: [
      p(2.57, 'ETH', 'uniswap', 'v4', 51457), p(2.6, 'USDG', 'uniswap', 'v4', 3921),
      p(2.62, 'USDG', 'uniswap', 'v4', 7946), p(2.63, 'USDG', 'uniswap', 'v4', 5248),
      p(2.64, 'USDG', 'uniswap', 'v3', 47543),
    ],
  },
  /** Captured 16:35 UTC. The x4.0 multiplier is the split trap — see lib/basis.ts. */
  CRWD: { mid: 203.58, multiplier: 4, pools: [p(787.52, 'ETH', 'uniswap', 'v4', 5226)] },
  PLTR: { mid: 167.76, multiplier: 1, pools: [p(166.99, 'USDG', 'uniswap', 'v3', 236599)] },
  GME: { mid: 18.77, multiplier: 1, pools: [p(18.76, 'USDG', 'uniswap', 'v3', 519950)] },
  MSFT: { mid: 494.07, multiplier: 1, pools: [p(494.26, 'USDG', 'uniswap', 'v3', 155427)] },
  SGOV: { mid: 100.41, multiplier: 1.005102, pools: [p(100.9, 'USDG', 'uniswap', 'v3', 337543)] },
  MSTR: { mid: 122.88, multiplier: 1, pools: [p(122.86, 'USDG', 'uniswap', 'v3', 726175)] },
};
