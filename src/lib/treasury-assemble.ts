import 'server-only';

import { getPools, getReadings } from './readings';
import { fetchTreasuryBalance, type TreasuryBalance, type TreasuryUnconfigured } from './sources/treasury';
import { extent, record, tail } from './store';
import { ARM_THRESHOLD_USD, FEE_BPS_PER_LEG, evaluateAll, toLedgerEntry, type Evaluation, type LedgerEntry } from './treasury';
import type { Pool, SessionState } from './types';

/**
 * One assembler for the treasury view, called by both the page and /api/v1/treasury
 * — the same discipline as getReadings(): two surfaces, one source, so they cannot
 * disagree about a number.
 */

export const SIMULATED_LABEL =
  'SIMULATED — signals at quoted prices under the published mandate. No capital deployed, no fill, not executable size.';

export interface TreasuryView {
  asOf: string;
  session: SessionState;
  balance: TreasuryBalance | TreasuryUnconfigured;
  armThresholdUsd: number;
  simulated: {
    label: string;
    notionalUsd: number;
    notionalIsReal: boolean;
    feeAssumptionBpsPerLeg: number;
    now: Evaluation[];
    recordedThisMinute: boolean;
  };
  ledger: { entries: number; since: string | null; storage: 'netlify' | 'memory'; tail: LedgerEntry[] };
}

export async function assembleTreasury(tailN = 120): Promise<TreasuryView> {
  const [{ readings, session, asOf }, balance] = await Promise.all([
    getReadings(),
    fetchTreasuryBalance().catch(
      (e: Error): TreasuryUnconfigured => ({ configured: false, reason: `Chain read failed: ${e.message}` }),
    ),
  ]);

  const ladderEntries = await Promise.all(
    readings.map(async (r) => [r.symbol, (await getPools(r.symbol))?.pools ?? []] as const),
  );
  const ladders: Record<string, Pool[]> = Object.fromEntries(ladderEntries);

  // Sized against the real balance once it exceeds the threshold; otherwise against
  // the threshold itself — "what it would do once armed" — and the view says which.
  const realUsd = balance.configured ? balance.usd : 0;
  const notionalIsReal = realUsd >= ARM_THRESHOLD_USD;
  const notionalUsd = notionalIsReal ? realUsd : ARM_THRESHOLD_USD;

  const now = evaluateAll(readings, ladders, notionalUsd);
  const entry = toLedgerEntry(now, asOf, session, notionalUsd, notionalIsReal);
  const { recorded } = await record(entry);
  const [history, ext] = await Promise.all([tail(tailN), extent()]);

  return {
    asOf,
    session,
    balance,
    armThresholdUsd: ARM_THRESHOLD_USD,
    simulated: {
      label: SIMULATED_LABEL,
      notionalUsd,
      notionalIsReal,
      feeAssumptionBpsPerLeg: FEE_BPS_PER_LEG,
      now,
      recordedThisMinute: recorded,
    },
    ledger: { ...ext, tail: history },
  };
}
