/**
 * Security-related mock factories
 * Creates type-safe mocks for external security dependencies
 */
import { jest } from '@jest/globals';

/**
 * Mock for external rate limiting store (Redis, Database, etc.)
 */
export interface MockRateLimitStore {
  get: jest.MockedFunction<(key: string) => Promise<number | null>>;
  set: jest.MockedFunction<(key: string, value: number, ttl: number) => Promise<void>>;
  increment: jest.MockedFunction<(key: string, ttl: number) => Promise<number>>;
  delete: jest.MockedFunction<(key: string) => Promise<boolean>>;
  clear: jest.MockedFunction<() => Promise<void>>;
}

/**
 * Mock for external security scanner service
 */
export interface MockSecurityScanner {
  scanUrl: jest.MockedFunction<(url: string) => Promise<{ score: number; issues: string[] }>>;
  scanHeaders: jest.MockedFunction<
    (headers: Record<string, string>) => Promise<{ passed: boolean; issues: string[] }>
  >;
  validateCsp: jest.MockedFunction<(csp: string) => Promise<{ valid: boolean; errors: string[] }>>;
}

/**
 * Mock for external vulnerability database
 */
export interface MockVulnerabilityDatabase {
  checkDependency: jest.MockedFunction<
    (name: string, version: string) => Promise<{ vulnerable: boolean; cves: string[] }>
  >;
  getLatestVersion: jest.MockedFunction<(name: string) => Promise<string>>;
  getSeverityScore: jest.MockedFunction<(cve: string) => Promise<number>>;
}

/**
 * Mock for security event reporter (external logging service)
 */
export interface MockSecurityReporter {
  reportEvent: jest.MockedFunction<(event: Record<string, unknown>) => Promise<void>>;
  reportIncident: jest.MockedFunction<
    (incident: { severity: string; description: string }) => Promise<string>
  >;
  createAlert: jest.MockedFunction<
    (alert: { threshold: number; message: string }) => Promise<void>
  >;
}

/**
 * Mock for external penetration testing service
 */
export interface MockPenetrationTester {
  runBasicTests: jest.MockedFunction<
    (target: string) => Promise<{ passed: number; failed: number }>
  >;
  testSqlInjection: jest.MockedFunction<(endpoint: string) => Promise<boolean>>;
  testXss: jest.MockedFunction<(endpoint: string) => Promise<boolean>>;
  testRateLimiting: jest.MockedFunction<(endpoint: string) => Promise<boolean>>;
}

/**
 * Creates a mock rate limiting store
 */
export function createMockRateLimitStore(
  customImplementations: Partial<MockRateLimitStore> = {},
): MockRateLimitStore {
  const store = new Map<string, { value: number; expires: number }>();

  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      const entry = store.get(key);
      if (!entry || entry.expires < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    }),
    set: jest.fn().mockImplementation(async (key: string, value: number, ttl: number) => {
      store.set(key, { value, expires: Date.now() + ttl });
    }),
    increment: jest.fn().mockImplementation(async (key: string, ttl: number) => {
      const current = (await customImplementations.get?.(key)) ?? 0;
      const newValue = current + 1;
      await customImplementations.set?.(key, newValue, ttl);
      return newValue;
    }),
    delete: jest.fn().mockImplementation(async (key: string) => {
      return store.delete(key);
    }),
    clear: jest.fn().mockImplementation(async () => {
      store.clear();
    }),
    ...customImplementations,
  };
}

/**
 * Creates a mock security scanner
 */
export function createMockSecurityScanner(
  customImplementations: Partial<MockSecurityScanner> = {},
): MockSecurityScanner {
  return {
    scanUrl: jest.fn().mockResolvedValue({ score: 85, issues: [] }),
    scanHeaders: jest.fn().mockResolvedValue({ passed: true, issues: [] }),
    validateCsp: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
    ...customImplementations,
  };
}

/**
 * Creates a mock vulnerability database
 */
export function createMockVulnerabilityDatabase(
  customImplementations: Partial<MockVulnerabilityDatabase> = {},
): MockVulnerabilityDatabase {
  return {
    checkDependency: jest.fn().mockResolvedValue({ vulnerable: false, cves: [] }),
    getLatestVersion: jest.fn().mockResolvedValue('1.0.0'),
    getSeverityScore: jest.fn().mockResolvedValue(0),
    ...customImplementations,
  };
}

/**
 * Creates a mock security reporter
 */
export function createMockSecurityReporter(
  customImplementations: Partial<MockSecurityReporter> = {},
): MockSecurityReporter {
  return {
    reportEvent: jest.fn().mockResolvedValue(undefined),
    reportIncident: jest.fn().mockResolvedValue('incident-123'),
    createAlert: jest.fn().mockResolvedValue(undefined),
    ...customImplementations,
  };
}

/**
 * Creates a mock penetration tester
 */
export function createMockPenetrationTester(
  customImplementations: Partial<MockPenetrationTester> = {},
): MockPenetrationTester {
  return {
    runBasicTests: jest.fn().mockResolvedValue({ passed: 8, failed: 2 }),
    testSqlInjection: jest.fn().mockResolvedValue(true),
    testXss: jest.fn().mockResolvedValue(true),
    testRateLimiting: jest.fn().mockResolvedValue(true),
    ...customImplementations,
  };
}

/**
 * Creates a mock for the system clock (for time-based security features)
 */
export function createMockClock(baseTime = Date.now()) {
  let currentTime = baseTime;

  return {
    now: jest.fn().mockImplementation(() => currentTime),
    advance: (ms: number) => {
      currentTime += ms;
    },
    reset: () => {
      currentTime = baseTime;
    },
  };
}

/**
 * Creates a mock for crypto operations (for testing security algorithms)
 */
export function createMockCrypto() {
  return {
    randomUUID: jest.fn().mockReturnValue('mock-uuid-123'),
    randomBytes: jest.fn().mockImplementation((size: number) => Buffer.alloc(size, 'x')),
    hash: jest.fn().mockResolvedValue('mock-hash-abc123'),
    verify: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Mock implementation for browser security APIs (for CSP testing)
 */
export function createMockSecurityAPI() {
  return {
    reportViolation: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
}
