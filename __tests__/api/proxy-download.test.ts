import { proxyAssetDownload } from '@/app/api/download/proxyService';
import { AssetError, AssetErrorType, AssetService, AssetType } from '@/types/assets';
import { createRequestLogger } from '@/utils/logger';

// Define the mock NextResponse
const __mockNextResponse = {
  json: (data: Record<string, unknown>, options?: { status?: number; headers?: Headers }) => ({
    status: options?.status || 200,
    json: async () => data,
    headers: options?.headers || {},
  }),
};

// Mock the logger
jest.mock('@/utils/logger', () => ({
  createRequestLogger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  })),
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

// Mock the TimeoutError class
jest.mock('node-fetch', () => {
  class MockTimeoutError extends Error {
    constructor(url: string, timeoutMs: number) {
      super(`Request to ${url} timed out after ${timeoutMs}ms`);
      this.name = 'TimeoutError';
    }
  }
  return { TimeoutError: MockTimeoutError };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortController
global.AbortController = class MockAbortController {
  signal: AbortSignal = {
    aborted: false,
    reason: undefined,
    onabort: null,
    throwIfAborted: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn().mockReturnValue(true),
  } as unknown as AbortSignal;

  abort = jest.fn(() => {
    // Use type assertion with a more specific type
    (this.signal as unknown as { aborted: boolean }).aborted = true;
    (this.signal as unknown as { reason: Error }).reason = new DOMException(
      'The operation was aborted',
      'AbortError'
    );
  });
} as unknown as typeof AbortController;

// Mock setTimeout
jest.spyOn(global, 'setTimeout').mockImplementation((_fn) => {
  // Don't actually call the timeout function to avoid unexpected aborts
  return 123 as unknown as NodeJS.Timeout;
});

// Mock clearTimeout
jest.spyOn(global, 'clearTimeout').mockImplementation(() => {});

// Mock response creation helper functions
const createMockResponseObject = (status = 200, statusText = 'OK', headers = {}) => ({
  status,
  statusText,
  headers,
  ok: status >= 200 && status < 300,
  type: 'basic',
  url: '',
  redirected: false,
  bodyUsed: false,
  clone: jest.fn().mockReturnThis(),
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  blob: jest.fn().mockResolvedValue(new Blob()),
  formData: jest.fn().mockResolvedValue(new FormData()),
});

// Mock NextResponse
jest.mock('next/server', () => {
  // Create a function that meets the requirements of NextResponse
  const mockResponseFunction = jest
    .fn()
    .mockImplementation((body: ReadableStream | null, init?: ResponseInit) => ({
      ...createMockResponseObject(init?.status, init?.statusText, init?.headers),
      body,
    }));

  // Add the required static json method to the function object
  const jsonMethod = jest.fn().mockImplementation((data: unknown, options?: ResponseInit) => ({
    ...createMockResponseObject(options?.status, options?.statusText, options?.headers),
    json: async () => data,
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    body: null,
  }));

  // Create the NextResponse object with both function behavior and json method
  const NextResponse = Object.assign(mockResponseFunction, { json: jsonMethod });

  return { NextResponse };
});

// Helper to create mock headers
function createMockHeaders(headersObj: Record<string, string> = {}): Headers {
  const headers = new Headers();
  Object.entries(headersObj).forEach(([key, value]) => {
    headers.append(key, value);
  });
  return headers;
}

// Helper to create mock readable stream
function createMockStream(): ReadableStream {
  const mockReader = {
    read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
    releaseLock: jest.fn(),
    closed: Promise.resolve(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  };

  // Create initial stream properties with proper typing
  const mockStream: Partial<ReadableStream> & {
    getReader: jest.Mock;
    pipeTo: jest.Mock;
    cancel: jest.Mock;
    pipeThrough?: jest.Mock;
    tee?: jest.Mock;
    locked: boolean;
  } = {
    getReader: jest.fn().mockReturnValue(mockReader),
    pipeTo: jest.fn().mockReturnValue(Promise.resolve()),
    cancel: jest.fn().mockReturnValue(Promise.resolve()),
    locked: false,
  };

  // Add methods that reference the mockStream itself
  mockStream.pipeThrough = jest.fn().mockReturnValue(mockStream);
  mockStream.tee = jest.fn().mockReturnValue([mockStream, mockStream]);

  return mockStream as unknown as ReadableStream;
}

// Mock AssetService implementation
class MockAssetService implements AssetService {
  private shouldFail: boolean;
  private errorType: AssetErrorType;

  constructor(options: { shouldFail?: boolean; errorType?: AssetErrorType } = {}) {
    this.shouldFail = options.shouldFail || false;
    this.errorType = options.errorType || AssetErrorType.NOT_FOUND;
  }

  async getAssetUrl(assetType: AssetType, bookSlug: string, assetName: string): Promise<string> {
    if (this.shouldFail) {
      throw new AssetError('Failed to get asset URL', this.errorType, 'getAssetUrl', {
        assetPath: `assets/${assetType}/${bookSlug}/${assetName}`,
      });
    }
    return `https://public.blob.vercel-storage.com/assets/${assetType}/${bookSlug}/${assetName}`;
  }

  // Implement other required methods but with no-op functionality
  assetExists = jest.fn().mockResolvedValue(true);
  fetchAsset = jest.fn();
  fetchTextAsset = jest.fn();
  uploadAsset = jest.fn();
  deleteAsset = jest.fn();
  listAssets = jest.fn();
}

describe('Proxy Download Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset fetch mock to a default success response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createMockHeaders({
        'content-type': 'audio/mpeg',
        'content-length': '1000000',
      }),
      body: createMockStream(),
    });
  });

  // Helper functions for test setup and assertions
  function createDownloadConfig(
    overrides: { assetServiceOptions?: { shouldFail?: boolean; errorType?: AssetErrorType } } = {}
  ) {
    const logger = createRequestLogger('test-correlation-id');
    const assetService = new MockAssetService(overrides.assetServiceOptions);

    return {
      assetType: AssetType.AUDIO,
      bookSlug: 'test-book',
      assetName: 'chapter-01.mp3',
      filename: 'test-book-chapter-01.mp3',
      log: logger,
      assetService,
      requestParams: { test: 'param' },
      ...overrides,
    };
  }

  function mockSuccessfulFetch(
    options: { headers?: Record<string, string>; extraProps?: Record<string, unknown> } = {}
  ) {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: createMockHeaders({
        'content-type': 'audio/mpeg',
        'content-length': '1000000',
        ...(options.headers || {}),
      }),
      body: createMockStream(),
      ...(options.extraProps || {}),
    });
  }

  function mockFailedFetch(
    status = 403,
    statusText = 'Forbidden',
    contentType = 'application/json'
  ) {
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      statusText,
      headers: createMockHeaders({
        'content-type': contentType,
      }),
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Access denied' })),
      clone: function () {
        return this;
      },
      body: createMockStream(),
    });
  }

  describe('proxyAssetDownload', () => {
    it('should successfully proxy an asset download', async () => {
      // Setup test conditions
      mockSuccessfulFetch();
      const config = createDownloadConfig();

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify the response
      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      // Verify that fetch was called properly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://public.blob.vercel-storage.com/assets/audio/test-book/chapter-01.mp3',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: '*/*',
          }),
          signal: expect.anything(),
        })
      );
    });

    it('should handle AssetService errors', async () => {
      // Setup test with failing asset service
      const config = createDownloadConfig({
        assetServiceOptions: {
          shouldFail: true,
          errorType: AssetErrorType.NOT_FOUND,
        },
      });

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify 404 response
      expect(response).toBeDefined();
      expect(response.status).toBe(404);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle unauthorized access errors from AssetService', async () => {
      // Setup test with unauthorized error
      const config = createDownloadConfig({
        assetServiceOptions: {
          shouldFail: true,
          errorType: AssetErrorType.UNAUTHORIZED,
        },
      });

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify 401 response
      expect(response).toBeDefined();
      expect(response.status).toBe(401);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      // Setup test with network error
      mockFetch.mockRejectedValue(new Error('Network error'));
      const config = createDownloadConfig();

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify 502 response
      expect(response).toBeDefined();
      expect(response.status).toBe(502);
    });

    it('should handle non-OK fetch responses', async () => {
      // Setup test with error response
      mockFailedFetch();
      const config = createDownloadConfig();

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify error response
      expect(response).toBeDefined();
      expect(response.status).toBe(502); // Bad Gateway
    });

    it('should set proper download headers', async () => {
      // Setup NextResponse mock specifically for this test
      const mockNextResponse = require('next/server').NextResponse;
      mockNextResponse.mockImplementationOnce(
        (body: ReadableStream | null, init: ResponseInit) => ({
          status: init?.status || 200,
          headers: init?.headers || {},
          body,
        })
      );

      // Setup successful fetch with specific headers
      mockSuccessfulFetch({
        headers: {
          'content-type': 'audio/mpeg',
          'content-length': '5000000',
        },
      });

      // Use a custom filename
      const config = createDownloadConfig({ filename: 'custom-download-name.mp3' });

      // Call the proxy function
      const response = await proxyAssetDownload(config);

      // Verify response
      expect(response).toBeDefined();
      expect(response.status).toBe(200);

      // Verify NextResponse was called correctly
      expect(mockNextResponse).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 200,
          headers: expect.any(Object),
        })
      );
    });
  });
});
