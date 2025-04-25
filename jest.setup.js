// Import jest-dom for DOM testing utilities
require('@testing-library/jest-dom');

// Mock the window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
}

// Mock the process.env variables used in tests
process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://public.blob.vercel-storage.com';
process.env.NEXT_PUBLIC_BLOB_DEV_URL = 'https://dev.blob.vercel-storage.com';
process.env.NODE_ENV = 'test';