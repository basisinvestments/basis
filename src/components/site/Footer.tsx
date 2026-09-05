import Link from 'next/link';
import { CHAIN } from '@/lib/registry';
import { dateStampUtc } from '@/lib/format';

export function Footer({ asOf }: { asOf: string }) {
  return (
    <footer className="px-5 py-12 md:px-[35px]">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <span className="lab">Reference</span>
          <p className="font-data mt-2 text-[11.5px] leading-[20px] text-white/45">
            api.robinhood.com/rhj/prices/&#123;symbol&#125;
            <br />api.robinhood.com/rhj/assets
            <br />api.robinhood.com/rhj/corporate-actions
          </p>
        </div>
        <div>
          <span className="lab">On-chain</span>
          <p className="font-data mt-2 text-[11.5px] leading-[20px] text-white/45">
            Uniswap v3 · v4 on chain {CHAIN.id}
            <br />api.dexscreener.com/latest/dex/tokens/&#123;address&#125;
            <br />{CHAIN.rpc.replace('https://', '')}
          </p>
        </div>
        <div>
          <span className="lab">Cadence</span>
          <p className="font-data mt-2 text-[11.5px] leading-[20px] text-white/45">
            Revalidated every 60 seconds
            <br />No history kept between requests
            <br />This render: {dateStampUtc(asOf)}
          </p>
        </div>
      </div>

      <div className="rule mt-8 flex flex-wrap gap-x-8 gap-y-2 pt-6">
        <Link className="font-manrope text-[12px] text-white/60 hover:text-[#AFDDFF]" href="/desk">Desk</Link>
        <Link className="font-manrope text-[12px] text-white/60 hover:text-[#AFDDFF]" href="/docs">Documentation</Link>
        <Link className="font-manrope text-[12px] text-white/60 hover:text-[#AFDDFF]" href="/system">Design system</Link>
        {/* Plain anchors: these are JSON endpoints, not pages. A client-side route
            transition would render nothing — the browser needs a real navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="font-manrope text-[12px] text-white/60 hover:text-[#AFDDFF]" href="/api/v1/basis">API</a>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="font-manrope text-[12px] text-white/60 hover:text-[#AFDDFF]" href="/api/v1/status">Status</a>
        <span className="font-manrope text-[12px] text-white/60">{CHAIN.name} · id {CHAIN.id}</span>
      </div>

      <p className="font-manrope mt-6 max-w-[84ch] text-[11.5px] leading-[19px] text-white/35">
        basis is an independent project. It is not affiliated with, endorsed by, or connected to Robinhood
        Markets, Inc., Robinhood Assets (Jersey) Limited, Uniswap Labs, Chainlink, or any launchpad
        referenced here. &ldquo;Robinhood Chain&rdquo; and &ldquo;Stock Tokens&rdquo; are used descriptively to identify the
        network and the assets measured. Stock Tokens are tokenised debt securities issued by Robinhood
        Assets (Jersey) Limited, giving economic exposure to an underlying security without legal or
        beneficial rights in it. Market data and commentary on market structure; not investment advice.
        Figures carry the timestamp at which they were read and are stale on arrival.
      </p>
    </footer>
  );
}
