import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: path.join(dir, '..', '..'),
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@tms/ui'],
  },
};

export default nextConfig;
