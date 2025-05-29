/**
 * Simple test for fetchTextWithFallback using ES modules with explicit .js extensions
 */
import { fetchTextWithFallback } from '../../utils/getBlobUrl.js';
import { blobPathService } from '../../utils/services/BlobPathService.js';
import { blobService } from '../../utils/services/BlobService.js';
import { createTextResponse as _createTextResponse } from '../__testutils__/fixtures/index.js';

// Mock the BlobService
jest.mock('../../utils/services/BlobService.js', () => ({
  blobService: {
    getUrlForPath: jest.fn(),
    fetchText: jest.fn(),
  },
}));

// Mock the BlobPathService
jest.mock('../../utils/services/BlobPathService.js', () => ({
  blobPathService: {
    convertLegacyPath: jest.fn(),
  },
}));

// Mock the logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('fetchTextWithFallback (Simple Tests)', () => {
  const mockBlobService = blobService;
  const mockBlobPathService = blobPathService;
  const mockFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://example.blob.vercel-storage.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  });

  it('should fetch from standardized path successfully', async () => {
    // Setup test data
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

    // Should not attempt fallback
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should properly resolve custom base URLs', async () => {
    // Setup test data
    const legacyPath = '/assets/hamlet/text/act-1.txt';
    const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
    const customBaseUrl = 'https://custom.blob.example.com';
    const standardizedBlobUrl =
      'https://custom.blob.example.com/assets/text/hamlet/brainrot-act-01.txt';
    const textContent = 'To be or not to be...';

    // Configure mocks
    mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
    mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
    mockBlobService.fetchText.mockResolvedValue(textContent);

    // Execute function with custom base URL
    const result = await fetchTextWithFallback(legacyPath, { baseUrl: customBaseUrl });

    // Verify results
    expect(mockBlobService.getUrlForPath).toHaveBeenCalledWith(standardizedPath, {
      baseUrl: customBaseUrl,
      noCache: undefined,
    });
    expect(mockBlobService.fetchText).toHaveBeenCalledWith(standardizedBlobUrl);
    expect(result).toBe(textContent);
  });
});
