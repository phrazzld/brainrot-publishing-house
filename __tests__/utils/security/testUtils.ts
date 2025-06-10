/**
 * Security testing utilities
 * Provides helper functions for security-related tests
 */
import { createMockResponse } from '../../../__tests__/__testutils__/network/index.js';
import type { SecurityEvent, SecurityHeaders } from '../../../utils/security/types.js';

/**
 * Simulates a security attack for testing purposes
 */
export interface SecurityAttackSimulation {
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'command_injection' | 'rate_limit';
  payload: string | number;
  expectedBlocked: boolean;
  description: string;
}

/**
 * Common security attack simulations for testing
 */
export const securityAttackSimulations: SecurityAttackSimulation[] = [
  {
    type: 'sql_injection',
    payload: "'; DROP TABLE users; --",
    expectedBlocked: true,
    description: 'SQL injection attempt with table drop',
  },
  {
    type: 'xss',
    payload: '<script>alert("xss")</script>',
    expectedBlocked: true,
    description: 'XSS attempt with script tag',
  },
  {
    type: 'path_traversal',
    payload: '../../../etc/passwd',
    expectedBlocked: true,
    description: 'Path traversal attempt to access system files',
  },
  {
    type: 'command_injection',
    payload: '; rm -rf /',
    expectedBlocked: true,
    description: 'Command injection attempt with dangerous command',
  },
  {
    type: 'rate_limit',
    payload: 1000, // Number of requests
    expectedBlocked: true,
    description: 'Rate limiting test with excessive requests',
  },
];

/**
 * Creates a security event with correlation ID for testing
 */
export function createTestSecurityEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  const baseEvent: SecurityEvent = {
    correlationId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    type: 'validation_failure',
    severity: 'medium',
    source: 'test',
    details: {
      testCase: true,
      userAgent: 'test-runner',
      ip: '127.0.0.1',
    },
  };

  return { ...baseEvent, ...overrides };
}

/**
 * Validates security headers against expected configuration
 */
export function validateSecurityHeaders(
  actual: Record<string, string>,
  expected: Partial<SecurityHeaders>,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check CSP header
  if (expected.contentSecurityPolicy) {
    const actualCsp = actual['content-security-policy'] || actual['Content-Security-Policy'];
    if (!actualCsp) {
      issues.push('Missing Content-Security-Policy header');
    } else if (!actualCsp.includes("default-src 'self'")) {
      issues.push('CSP should include default-src self directive');
    }
  }

  // Check HSTS header
  if (expected.strictTransportSecurity) {
    const actualHsts = actual['strict-transport-security'] || actual['Strict-Transport-Security'];
    if (!actualHsts) {
      issues.push('Missing Strict-Transport-Security header');
    } else if (!actualHsts.includes('max-age=')) {
      issues.push('HSTS header should include max-age directive');
    }
  }

  // Check X-Frame-Options
  if (expected.xFrameOptions) {
    const actualXFrame = actual['x-frame-options'] || actual['X-Frame-Options'];
    if (!actualXFrame) {
      issues.push('Missing X-Frame-Options header');
    }
  }

  // Check X-Content-Type-Options
  if (expected.xContentTypeOptions) {
    const actualXContent = actual['x-content-type-options'] || actual['X-Content-Type-Options'];
    if (!actualXContent || actualXContent !== 'nosniff') {
      issues.push('Missing or incorrect X-Content-Type-Options header');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Creates a mock HTTP request for security testing
 */
export function createSecurityTestRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    query?: Record<string, string>;
  } = {},
): Request {
  const { method = 'GET', headers = {}, body, query = {} } = options;

  // Build URL with query parameters
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(query).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  // Create request
  const request = new Request(urlObj.toString(), {
    method,
    headers: new Headers(headers),
    body: body && method !== 'GET' ? body : undefined,
  });

  return request;
}

/**
 * Creates a mock HTTP response for security testing
 */
export function createSecurityTestResponse(
  body: string = '',
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const { status = 200, statusText, headers = {} } = options;

  return createMockResponse(body, {
    status,
    statusText,
    headers: new Headers(headers),
  });
}

/**
 * Measures the performance impact of security middleware
 */
export async function measureSecurityMiddlewarePerformance<T>(
  fn: () => Promise<T>,
  iterations = 100,
): Promise<{ averageMs: number; minMs: number; maxMs: number; totalMs: number }> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalMs = times.reduce((sum, time) => sum + time, 0);
  const averageMs = totalMs / iterations;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);

  return { averageMs, minMs, maxMs, totalMs };
}

/**
 * Generates a correlation ID for test security events
 */
export function generateTestCorrelationId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates that a string is safe from common security issues
 */
export function validateInputSafety(
  input: string,
  options: {
    allowHtml?: boolean;
    allowSql?: boolean;
    allowCommands?: boolean;
    allowPaths?: boolean;
  } = {},
): { safe: boolean; issues: string[] } {
  const issues: string[] = [];
  const {
    allowHtml = false,
    allowSql = false,
    allowCommands = false,
    allowPaths = false,
  } = options;

  // Check for HTML/XSS
  if (!allowHtml && /<[^>]*>/i.test(input)) {
    issues.push('Contains HTML tags');
  }

  // Check for SQL injection patterns
  if (
    !allowSql &&
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i.test(input)
  ) {
    issues.push('Contains SQL keywords');
  }

  // Check for command injection
  if (!allowCommands && /[;&|`$(){}]/i.test(input)) {
    issues.push('Contains command injection characters');
  }

  // Check for path traversal
  if (!allowPaths && /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)/i.test(input)) {
    issues.push('Contains path traversal patterns');
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}

/**
 * Creates test environment for security middleware
 */
export function createSecurityTestEnvironment() {
  // Store original environment variables
  const originalEnv = { ...process.env };

  // Set security test environment variables
  process.env.SECURITY_RATE_LIMIT_WINDOW_MS = '900000';
  process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.SECURITY_CSP_REPORT_URI = 'https://test.example.com/csp-report';
  process.env.SECURITY_AUDIT_SCHEDULE = '0 2 * * *';
  process.env.SECURITY_TEST_MODE = 'true';

  return {
    // Restore original environment
    cleanup: () => {
      process.env = originalEnv;
    },
  };
}
