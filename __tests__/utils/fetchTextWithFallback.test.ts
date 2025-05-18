import { fetchTextWithFallback } from '@/utils/getBlobUrl';
import { blobPathService } from '@/utils/services/BlobPathService';
import { blobService } from '@/utils/services/BlobService';

// Mock the required services
jest.mock('@/utils/services/BlobService');
jest.mock('@/utils/services/BlobPathService');
jest.mock('@/utils/logger', () => ({
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

// Create a mock Response class for tests
class MockResponse implements Partial<Response> {
  private _status: number;
  private _body: string;

  constructor(body: string, init?: { status?: number }) {
    this._body = body;
    this._status = init?.status || 200;
  }

  get ok() {
    return this._status >= 200 && this._status < 300;
  }

  get status() {
    return this._status;
  }

  async text() {
    return this._body;
  }
}

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
      const legacyPath = 'https://public.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const normalizedLegacyUrl =
        'https://example.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const textContent = 'To be or not to be...';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(textContent);

      const result = await fetchTextWithFallback(legacyPath);

      expect(mockBlobService.fetchText).toHaveBeenCalledTimes(2);
      expect(mockBlobService.fetchText).toHaveBeenCalledWith(standardizedBlobUrl);
      expect(mockBlobService.fetchText).toHaveBeenCalledWith(normalizedLegacyUrl);
      expect(result).toBe(textContent);
    });

    it('should fallback to local path when standardized path fails', async () => {
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const textContent = 'To be or not to be...';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText.mockRejectedValue(new Error('Not found'));
      mockFetch.mockResolvedValue(new MockResponse(textContent, { status: 200 }) as Response);

      const result = await fetchTextWithFallback(legacyPath);

      expect(mockBlobService.fetchText).toHaveBeenCalledWith(standardizedBlobUrl);
      expect(mockFetch).toHaveBeenCalledWith(legacyPath);
      expect(result).toBe(textContent);
    });
  });

  describe('error scenarios', () => {
    it('should throw error when all attempts fail', async () => {
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText.mockRejectedValue(new Error('Not found'));
      mockFetch.mockResolvedValue(new MockResponse('', { status: 404 }) as Response);

      await expect(fetchTextWithFallback(legacyPath)).rejects.toThrow('HTTP error! Status: 404');
    });

    it('should throw error when standardized and legacy paths both fail', async () => {
      const legacyPath = 'https://public.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText
        .mockRejectedValueOnce(new Error('Not found - standard'))
        .mockRejectedValueOnce(new Error('Not found - legacy'));

      await expect(fetchTextWithFallback(legacyPath)).rejects.toThrow('Not found - legacy');
    });
  });

  describe('URL normalization', () => {
    it('should normalize Vercel blob URLs to tenant-specific domains', async () => {
      const legacyPath = 'https://public.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const standardizedBlobUrl =
        'https://example.blob.vercel-storage.com/assets/text/hamlet/brainrot-act-01.txt';
      const normalizedLegacyUrl =
        'https://example.blob.vercel-storage.com/assets/hamlet/text/act-1.txt';
      const textContent = 'To be or not to be...';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText
        .mockRejectedValueOnce(new Error('Not found'))
        .mockResolvedValueOnce(textContent);

      const result = await fetchTextWithFallback(legacyPath);

      expect(mockBlobService.fetchText).toHaveBeenCalledWith(normalizedLegacyUrl);
      expect(result).toBe(textContent);
    });

    it('should handle custom base URLs', async () => {
      const legacyPath = '/assets/hamlet/text/act-1.txt';
      const standardizedPath = 'assets/text/hamlet/brainrot-act-01.txt';
      const customBaseUrl = 'https://custom.blob.example.com';
      const standardizedBlobUrl =
        'https://custom.blob.example.com/assets/text/hamlet/brainrot-act-01.txt';
      const textContent = 'To be or not to be...';

      mockBlobPathService.convertLegacyPath.mockReturnValue(standardizedPath);
      mockBlobService.getUrlForPath.mockReturnValue(standardizedBlobUrl);
      mockBlobService.fetchText.mockResolvedValue(textContent);

      const result = await fetchTextWithFallback(legacyPath, { baseUrl: customBaseUrl });

      expect(mockBlobService.getUrlForPath).toHaveBeenCalledWith(standardizedPath, {
        baseUrl: customBaseUrl,
        noCache: undefined,
      });
      expect(result).toBe(textContent);
    });
  });
});
