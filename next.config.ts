import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'export' removed — API routes require server runtime.
  // Deploy to Vercel, Railway, or any Node.js host instead of static GitHub Pages.
  images: { unoptimized: true },
};

export default nextConfig;
