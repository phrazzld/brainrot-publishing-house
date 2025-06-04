import { MockResponse } from '../../__mocks__/MockResponse.js';
import { fetchTextWithFallback } from '../../utils/getBlobUrl.js';
import { blobPathService } from '../../utils/services/BlobPathService.js';
import { blobService } from '../../utils/services/BlobService.js';

// Mock the required services
jest.mock('../../utils/services/BlobService.js');
jest.mock('../../utils/services/BlobPathService.js');
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

describe('fetchTextWithFallback', () => {
  const mockBlobService = blobService as jest.Mocked<typeof blobService>;
  const mockBlobPathService = blobPathService as jest.Mocked<typeof blobPathService>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://example.blob.vercel-storage.com';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  });

  describe('successful scenarios', () => {
    it('should fetch from standardized path successfully', async () => {
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const blobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const textContent = 'To be or not to be...';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(blobUrl);
      mockBlobService.fetchText.mockResolvedValue(textContent);

      const result = await fetchTextWithFallback(legacyPath);

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

    it('should fallback to legacy blob URL when standardized path fails', async () => {
      // Setup the Vercel base URL environment variable to ensure proper URL normalization
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://example.blob.vercel-storage.com';

      // Test data
      const legacyPath = 'https://public.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const normalizedLegacyUrl =
        'https://example.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const textContent = 'To be or not to be...';

      // Setup mocks
      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);

      // First call to fetchText (standardized path) fails, second call (legacy path) succeeds
      mockBlobService.fetchText
        .mockRejectedValueOnce(new Error('Not found')) // First call fails
        .mockResolvedValueOnce(textContent); // Second call succeeds

      // Execute function
      const result = await fetchTextWithFallback(legacyPath);

      // Verify
      expect(mockBlobService.fetchText).toHaveBeenCalledTimes(2);
      expect(mockBlobService.fetchText).toHaveBeenNthCalledWith(1, standardizedBlobUrl);
      expect(mockBlobService.fetchText).toHaveBeenNthCalledWith(2, normalizedLegacyUrl);
      expect(result).toBe(textContent);
    });

    it('should fallback to local path when standardized path fails', async () => {
      // Test data
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const textContent = 'To be or not to be...';

      // Setup mocks
      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);

      // BlobService.fetchText will always fail
      mockBlobService.fetchText.mockRejectedValue(new Error('Not found'));

      // But fetch will succeed with our custom response
      const successResponse = new MockResponse(textContent, { status: 200 });
      mockFetch.mockResolvedValue(successResponse);

      // Execute
      const result = await fetchTextWithFallback(legacyPath);

      // Verify
      expect(mockBlobService.fetchText).toHaveBeenCalledWith(standardizedBlobUrl);
      expect(mockFetch).toHaveBeenCalledWith(legacyPath);
      expect(result).toBe(textContent);
    });
  });

  describe('error scenarios', () => {
    it('should throw error when all attempts fail', async () => {
      // Test data
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';

      // Setup mocks
      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);

      // BlobService.fetchText will fail with "Not found"
      mockBlobService.fetchText.mockRejectedValue(new Error('Not found'));

      // And fetch will fail with a 404 response
      const errorResponse = new MockResponse('', { status: 404, statusText: 'Not Found' });
      // Need to ensure ok property is correctly set to false (default for 404, but being explicit)
      Object.defineProperty(errorResponse, 'ok', { value: false });

      mockFetch.mockResolvedValue(errorResponse);

      // Execute and verify - should throw with the HTTP status error
      await expect(fetchTextWithFallback(legacyPath)).rejects.toThrow('HTTP error! Status: 404');
    });

    it('should throw error when standardized and legacy paths both fail', async () => {
      // Test data with a fully qualified URL
      const legacyPath = 'https://public.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';

      // Setup mocks
      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);

      // Both calls to fetchText will fail with different errors
      mockBlobService.fetchText
        .mockRejectedValueOnce(new Error('Not found - standard'))
        .mockRejectedValueOnce(new Error('Not found - legacy'));

      // Execute and verify - should throw with the legacy error message
      await expect(fetchTextWithFallback(legacyPath)).rejects.toThrow(
        'Failed to fetch text: Not found - legacy',
      );
    });
  });

  describe('URL normalization', () => {
    it('should normalize Vercel blob URLs to tenant-specific domains', async () => {
      // Test data with public Vercel domain
      const legacyPath = 'https://public.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const normalizedLegacyUrl =
        'https://example.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const textContent = 'To be or not to be...';

      // Setup mocks
      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);

      // First attempt fails, second succeeds
      mockBlobService.fetchText
        .mockRejectedValueOnce(new Error('Not found - standard'))
        .mockResolvedValueOnce(textContent);

      // Execute
      const result = await fetchTextWithFallback(legacyPath);

      // Verify the URL was normalized from public to tenant-specific domain
      expect(mockBlobService.fetchText).toHaveBeenNthCalledWith(2, normalizedLegacyUrl);
      expect(result).toBe(textContent);
    });

    it('should handle custom base URLs', async () => {
      // Test data
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const customBaseUrl = 'https://custom.blob.example.com';
      const standardizedBlobUrl =
        'https://custom.blob.example.com/assets/text/hamlet/brainrot-act-01.txt';
      const textContent = 'To be or not to be...';

      // Setup mocks
      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText.mockResolvedValue(textContent);

      // Execute with custom base URL
      const result = await fetchTextWithFallback(legacyPath, { baseUrl: customBaseUrl });

      // Verify custom base URL was used
      expect(mockBlobService.getUrlForPath).toHaveBeenCalledWith(standardizedPath, {
        baseUrl: customBaseUrl,
        noCache: undefined,
      });
      expect(mockBlobService.fetchText).toHaveBeenCalledWith(standardizedBlobUrl);
      expect(result).toBe(textContent);
    });
  });
});
