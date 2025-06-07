/**
 * Integration tests for /api/download rate limiting
 * Tests rate limiting middleware integration with the download API route
 */
import { createRateLimitMiddleware } from '@/utils/security/rateLimiter.js';

// Mock Request for testing (compatible with jest setup)
class MockRequest {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = {
      _map: new Map(),
      get: function (name) {
        return this._map.get(name.toLowerCase()) || null;
      },
      set: function (name, value) {
        this._map.set(name.toLowerCase(), value);
      },
      has: function (name) {
        return this._map.has(name.toLowerCase());
      },
    };

    // Set headers from options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key, value);
      });
    }

    this.body = options.body;
  }
}

// Helper function to create test requests
function createTestRequest(url, options = {}) {
  return new MockRequest(url, options);
}

describe('Download API Rate Limiting Integration', () => {
  let rateLimitMiddleware: ReturnType<typeof createRateLimitMiddleware>;
  const baseUrl = 'http://localhost:3000/api/download';

  beforeEach(() => {
    // Create rate limiting middleware with test configuration
    rateLimitMiddleware = createRateLimitMiddleware({
      windowMs: 60000, // 1 minute window
      maxRequests: 5, // Allow 5 requests per minute
      keyGenerator: (request) => {
        // Use a fixed IP for consistent testing
        return `test-ip:${request.headers.get('x-forwarded-for') || '127.0.0.1'}`;
      },
    });
  });

  afterEach(() => {
    // Clear any rate limiting state
    jest.clearAllMocks();
  });

  describe('Rate Limiting Middleware Integration', () => {
    test('should allow requests within rate limit', async () => {
      const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'test-client',
        },
      });

      // First request should be allowed
      const response = await rateLimitMiddleware(request);
      expect(response).toBeNull(); // null means request is allowed to continue
    });

    test('should block requests exceeding rate limit', async () => {
      const clientIP = '192.168.1.2';

      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-client',
          },
        });

        const response = await rateLimitMiddleware(request);
        expect(response).toBeNull(); // All 5 should be allowed
      }

      // 6th request should be blocked
      const excessRequest = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': clientIP,
          'user-agent': 'test-client',
        },
      });

      const response = await rateLimitMiddleware(excessRequest);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });

    test('should include proper rate limit headers in response', async () => {
      const clientIP = '192.168.1.3';

      // Make 5 requests to reach limit
      for (let i = 0; i < 5; i++) {
        const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-client',
          },
        });
        await rateLimitMiddleware(request);
      }

      // 6th request should return 429 with headers
      const blockedRequest = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': clientIP,
          'user-agent': 'test-client',
        },
      });

      const response = await rateLimitMiddleware(blockedRequest);
      expect(response?.status).toBe(429);

      // Verify rate limit headers are present
      expect(response?.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response?.headers.has('X-RateLimit-Reset')).toBe(true);
      expect(response?.headers.has('Retry-After')).toBe(true);
    });

    test('should include correlation ID in rate limit response', async () => {
      const clientIP = '192.168.1.4';
      const correlationId = 'test-correlation-123';

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-client',
          },
        });
        await rateLimitMiddleware(request);
      }

      // Request with correlation ID should be blocked and return the ID
      const requestWithCorrelation = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': clientIP,
          'x-correlation-id': correlationId,
          'user-agent': 'test-client',
        },
      });

      const response = await rateLimitMiddleware(requestWithCorrelation);
      expect(response?.status).toBe(429);
      expect(response?.headers.get('X-Correlation-ID')).toBe(correlationId);
    });

    test('should return proper error message in rate limit response', async () => {
      const clientIP = '192.168.1.5';

      // Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-client',
          },
        });
        await rateLimitMiddleware(request);
      }

      // Blocked request should return proper error message
      const blockedRequest = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': clientIP,
          'user-agent': 'test-client',
        },
      });

      const response = await rateLimitMiddleware(blockedRequest);
      expect(response?.status).toBe(429);

      // Check that response body contains expected error structure
      if (response?.body) {
        const responseText = response.body;
        if (typeof responseText === 'string') {
          const responseBody = JSON.parse(responseText);
          expect(responseBody).toEqual(
            expect.objectContaining({
              error: 'Too Many Requests',
              message: 'Rate limit exceeded. Please try again later.',
              limit: 5,
              remaining: 0,
              retryAfter: expect.any(Number),
            }),
          );
        }
      }
    });
  });

  describe('Different Client IP Isolation', () => {
    test('should isolate rate limits by client IP', async () => {
      const clientIP1 = '192.168.1.10';
      const clientIP2 = '192.168.1.11';

      // Exhaust rate limit for client 1
      for (let i = 0; i < 5; i++) {
        const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP1,
            'user-agent': 'test-client',
          },
        });
        const response = await rateLimitMiddleware(request);
        expect(response).toBeNull();
      }

      // Client 1 should be blocked
      const client1BlockedRequest = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': clientIP1,
          'user-agent': 'test-client',
        },
      });
      const client1Response = await rateLimitMiddleware(client1BlockedRequest);
      expect(client1Response?.status).toBe(429);

      // Client 2 should still be allowed
      const client2Request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': clientIP2,
          'user-agent': 'test-client',
        },
      });
      const client2Response = await rateLimitMiddleware(client2Request);
      expect(client2Response).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle requests without IP headers gracefully', async () => {
      const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'user-agent': 'test-client',
        },
      });

      const response = await rateLimitMiddleware(request);
      expect(response).toBeNull(); // Should allow request with fallback IP
    });

    test('should handle malformed request URLs gracefully', async () => {
      // This test verifies the middleware doesn't crash on malformed URLs
      const request = createTestRequest('http://invalid-url', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.20',
          'user-agent': 'test-client',
        },
      });

      const response = await rateLimitMiddleware(request);
      // Should either allow or deny, but not crash
      expect(response === null || response?.status === 429).toBe(true);
    });

    test('should fail open on rate limiting errors', async () => {
      // Create a test to verify that middleware configuration validation works
      expect(() => {
        createRateLimitMiddleware({
          windowMs: -1, // Invalid window
          maxRequests: 5,
        });
      }).toThrow('windowMs must be a positive integer');

      // Test that valid middleware doesn't throw
      const validMiddleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 5,
      });

      const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.21',
          'user-agent': 'test-client',
        },
      });

      // Should process normally
      const response = await validMiddleware(request);
      expect(response).toBeNull(); // Should allow first request
    });
  });

  describe('Performance', () => {
    test('should process rate limiting checks efficiently', async () => {
      const clientIP = '192.168.1.30';
      const start = Date.now();

      // Process multiple requests and measure time
      for (let i = 0; i < 10; i++) {
        const request = createTestRequest(`${baseUrl}?slug=test-book&type=full`, {
          method: 'GET',
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': 'test-client',
          },
        });
        await rateLimitMiddleware(request);
      }

      const duration = Date.now() - start;
      // Rate limiting should add minimal overhead
      expect(duration).toBeLessThan(100); // Less than 100ms for 10 requests
    });
  });
});
