import { NextRequest } from 'next/server';

import { GET } from '@/app/api/download/route';
import { AssetNotFoundError } from '@/types/dependencies';
import { getAssetUrlWithFallback } from '@/utils';

// Mock crypto for reliable UUID generation in tests
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-correlation-id'),
}));

// Mock environment variables
const mockEnv = {
  DO_SPACES_BUCKET: 'test-bucket',
  SPACES_BUCKET_NAME: 'test-bucket',
};

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url,
    method: 'GET',
    headers: {
      get: jest.fn().mockImplementation((key) => (key === 'user-agent' ? 'test-user-agent' : null)),
    },
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock getAssetUrlWithFallback
jest.mock('@/utils', () => ({
  getAssetUrlWithFallback: jest.fn(),
}));

// Mock the logger
jest.mock('@/utils/logger', () => ({
  createRequestLogger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Use a partial interface for test requests
interface MockNextRequest {
  url: string;
  method: string;
  headers: {
    get: (key: string) => string | null;
  };
}

describe('Download API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment variables for each test
    Object.keys(mockEnv).forEach((key) => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

  afterEach(() => {
    // Clean up environment variables after each test
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
  });

  // Helper function to create a test request with query parameters
  const createRequest = (params: Record<string, string> = {}): MockNextRequest => {
    const query = new URLSearchParams(params).toString();
    return {
      url: `https://example.com/api/download${query ? `?${query}` : ''}`,
      method: 'GET',
      headers: {
        get: jest
          .fn()
          .mockImplementation((key) => (key === 'user-agent' ? 'test-user-agent' : null)),
      },
    };
  };

  describe('Input Validation', () => {
    it('should return 400 for missing slug parameter', async () => {
      const mockReq = createRequest({ type: 'full' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Missing required parameter: slug');
      // Current implementation doesn't include correlationId in 400 responses
    });

    it('should return 400 for invalid slug format', async () => {
      const mockReq = createRequest({ slug: 'invalid/slug', type: 'full' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe(
        'Invalid slug format. Must contain only letters, numbers, hyphens, or underscores.'
      );
    });

    it('should return 400 for missing type parameter', async () => {
      const mockReq = createRequest({ slug: 'hamlet' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Missing required parameter: type');
    });

    it('should return 400 for invalid type parameter', async () => {
      const mockReq = createRequest({ slug: 'hamlet', type: 'invalid' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid value for type parameter. Must be "full" or "chapter"');
    });

    it('should return 400 for missing chapter when type is chapter', async () => {
      const mockReq = createRequest({ slug: 'hamlet', type: 'chapter' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe(
        'Missing required parameter: chapter (required when type is "chapter")'
      );
    });

    it('should return 400 for non-numeric chapter', async () => {
      const mockReq = createRequest({ slug: 'hamlet', type: 'chapter', chapter: 'abc' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid chapter parameter: must be a number');
    });

    it('should return 400 for non-positive chapter', async () => {
      const mockReq = createRequest({ slug: 'hamlet', type: 'chapter', chapter: '0' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid chapter parameter: must be a positive number');
    });

    it('should return 400 for non-integer chapter', async () => {
      const mockReq = createRequest({ slug: 'hamlet', type: 'chapter', chapter: '1.5' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid chapter parameter: must be an integer');
    });
  });

  describe('URL Resolution', () => {
    it('should return a Blob URL for a file that exists in Blob storage', async () => {
      // Setup mock to return a Blob URL
      const blobUrl =
        'https://public.blob.vercel-storage.com/books/hamlet/audio/full-audiobook.mp3';
      (getAssetUrlWithFallback as jest.Mock).mockResolvedValue(blobUrl);

      const mockReq = createRequest({ slug: 'hamlet', type: 'full' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      // Verify results
      expect(res.status).toBe(200);
      expect(data.url).toBe(blobUrl);
      expect(data.isCdnUrl).toBe(false);
      expect(data.shouldProxy).toBe(false);
      expect(getAssetUrlWithFallback).toHaveBeenCalledWith('/hamlet/audio/full-audiobook.mp3');
    });

    it('should return a CDN URL for a chapter audibook', async () => {
      // Mock fallback returning null to force using CDN URL
      (getAssetUrlWithFallback as jest.Mock).mockResolvedValue(null);

      const mockReq = createRequest({ slug: 'hamlet', type: 'chapter', chapter: '1' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      // Verify results
      expect(res.status).toBe(200);
      expect(data.url).toContain('cdn.digitaloceanspaces.com/hamlet/audio/book-01.mp3');
      expect(data.isCdnUrl).toBe(true);
      expect(data.shouldProxy).toBe(true);
      expect(data).not.toHaveProperty('correlationId'); // Correlation ID shouldn't be in success response
    });

    it('should return a direct CDN URL if fallback mechanism fails', async () => {
      // Mock fallback throwing an error
      (getAssetUrlWithFallback as jest.Mock).mockRejectedValue(new Error('Fallback failed'));

      const mockReq = createRequest({ slug: 'hamlet', type: 'full' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      // Verify results - should get a 200 with CDN URL since we always fall back to CDN
      expect(res.status).toBe(200);
      expect(data.url).toContain('cdn.digitaloceanspaces.com/hamlet/audio/full-audiobook.mp3');
      expect(data.isCdnUrl).toBe(true);
      expect(data.shouldProxy).toBe(true);
    });
  });

  describe('Error Handling', () => {
    // After our refactoring, AssetNotFoundError won't cause 404 responses anymore
    // since we always fall back to CDN URLs
    it('should use CDN fallback when asset is not found', async () => {
      // Setup mock to throw AssetNotFoundError
      (getAssetUrlWithFallback as jest.Mock).mockRejectedValue(
        new AssetNotFoundError('Asset not found: /nonexistent/audio/full-audiobook.mp3')
      );

      const mockReq = createRequest({ slug: 'nonexistent', type: 'full' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      // Verify we get a 200 with CDN URL rather than a 404
      expect(res.status).toBe(200);
      expect(data.url).toContain('cdn.digitaloceanspaces.com/nonexistent/audio/full-audiobook.mp3');
      expect(data.isCdnUrl).toBe(true);
      expect(data.shouldProxy).toBe(true);
    });

    it('should use CDN URL for any resolution failure', async () => {
      // Setup mock to throw a generic error
      (getAssetUrlWithFallback as jest.Mock).mockRejectedValue(new Error('Unexpected failure'));

      const mockReq = createRequest({ slug: 'hamlet', type: 'full' });
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      // Verify we get a 200 with CDN URL
      expect(res.status).toBe(200);
      expect(data.url).toContain('cdn.digitaloceanspaces.com/hamlet/audio/full-audiobook.mp3');
      expect(data.isCdnUrl).toBe(true);
      expect(data.shouldProxy).toBe(true);
    });

    it('should return 500 for critical errors in request handling', async () => {
      // Create a request that will cause a fatal error when accessing URL
      const mockReq = {
        url: null,
        method: 'GET',
        headers: {
          get: jest
            .fn()
            .mockImplementation((key) => (key === 'user-agent' ? 'test-user-agent' : null)),
        },
      };
      const res = await GET(mockReq as unknown as NextRequest);
      const data = await res.json();

      // Verify 500 response with correct format
      expect(res.status).toBe(500);
      expect(data).toMatchObject({
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        type: 'CRITICAL_ERROR',
        correlationId: 'test-correlation-id',
      });
    });
  });
});
