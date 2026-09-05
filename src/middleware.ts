import { NextResponse, type NextRequest } from 'next/server';

/**
 * Response headers, set at the edge on every request.
 *
 * next.config.mjs declares the same set and Next emits them correctly — verified
 * locally on pages and API routes. On the Netlify runtime the function-served
 * responses did not carry them, and netlify.toml's [[headers]] only reach static
 * files. Middleware runs as an edge function in front of everything, so this is
 * the copy that arrives regardless of which layer answered.
 *
 * The API is meant to be called by anyone — that is the point of publishing it —
 * so /api/* also answers CORS, including the OPTIONS preflight a browser sends
 * before a cross-origin POST to the interpreter.
 */

const SECURITY: ReadonlyArray<readonly [string, string]> = [
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=()'],
];

const CORS: ReadonlyArray<readonly [string, string]> = [
  ['Access-Control-Allow-Origin', '*'],
  ['Access-Control-Allow-Methods', 'GET, POST, OPTIONS'],
  ['Access-Control-Allow-Headers', 'Content-Type'],
  ['Access-Control-Max-Age', '86400'],
];

export function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith('/api/');

  if (isApi && req.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    for (const [k, v] of CORS) preflight.headers.set(k, v);
    return preflight;
  }

  const res = NextResponse.next();
  for (const [k, v] of SECURITY) res.headers.set(k, v);
  if (isApi) for (const [k, v] of CORS) res.headers.set(k, v);
  return res;
}

export const config = {
  // Everything except Next's hashed static assets, which need none of this and
  // are served straight from the CDN.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
