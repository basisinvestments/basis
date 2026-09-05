import { ImageResponse } from 'next/og';
import { getReadings } from '@/lib/readings';
import { SESSION_LABEL } from '@/lib/session';

/**
 * The share card is a live reading.
 *
 * Every other project's card is a logo on a gradient, rendered once. This one is
 * generated when the link is unfurled: the widest gap on the board right now, which
 * token, the session, and the minute it was read. Post the link on a Saturday and
 * the card says the reference is frozen. Nobody else's share card can do that,
 * because nobody else's has a reason to.
 *
 * Same assembler as the page, so the card can never quote a figure the page would
 * contradict at the same moment.
 */
export const runtime = 'nodejs';
export const revalidate = 60;
export const alt = 'basis — the gap between a Stock Token and its share, measured now';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const REF = '#FFB454';
const POOL = '#AFDDFF';
const HOT = '#FF6B4A';
const MUTED = 'rgba(255,255,255,0.45)';

export default async function OpenGraphImage() {
  const { readings, session, asOf } = await getReadings();

  const closed = session === 'closed';

  // The widest |basis| with a live reference. When the market is shut there is no
  // live reference for any row, so there is no widest gap — the reading is
  // unmeasurable, not zero, and the card says so rather than quoting a number
  // against a price that stopped moving. DARK rows are excluded for the same
  // reason. This is the rule the page itself applies.
  const measurable = closed
    ? []
    : readings.filter((r) => r.basisBps !== null && !r.stale && r.flag !== 'DARK');
  const lead = measurable.length
    ? measurable.reduce((a, b) => (Math.abs(b.basisBps!) > Math.abs(a.basisBps!) ? b : a))
    : null;
  const stamp = asOf.slice(11, 16) + ' UTC';
  const bps = lead?.basisBps ?? 0;
  const sign = bps > 0 ? '+' : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          fontFamily: 'ui-monospace, Menlo, monospace',
          position: 'relative',
        }}
      >
        {/* The four verticals the site carries behind every section. */}
        {['12.6%', '37.5%', '61.9%', '86.2%'].map((left) => (
          <div
            key={left}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left,
              width: 1,
              background: 'rgba(255,255,255,0.05)',
            }}
          />
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.5 }}>BASIS // SPREAD</div>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: closed ? 'transparent' : REF,
                border: closed ? `1.5px solid ${REF}` : 'none',
                boxShadow: closed ? 'none' : `0 0 12px ${REF}`,
              }}
            />
          </div>
          <div style={{ fontSize: 15, letterSpacing: 3, color: MUTED }}>
            {closed ? 'REFERENCE FROZEN' : `LIVE · ${stamp}`}
          </div>
        </div>

        {lead ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 15, letterSpacing: 3, color: MUTED, marginBottom: 6 }}>
              {`WIDEST GAP ON THE BOARD · ${lead.symbol}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
              <div
                style={{
                  fontSize: 212,
                  lineHeight: 0.9,
                  fontWeight: 500,
                  letterSpacing: -8,
                  color: Math.abs(bps) >= 200 ? HOT : Math.abs(bps) >= 100 ? '#fff' : POOL,
                }}
              >
                {`${sign}${bps}`}
              </div>
              <div style={{ fontSize: 56, lineHeight: 1.1, color: 'rgba(255,255,255,0.5)', paddingBottom: 14 }}>
                bps
              </div>
            </div>
            <div style={{ display: 'flex', gap: 48, marginTop: 26, fontSize: 22 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, letterSpacing: 3, color: MUTED }}>{`REAL ${lead.symbol}`}</div>
                <div style={{ color: REF, marginTop: 6 }}>{`$${lead.reference.price.toFixed(2)}`}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, letterSpacing: 3, color: MUTED }}>DEEPEST POOL</div>
                <div style={{ color: POOL, marginTop: 6 }}>
                  {lead.pool ? `$${lead.pool.price.toFixed(2)}` : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 13, letterSpacing: 3, color: MUTED }}>STATE</div>
                <div style={{ marginTop: 6, color: lead.flag === 'WIDE' ? HOT : '#fff' }}>{lead.flag}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 15, letterSpacing: 3, color: MUTED, marginBottom: 10 }}>
              {closed ? 'THE MARKET IS SHUT' : 'NO LIVE REFERENCE'}
            </div>
            <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 500, letterSpacing: -2 }}>
              One share. Two prices.
            </div>
            <div style={{ fontSize: 24, color: MUTED, marginTop: 18, maxWidth: 820, lineHeight: 1.4 }}>
              {closed
                ? 'The reference is frozen and every pool is still trading against it. The gap is unmeasurable, not zero.'
                : 'The distance between what a share is worth and what its token just traded for.'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: MUTED }}>
          <div style={{ letterSpacing: 1 }}>{SESSION_LABEL[session].toUpperCase()}</div>
          <div>Stock Tokens on Robinhood Chain · every figure verifiable</div>
        </div>
      </div>
    ),
    size,
  );
}
