/**
 * Security test fixtures
 * Provides sample security data for consistent testing
 */
import type {
  AuditResult,
  RateLimitConfig,
  SecurityCheck,
  SecurityEvent,
  SecurityHeaders,
  ValidationSchema,
} from '../../../utils/security/types.js';

/**
 * Sample security event for testing
 */
export const mockSecurityEvent: SecurityEvent = {
  correlationId: 'test-correlation-123',
  timestamp: '2024-01-01T00:00:00.000Z',
  type: 'rate_limit',
  severity: 'medium',
  source: 'api/download',
  details: {
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    path: '/api/download',
    requestsCount: 101,
    windowMs: 900000,
  },
};

/**
 * Sample security headers configuration for testing
 */
export const mockSecurityHeaders: SecurityHeaders = {
  contentSecurityPolicy:
    "default-src 'self'; img-src 'self' data: https://public.blob.vercel-storage.com; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://public.blob.vercel-storage.com",
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
};

/**
 * Sample rate limit configuration for testing
 */
export const mockRateLimitConfig: RateLimitConfig = {
  windowMs: 900000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: false,
};

/**
 * Sample validation schema for testing
 */
export const mockValidationSchema: ValidationSchema = {
  assetPath: [
    { type: 'required', message: 'Asset path is required' },
    { type: 'string', min: 1, max: 255, message: 'Asset path must be 1-255 characters' },
    {
      type: 'custom',
      validator: (value: unknown) =>
        typeof value === 'string' && !value.includes('..') && !value.includes('//'),
      message: 'Asset path contains invalid characters',
    },
  ],
  bookSlug: [
    { type: 'required', message: 'Book slug is required' },
    { type: 'string', min: 1, max: 50, message: 'Book slug must be 1-50 characters' },
    {
      type: 'custom',
      validator: (value: unknown) => typeof value === 'string' && /^[a-z0-9-]+$/.test(value),
      message: 'Book slug must contain only lowercase letters, numbers, and hyphens',
    },
  ],
};

/**
 * Sample security check results for testing
 */
export const mockSecurityChecks: SecurityCheck[] = [
  {
    id: 'headers-csp',
    name: 'Content Security Policy',
    passed: true,
    severity: 'high',
    description: 'CSP header is properly configured',
  },
  {
    id: 'headers-hsts',
    name: 'HTTP Strict Transport Security',
    passed: true,
    severity: 'high',
    description: 'HSTS header is properly configured',
  },
  {
    id: 'rate-limiting',
    name: 'API Rate Limiting',
    passed: false,
    severity: 'medium',
    description: 'Rate limiting is not configured on all endpoints',
    recommendation: 'Apply rate limiting to all public API endpoints',
  },
];

/**
 * Sample audit result for testing
 */
export const mockAuditResult: AuditResult = {
  timestamp: '2024-01-01T00:00:00.000Z',
  checks: mockSecurityChecks,
  score: 75,
  recommendations: [
    'Apply rate limiting to all public API endpoints',
    'Review and update CSP directives for new domains',
    'Implement security event monitoring dashboard',
  ],
};

/**
 * Malicious input samples for testing validation
 */
export const maliciousInputSamples = {
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '....//....//....//etc//passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  ],
  sqlInjection: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'/*",
    "' UNION SELECT null, username, password FROM users --",
  ],
  xssAttempts: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src="x" onerror="alert(1)">',
    '"><script>alert(document.cookie)</script>',
  ],
  commandInjection: ['; rm -rf /', '| cat /etc/passwd', '&& echo "hacked"', '`whoami`'],
  ldapInjection: ['*)(uid=*', '*)(|(uid=*))', '*)((uid=*)'],
};

/**
 * Valid input samples for testing positive cases
 */
export const validInputSamples = {
  assetPaths: [
    'books/the-iliad/audio/chapter-01.mp3',
    'books/hamlet/text/source/act1-scene1.txt',
    'books/the-republic/images/cover.jpg',
    'images/site-logo.png',
    'site-assets/favicon.ico',
  ],
  bookSlugs: ['the-iliad', 'hamlet', 'the-republic', 'divine-comedy-inferno', 'bhagavad-gita'],
  textContent: [
    'Chapter 1: The Beginning',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'This is a normal text content for testing.',
  ],
};
