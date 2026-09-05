import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // There is an unrelated package-lock.json higher up the user's home directory,
  // which makes Next infer the wrong workspace root. Pin it to this project.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),

  // Emitted by Next on every response, so they hold on any host. netlify.toml
  // declares the same set, but Netlify applies [[headers]] to static files and
  // these pages are served by functions — verified live: only nosniff arrived.
  async headers() {
    const security = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
      },
    ];
    // The API is meant to be called by anyone — that is the point of publishing it.
    const cors = [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
    ];
    return [
      { source: '/:path*', headers: security },
      { source: '/api/:path*', headers: cors },
    ];
  },
};

export default nextConfig;
