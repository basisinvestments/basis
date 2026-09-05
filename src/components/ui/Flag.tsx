import type { Flag as FlagType } from '@/lib/types';
import { FLAG_MEANING } from '@/lib/basis';

/** Outline only. A filled pill would compete with the CTA. */
export function Flag({ flag, className = '' }: { flag: FlagType; className?: string }) {
  return (
    <span className={`flag f-${flag} ${className}`} title={FLAG_MEANING[flag]}>
      {flag}
    </span>
  );
}
