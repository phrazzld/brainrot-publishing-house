// Import jest-dom for DOM testing utilities
require('@testing-library/jest-dom');

// Polyfill TextDecoder and TextEncoder for Node.js environment
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}

// Mock import.meta for ESM compatibility
if (typeof global.import === 'undefined') {
  global.import = {};
  global.import.meta = { 
    url: 'file:///mock-url.js',
    // Add resolver for relative paths
    resolve: (specifier) => {
      return new URL(specifier, 'file:///mock-url.js').href;
    }
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