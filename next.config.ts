import type { NextConfig } from 'next';

// Get existing image domains for CSP compatibility
const imageDomains = [
  'public.blob.vercel-storage.com',
  '82qos1wlxbd4iq1g.public.blob.vercel-storage.com',
];

// Simplified security headers
function createSecurityHeadersInline() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://public.blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
      "font-src 'self'",
      "connect-src 'self' https://public.blob.vercel-storage.com",
      "media-src 'self' blob: https://public.blob.vercel-storage.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: imageDomains,
  },
  transpilePackages: [],
  typescript: {
    // Enable strict type checking during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during build
    ignoreDuringBuilds: false,
  },
  // Add security headers to all responses
  async headers() {
    const securityHeaders = createSecurityHeadersInline();

    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: Object.entries(securityHeaders).map(([key, value]) => ({
          key,
          value,
        })),
      },
    ];
  },
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
