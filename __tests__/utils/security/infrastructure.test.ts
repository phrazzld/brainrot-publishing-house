/**
 * Security testing infrastructure verification
 * Tests that security testing utilities and mocks work correctly
 */
import {
  maliciousInputSamples,
  mockSecurityEvent,
  mockSecurityHeaders,
  validInputSamples,
} from './fixtures.js';
import {
  createMockClock,
  createMockCrypto,
  createMockRateLimitStore,
  createMockSecurityScanner,
} from './mocks.js';
import {
  createSecurityTestEnvironment,
  createTestSecurityEvent,
  generateTestCorrelationId,
  validateInputSafety,
  validateSecurityHeaders,
} from './testUtils.js';

describe('Security Testing Infrastructure', () => {
  describe('Mock Factories', () => {
    test('createMockRateLimitStore creates functional mock', async () => {
      const store = createMockRateLimitStore();

      // Test basic operations
      await store.set('test-key', 5, 1000);
      const value = await store.get('test-key');
      expect(value).toBe(5);

      await store.delete('test-key');
      const deletedValue = await store.get('test-key');
      expect(deletedValue).toBeNull();

      expect(store.get).toHaveBeenCalledWith('test-key');
      expect(store.set).toHaveBeenCalledWith('test-key', 5, 1000);
      expect(store.delete).toHaveBeenCalledWith('test-key');
    });

    test('createMockSecurityScanner provides expected API', async () => {
      const scanner = createMockSecurityScanner();

      const urlResult = await scanner.scanUrl('https://example.com');
      expect(urlResult).toEqual({ score: 85, issues: [] });

      const headersResult = await scanner.scanHeaders({
        'content-security-policy': "default-src 'self'",
      });
      expect(headersResult).toEqual({ passed: true, issues: [] });

      const cspResult = await scanner.validateCsp("default-src 'self'");
      expect(cspResult).toEqual({ valid: true, errors: [] });
    });

    test('createMockClock allows time manipulation', () => {
      const clock = createMockClock(1000);

      expect(clock.now()).toBe(1000);

      clock.advance(500);
      expect(clock.now()).toBe(1500);

      clock.reset();
      expect(clock.now()).toBe(1000);
    });

    test('createMockCrypto provides crypto operations', async () => {
      const crypto = createMockCrypto();

      expect(crypto.randomUUID()).toBe('mock-uuid-123');
      expect(crypto.randomBytes(16)).toEqual(Buffer.alloc(16, 'x'));

      const hash = await crypto.hash('test');
      expect(hash).toBe('mock-hash-abc123');

      const verified = await crypto.verify('test', 'signature');
      expect(verified).toBe(true);
    });
  });

  describe('Test Fixtures', () => {
    test('mockSecurityEvent has required properties', () => {
      expect(mockSecurityEvent).toMatchObject({
        correlationId: expect.any(String),
        timestamp: expect.any(String),
        type: expect.any(String),
        severity: expect.any(String),
        source: expect.any(String),
        details: expect.any(Object),
      });
    });

    test('mockSecurityHeaders contains all required headers', () => {
      expect(mockSecurityHeaders).toHaveProperty('contentSecurityPolicy');
      expect(mockSecurityHeaders).toHaveProperty('strictTransportSecurity');
      expect(mockSecurityHeaders).toHaveProperty('xFrameOptions');
      expect(mockSecurityHeaders).toHaveProperty('xContentTypeOptions');
      expect(mockSecurityHeaders).toHaveProperty('referrerPolicy');
    });

    test('maliciousInputSamples covers major attack vectors', () => {
      expect(maliciousInputSamples.pathTraversal).toContain('../../../etc/passwd');
      expect(maliciousInputSamples.sqlInjection).toContain("'; DROP TABLE users; --");
      expect(maliciousInputSamples.xssAttempts).toContain('<script>alert("xss")</script>');
      expect(maliciousInputSamples.commandInjection).toContain('; rm -rf /');
    });

    test('validInputSamples provides clean test data', () => {
      expect(validInputSamples.assetPaths).toContain('books/the-iliad/audio/chapter-01.mp3');
      expect(validInputSamples.bookSlugs).toContain('the-iliad');
      expect(validInputSamples.textContent).toContain('Chapter 1: The Beginning');
    });
  });

  describe('Test Utilities', () => {
    test('createTestSecurityEvent generates valid events', () => {
      const event = createTestSecurityEvent();

      expect(event.correlationId).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(new Date(event.timestamp)).toBeInstanceOf(Date);
      expect(event.type).toBe('validation_failure');
      expect(event.severity).toBe('medium');
      expect(event.source).toBe('test');
      expect(event.details).toMatchObject({
        testCase: true,
        userAgent: 'test-runner',
        ip: '127.0.0.1',
      });
    });

    test('validateSecurityHeaders identifies missing headers', () => {
      const headers = { 'x-frame-options': 'DENY' };
      const expected = {
        contentSecurityPolicy: "default-src 'self'",
        strictTransportSecurity: 'max-age=31536000',
      };

      const result = validateSecurityHeaders(headers, expected);

      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Missing Content-Security-Policy header');
      expect(result.issues).toContain('Missing Strict-Transport-Security header');
    });

    test('validateInputSafety detects malicious patterns', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const result = validateInputSafety(sqlInjection);

      expect(result.safe).toBe(false);
      expect(result.issues).toContain('Contains SQL keywords');
    });

    test('generateTestCorrelationId creates unique IDs', () => {
      const id1 = generateTestCorrelationId();
      const id2 = generateTestCorrelationId();

      expect(id1).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('createSecurityTestEnvironment sets up environment variables', () => {
      const env = createSecurityTestEnvironment();

      expect(process.env.SECURITY_RATE_LIMIT_WINDOW_MS).toBe('900000');
      expect(process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS).toBe('100');
      expect(process.env.SECURITY_TEST_MODE).toBe('true');

      env.cleanup();
    });
  });

  describe('Environment Configuration', () => {
    test('security environment variables are available', () => {
      expect(process.env.SECURITY_RATE_LIMIT_WINDOW_MS).toBeDefined();
      expect(process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS).toBeDefined();
      expect(process.env.SECURITY_CSP_REPORT_URI).toBeDefined();
      expect(process.env.SECURITY_AUDIT_SCHEDULE).toBeDefined();
      expect(process.env.SECURITY_TEST_MODE).toBe('true');
    });
  });
});
