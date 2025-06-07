/**
 * Integration tests for cross-route rate limiting behavior
 * Tests how rate limiting works across multiple API routes and different middleware configurations
 */
import { NextRequest } from 'next/server';

import {
  createRateLimitMiddleware,
  defaultKeyGenerator,
  pathBasedKeyGenerator,
} from '@/utils/security/rateLimiter.js';

describe('Cross-Route Rate Limiting Integration', () => {
  let globalRateLimitMiddleware: ReturnType<typeof createRateLimitMiddleware>;
  let downloadRateLimitMiddleware: ReturnType<typeof createRateLimitMiddleware>;
  let translateRateLimitMiddleware: ReturnType<typeof createRateLimitMiddleware>;

  beforeEach(() => {
    // Global rate limiting (shared across all routes)
    globalRateLimitMiddleware = createRateLimitMiddleware({
      windowMs: 60000, // 1 minute
      maxRequests: 20, // Global limit of 20 requests per minute
      keyGenerator: defaultKeyGenerator, // IP-based only
    });

    // Download-specific rate limiting
    downloadRateLimitMiddleware = createRateLimitMiddleware({
      windowMs: 60000, // 1 minute
      maxRequests: 5, // Download-specific limit
      keyGenerator: pathBasedKeyGenerator, // IP + path based
    });

    // Translate-specific rate limiting
    translateRateLimitMiddleware = createRateLimitMiddleware({
      windowMs: 60000, // 1 minute
      maxRequests: 10, // Translate-specific limit
      keyGenerator: pathBasedKeyGenerator, // IP + path based
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Global vs Route-Specific Rate Limiting', () => {
    test('should enforce global rate limits across all routes', async () => {
      const clientIP = '192.168.3.1';
      const routes = [
        'http://localhost:3000/api/download?slug=test&type=full',
        'http://localhost:3000/api/translate',
        'http://localhost:3000/api/download?slug=other&type=chapter&chapter=1',
      ];

      // Make 20 requests across different routes (reaching global limit)
      for (let i = 0; i < 20; i++) {
        const routeUrl = routes[i % routes.length];
        const request = new NextRequest(routeUrl, {
          method: routeUrl.includes('translate') ? 'POST' : 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-global-client',
            'content-type': 'application/json',
          },
          body: routeUrl.includes('translate')
            ? JSON.stringify({ text: `Test ${i}`, sourceLanguage: 'en', targetLanguage: 'es' })
            : undefined,
        });

        const response = await globalRateLimitMiddleware(request);
        expect(response).toBeNull(); // All should be allowed under global limit
      }

      // 21st request should be blocked by global rate limit
      const excessRequest = new NextRequest(
        'http://localhost:3000/api/download?slug=test&type=full',
        {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-global-client',
          },
        },
      );

      const response = await globalRateLimitMiddleware(excessRequest);
      expect(response?.status).toBe(429);
    });

    test('should isolate route-specific rate limits by path', async () => {
      const clientIP = '192.168.3.2';

      // Exhaust download rate limit (5 requests)
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('http://localhost:3000/api/download?slug=test&type=full', {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-path-client',
          },
        });

        const response = await downloadRateLimitMiddleware(request);
        expect(response).toBeNull();
      }

      // 6th download request should be blocked
      const downloadRequest = new NextRequest(
        'http://localhost:3000/api/download?slug=test&type=full',
        {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-path-client',
          },
        },
      );

      const downloadResponse = await downloadRateLimitMiddleware(downloadRequest);
      expect(downloadResponse?.status).toBe(429);

      // Translate requests should still be allowed (different path-based key)
      const translateRequest = new NextRequest('http://localhost:3000/api/translate', {
        method: 'POST',
        headers: {
          'x-forwarded-for': clientIP,
          'user-agent': 'test-path-client',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text: 'Test', sourceLanguage: 'en', targetLanguage: 'es' }),
      });

      const translateResponse = await translateRateLimitMiddleware(translateRequest);
      expect(translateResponse).toBeNull();
    });
  });

  describe('Multiple Middleware Stacking', () => {
    test('should respect the most restrictive rate limit when middlewares are stacked', async () => {
      const clientIP = '192.168.3.3';

      // Create a request that would hit both global and route-specific limits
      const makeDownloadRequest = () =>
        new NextRequest('http://localhost:3000/api/download?slug=test&type=full', {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-stack-client',
          },
        });

      // Make 5 requests (hitting download-specific limit first)
      for (let i = 0; i < 5; i++) {
        const request = makeDownloadRequest();

        // Apply both middlewares
        const globalResponse = await globalRateLimitMiddleware(request);
        expect(globalResponse).toBeNull(); // Global should allow

        const downloadResponse = await downloadRateLimitMiddleware(request);
        expect(downloadResponse).toBeNull(); // Download should allow
      }

      // 6th request should be blocked by download middleware even though global allows it
      const excessRequest = makeDownloadRequest();

      const globalResponse = await globalRateLimitMiddleware(excessRequest);
      expect(globalResponse).toBeNull(); // Global still allows (only 5 requests so far)

      const downloadResponse = await downloadRateLimitMiddleware(excessRequest);
      expect(downloadResponse?.status).toBe(429); // Download blocks it
    });

    test('should handle middleware execution order correctly', async () => {
      const clientIP = '192.168.3.4';

      // Create a more restrictive global limit for this test
      const restrictiveGlobalMiddleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 3, // Very restrictive global limit
        keyGenerator: defaultKeyGenerator,
      });

      const makeRequest = () =>
        new NextRequest('http://localhost:3000/api/download?slug=test&type=full', {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-order-client',
          },
        });

      // Make 3 requests (hitting restrictive global limit)
      for (let i = 0; i < 3; i++) {
        const request = makeRequest();

        // Check global first (as it would be in real middleware stack)
        const globalResponse = await restrictiveGlobalMiddleware(request);
        expect(globalResponse).toBeNull();

        // Then route-specific
        const downloadResponse = await downloadRateLimitMiddleware(request);
        expect(downloadResponse).toBeNull();
      }

      // 4th request should be blocked by global middleware before reaching download middleware
      const excessRequest = makeRequest();
      const globalResponse = await restrictiveGlobalMiddleware(excessRequest);
      expect(globalResponse?.status).toBe(429);

      // Download middleware would still allow it, but global blocks first
      const downloadResponse = await downloadRateLimitMiddleware(excessRequest);
      expect(downloadResponse).toBeNull(); // Would allow, but shouldn't be reached
    });
  });

  describe('Different Key Generation Strategies', () => {
    test('should handle IP-based vs path-based key generation differently', async () => {
      const clientIP = '192.168.3.5';

      const ipBasedMiddleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: defaultKeyGenerator, // IP only
      });

      const pathBasedMiddleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 5,
        keyGenerator: pathBasedKeyGenerator, // IP + path
      });

      // Make requests to different paths
      const downloadUrl = 'http://localhost:3000/api/download?slug=test&type=full';
      const translateUrl = 'http://localhost:3000/api/translate';

      // IP-based middleware should share limits across paths
      for (let i = 0; i < 3; i++) {
        const downloadRequest = new NextRequest(downloadUrl, {
          method: 'GET',
          headers: { 'x-forwarded-for': clientIP, 'user-agent': 'test-key-client' },
        });

        const translateRequest = new NextRequest(translateUrl, {
          method: 'POST',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-key-client',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ text: 'Test', sourceLanguage: 'en', targetLanguage: 'es' }),
        });

        // IP-based should count both requests towards same limit
        const ipDownloadResponse = await ipBasedMiddleware(downloadRequest);
        expect(ipDownloadResponse).toBeNull();

        const ipTranslateResponse = await ipBasedMiddleware(translateRequest);
        if (i < 2) {
          expect(ipTranslateResponse).toBeNull();
        } else {
          // Should be blocked on 6th request (i=2 means this is the 6th total request)
          expect(ipTranslateResponse?.status).toBe(429);
        }

        // Path-based should treat them separately
        const pathDownloadResponse = await pathBasedMiddleware(downloadRequest);
        expect(pathDownloadResponse).toBeNull();

        const pathTranslateResponse = await pathBasedMiddleware(translateRequest);
        expect(pathTranslateResponse).toBeNull();
      }
    });
  });

  describe('Cross-Route Error Consistency', () => {
    test('should return consistent error format across different routes', async () => {
      const clientIP = '192.168.3.6';
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 1, // Very restrictive for testing
        keyGenerator: defaultKeyGenerator,
      });

      // Exhaust limit with first request
      const firstRequest = new NextRequest(
        'http://localhost:3000/api/download?slug=test&type=full',
        {
          method: 'GET',
          headers: { 'x-forwarded-for': clientIP, 'user-agent': 'test-error-client' },
        },
      );

      const firstResponse = await middleware(firstRequest);
      expect(firstResponse).toBeNull();

      // Test error format consistency across different routes
      const routes = [
        { url: 'http://localhost:3000/api/download?slug=test&type=full', method: 'GET' },
        { url: 'http://localhost:3000/api/translate', method: 'POST' },
        {
          url: 'http://localhost:3000/api/download?slug=other&type=chapter&chapter=1',
          method: 'GET',
        },
      ];

      for (const route of routes) {
        const request = new NextRequest(route.url, {
          method: route.method,
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-error-client',
            'content-type': 'application/json',
          },
          body:
            route.method === 'POST'
              ? JSON.stringify({ text: 'Test', sourceLanguage: 'en', targetLanguage: 'es' })
              : undefined,
        });

        const response = await middleware(request);
        expect(response?.status).toBe(429);

        const responseBody = await response?.json();
        expect(responseBody).toEqual(
          expect.objectContaining({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            limit: 1,
            remaining: 0,
            retryAfter: expect.any(Number),
          }),
        );

        // Verify consistent headers
        expect(response?.headers.get('X-RateLimit-Limit')).toBe('1');
        expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
        expect(response?.headers.has('X-RateLimit-Reset')).toBe(true);
        expect(response?.headers.has('Retry-After')).toBe(true);
      }
    });
  });

  describe('Performance with Multiple Routes', () => {
    test('should maintain performance across multiple route checks', async () => {
      const clientIPs = ['192.168.3.10', '192.168.3.11', '192.168.3.12'];
      const routes = [
        'http://localhost:3000/api/download?slug=test&type=full',
        'http://localhost:3000/api/translate',
        'http://localhost:3000/api/download?slug=other&type=chapter&chapter=1',
      ];

      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 100, // High limit to avoid blocking
        keyGenerator: pathBasedKeyGenerator,
      });

      const start = Date.now();

      // Process many requests across different IPs and routes
      for (let i = 0; i < 30; i++) {
        const clientIP = clientIPs[i % clientIPs.length];
        const routeUrl = routes[i % routes.length];

        const request = new NextRequest(routeUrl, {
          method: routeUrl.includes('translate') ? 'POST' : 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-perf-client',
            'content-type': 'application/json',
          },
          body: routeUrl.includes('translate')
            ? JSON.stringify({ text: `Test ${i}`, sourceLanguage: 'en', targetLanguage: 'es' })
            : undefined,
        });

        const response = await middleware(request);
        expect(response).toBeNull(); // All should be allowed
      }

      const duration = Date.now() - start;
      // Cross-route rate limiting should be efficient
      expect(duration).toBeLessThan(300); // Less than 300ms for 30 requests across multiple routes
    });
  });
});
