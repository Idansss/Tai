import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 90 backs the crisper hero slideshow (next/image only allows configured qualities).
  images: {
    qualities: [75, 90],
  },
  turbopack: {
    root: path.join(dir, '..', '..'),
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@tms/ui'],
  },
};

export default nextConfig;
