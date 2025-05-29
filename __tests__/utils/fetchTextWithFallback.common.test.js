/**
 * CommonJS test for fetchTextWithFallback using the new fixtures
 */

// Mock the modules first, before requiring anything
jest.mock('../../utils/services/BlobService', () => ({
  blobService: {
    getUrlForPath: jest.fn(),
    fetchText: jest.fn(),
  },
}));

jest.mock('../../utils/services/BlobPathService', () => ({
  blobPathService: {
    convertLegacyPath: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

// Now require the module under test and the mocked dependencies
const { fetchTextWithFallback } = jest.requireActual('../../utils/getBlobUrl');
const { blobPathService } = require('../../utils/services/BlobPathService');
const { blobService } = require('../../utils/services/BlobService');

// Setup global fetch mock
global.fetch = jest.fn();

describe('fetchTextWithFallback with CommonJS', () => {
  const mockBlobService = blobService;
  const mockBlobPathService = blobPathService;
  const mockFetch = global.fetch;

  // Create a simple text response mock
  function createTextResponse(text, options = {}) {
    const status = options.status || 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: options.statusText || 'OK',
      text: jest.fn().mockResolvedValue(text),
      headers: new Headers(options.headers || { 'content-type': 'text/plain' }),
    };
  }

  // Create a simple error response mock
  function createErrorResponse(status = 404, statusText = 'Not Found') {
    return createTextResponse(`Error ${status}`, { status, statusText });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://example.blob.vercel-storage.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  });

  it('should fetch from standardized path successfully', async () => {
    // Test data
    const legacyPath = '/assets/hamlet/text/act-1.txt';
    const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
    const blobUrl =
      'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
    const textContent = 'To be or not to be...';

    // Configure mocks
    mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
    mockBlobService.getUrlForPath.mockReturnValue(blobUrl);
    mockBlobService.fetchText.mockResolvedValue(textContent);

    // Execute function
    const result = await fetchTextWithFallback(legacyPath);

    // Verify results
    expect(mockBlobPathService.convertLegacyPath).toHaveBeenCalledWith(legacyPath);
    expect(mockBlobService.getUrlForPath).toHaveBeenCalledWith(standardizedPath, {
      baseUrl: 'https://example.blob.vercel-storage.com',
      noCache: undefined,
    });
    expect(mockBlobService.fetchText).toHaveBeenCalledWith(blobUrl);
    expect(result).toBe(textContent);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fallback to local path when standardized path fails', async () => {
    // Test data
    const legacyPath = '/assets/hamlet/text/act-1.txt';
    const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
    const blobUrl =
      'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
    const textContent = 'To be or not to be...';

    // Configure mocks
    mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
    mockBlobService.getUrlForPath.mockReturnValue(blobUrl);
    mockBlobService.fetchText.mockRejectedValue(new Error('Not found'));
    mockFetch.mockResolvedValue(createTextResponse(textContent));

    // Execute function
    const result = await fetchTextWithFallback(legacyPath);

    // Verify results
    expect(mockBlobService.fetchText).toHaveBeenCalledWith(blobUrl);
    expect(mockFetch).toHaveBeenCalledWith(legacyPath);
    expect(result).toBe(textContent);
  });

  it('should throw error when all attempts fail', async () => {
    // Test data
    const legacyPath = '/assets/hamlet/text/act-1.txt';
    const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
    const blobUrl =
      'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';

    // Configure mocks
    mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
    mockBlobService.getUrlForPath.mockReturnValue(blobUrl);
    mockBlobService.fetchText.mockRejectedValue(new Error('Not found'));
    mockFetch.mockResolvedValue(createErrorResponse(404, 'Not Found'));

    // Should throw with an HTTP error
    await expect(fetchTextWithFallback(legacyPath)).rejects.toThrow('HTTP error! Status: 404');
  });
});
