import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      // Allow Vercel Blob Storage domain and its tenant-specific subdomains
      'public.blob.vercel-storage.com',
      '82qos1wlxbd4iq1g.public.blob.vercel-storage.com',
    ],
  },
  transpilePackages: [],
  webpack: (config) => {
    // Handle ESM packages that need transpilation
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    return config;
  },
};

export default nextConfig;
