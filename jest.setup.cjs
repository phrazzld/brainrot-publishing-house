// Import jest-dom for DOM testing utilities
require('@testing-library/jest-dom');

// Polyfill TextDecoder and TextEncoder for Node.js environment
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// Polyfill fetch APIs for Node.js environment
if (typeof global.fetch === 'undefined') {
  // Node.js 18+ has built-in fetch, but we may need to polyfill for testing
  // Use a basic polyfill for Request and Response
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url;
      this.method = options.method || 'GET';
      this.headers = new global.Headers(options.headers || {});
      this.body = options.body;
    }
  };

  global.Response = class Response {
    constructor(body, options = {}) {
      this.body = body;
      this.status = options.status || 200;
      this.statusText = options.statusText || 'OK';
      this.headers = new global.Headers(options.headers || {});
    }
  };

  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = new Map();
      if (init) {
        if (init instanceof Headers) {
          init._headers.forEach((value, key) => this._headers.set(key, value));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) =>
            this._headers.set(key.toLowerCase(), String(value)),
          );
        }
      }
    }

    get(name) {
      return this._headers.get(name.toLowerCase()) || null;
    }

    set(name, value) {
      this._headers.set(name.toLowerCase(), String(value));
    }

    has(name) {
      return this._headers.has(name.toLowerCase());
    }

    delete(name) {
      this._headers.delete(name.toLowerCase());
    }

    forEach(callback) {
      this._headers.forEach(callback);
    }

    entries() {
      return this._headers.entries();
    }

    keys() {
      return this._headers.keys();
    }

    values() {
      return this._headers.values();
    }
  };
}

// Mock import.meta for ESM compatibility
if (typeof global.import === 'undefined') {
  global.import = {};
  global.import.meta = {
    url: 'file:///mock-url.js',
    // Add resolver for relative paths
    resolve: (specifier) => {
      return new URL(specifier, 'file:///mock-url.js').href;
    },
  };
}

// Provide import.meta directly on global
if (typeof global.import?.meta === 'undefined') {
  global.import = { meta: { url: 'file:///mock-url.js' } };
}

// Set up a proper DOM environment for React 19
const { JSDOM } = require('jsdom');
const jsdom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});
global.window = jsdom.window;
global.document = jsdom.window.document;
global.navigator = {
  userAgent: 'node.js',
};

// Mock the window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
}

// Mock environment variables used in tests
process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://public.blob.vercel-storage.com';
process.env.NEXT_PUBLIC_BLOB_DEV_URL = 'https://dev.blob.vercel-storage.com';
process.env.NODE_ENV = 'test';

// Security testing environment variables
process.env.SECURITY_RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
process.env.SECURITY_RATE_LIMIT_MAX_REQUESTS = '100';
process.env.SECURITY_CSP_REPORT_URI = 'https://test.example.com/csp-report';
process.env.SECURITY_AUDIT_SCHEDULE = '0 2 * * *'; // Daily at 2 AM
process.env.SECURITY_TEST_MODE = 'true';

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver (not available in jsdom)
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Set up proper error handling for unhandled promises
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED PROMISE REJECTION:', reason);
});
