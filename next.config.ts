import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
      "frame-ancestors 'none'",
      "form-action 'self' https://accounts.google.com",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
