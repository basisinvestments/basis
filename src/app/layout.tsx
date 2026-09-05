import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, Manrope } from 'next/font/google';
import { RouteFade } from '@/components/site/RouteFade';
import { SourceHighlight } from '@/components/site/SourceHighlight';
import './globals.css';

/**
 * Three families, strictly separated jobs. If you are unsure which to use, ask what
 * the text *is*: a name, a sentence, or a number.
 *
 * Graphik LCG is the intended display face; Archivo stands in until the licence is
 * sorted — see docs/design-system.md §2 and LICENSING.md.
 */
const display = Archivo({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-display',
  display: 'swap',
});

const ui = Manrope({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ui',
  display: 'swap',
});

const data = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-data',
  display: 'swap',
});

export const metadata: Metadata = {
  // Absolute URLs for the OG image. Netlify sets URL at build; locally it is localhost.
  metadataBase: new URL(process.env.URL ?? process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'BASIS // SPREAD',
  description:
    'The distance between what a share is worth and what its token just traded for — measured across every pool on Robinhood Chain, with the session state attached.',
  applicationName: 'basis',
  openGraph: {
    title: 'BASIS // SPREAD',
    description: 'One share. Two prices. Mind the gap.',
    siteName: 'basis',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * data-session is written here as a server-rendered default and then kept
     * current by SessionClock. Rendering it on the server means the first paint
     * already has the right reference colour — no flash of the wrong state.
     */
    <html lang="en" className={`${display.variable} ${ui.variable} ${data.variable}`}>
      <body>
        {/* The four verticals persist behind every section. The horizontals
            belong to the hero — below the fold they would fight the section rules. */}
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute top-0 h-full w-px bg-white/[0.03]" style={{ left: '12.6%' }} />
          <div className="absolute top-0 h-full w-px bg-white/[0.03]" style={{ left: '37.5%' }} />
          <div className="absolute top-0 h-full w-px bg-white/[0.03]" style={{ left: '61.9%' }} />
          <div className="absolute top-0 h-full w-px bg-white/[0.03]" style={{ left: '86.2%' }} />
        </div>
        <SourceHighlight />
        <RouteFade>{children}</RouteFade>
      </body>
    </html>
  );
}
