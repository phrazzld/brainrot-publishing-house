import { 
  getAssetUrlWithFallback, 
  fetchTextWithFallback, 
  clearBlobUrlCache, 
  assetExistsInBlobStorage 
} from '../../utils/getBlobUrl';
import { blobService } from '../../utils/services/BlobService';

// Mock the services
jest.mock('../../utils/services/BlobService', () => ({
  blobService: {
    getUrlForPath: jest.fn((path) => `https://blob-storage.example.com/${path}`),
    fetchText: jest.fn(),
    getFileInfo: jest.fn()
  }
}));

jest.mock('../../utils/services/BlobPathService', () => ({
  blobPathService: {
    convertLegacyPath: jest.fn((path) => path.replace(/^\/assets\//, 'books/').replace(/^\//, ''))
  }
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Fallback mechanism', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearBlobUrlCache();
  });

  describe('getAssetUrlWithFallback', () => {
    it('should return Blob URL when asset exists in Blob storage', async () => {
      // Mock asset exists in Blob
      (blobService.getFileInfo as jest.Mock).mockResolvedValueOnce({
        url: 'https://blob-storage.example.com/books/hamlet/images/hamlet-01.png',
        size: 1024
      });

      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const result = await getAssetUrlWithFallback(legacyPath);
      
      expect(blobService.getFileInfo).toHaveBeenCalled();
      expect(result).toBe('https://blob-storage.example.com/books/hamlet/images/hamlet-01.png');
    });

    it('should return legacy path when asset does not exist in Blob storage', async () => {
      // Mock asset doesn't exist in Blob
      (blobService.getFileInfo as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const legacyPath = '/assets/hamlet/images/not-migrated.png';
      const result = await getAssetUrlWithFallback(legacyPath);

      expect(blobService.getFileInfo).toHaveBeenCalled();
      expect(result).toBe(legacyPath);
    });

    it('should use cache for repeated existence checks', async () => {
      // First check - asset exists
      (blobService.getFileInfo as jest.Mock).mockResolvedValueOnce({
        url: 'https://blob-storage.example.com/books/hamlet/images/hamlet-01.png',
        size: 1024
      });

      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      
      // First call should use service
      await getAssetUrlWithFallback(legacyPath);
      expect(blobService.getFileInfo).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await getAssetUrlWithFallback(legacyPath);
      expect(blobService.getFileInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle errors and fall back to local path', async () => {
      // Mock a network error
      (blobService.getFileInfo as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      const result = await getAssetUrlWithFallback(legacyPath);
      
      expect(result).toBe(legacyPath);
    });
  });

  describe('fetchTextWithFallback', () => {
    it('should fetch from Blob storage when successful', async () => {
      // Mock successful fetch from Blob
      (blobService.fetchText as jest.Mock).mockResolvedValueOnce('Text content from Blob');

      const legacyPath = '/assets/hamlet/text/brainrot/chapter-1.txt';
      const result = await fetchTextWithFallback(legacyPath);
      
      expect(blobService.fetchText).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBe('Text content from Blob');
    });

    it('should fall back to local path when Blob fetch fails', async () => {
      // Mock Blob fetch failure
      (blobService.fetchText as jest.Mock).mockRejectedValueOnce(new Error('Blob fetch failed'));
      
      // Mock successful fetch from local path
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValueOnce('Text content from local path')
      });

      const legacyPath = '/assets/hamlet/text/brainrot/chapter-1.txt';
      const result = await fetchTextWithFallback(legacyPath);
      
      expect(blobService.fetchText).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(legacyPath);
      expect(result).toBe('Text content from local path');
    });

    it('should throw error when both fetches fail', async () => {
      // Mock Blob fetch failure
      (blobService.fetchText as jest.Mock).mockRejectedValueOnce(new Error('Blob fetch failed'));
      
      // Mock local fetch failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const legacyPath = '/assets/hamlet/text/brainrot/not-exists.txt';
      
      await expect(fetchTextWithFallback(legacyPath)).rejects.toThrow();
      
      expect(blobService.fetchText).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(legacyPath);
    });
  });

  describe('assetExistsInBlobStorage with caching', () => {
    it('should cache existence check results', async () => {
      // First check
      (blobService.getFileInfo as jest.Mock).mockResolvedValueOnce({
        size: 1024
      });

      const legacyPath = '/assets/hamlet/images/hamlet-01.png';
      
      // First call should use service
      const firstResult = await assetExistsInBlobStorage(legacyPath);
      expect(blobService.getFileInfo).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(true);
      
      // Second call should use cache
      const secondResult = await assetExistsInBlobStorage(legacyPath);
      expect(blobService.getFileInfo).toHaveBeenCalledTimes(1);
      expect(secondResult).toBe(true);
    });

    it('should bypass cache when useCache is false', async () => {
      // Setup mocks for both calls
      (blobService.getFileInfo as jest.Mock)
        .mockResolvedValueOnce({ size: 1024 })
        .mockResolvedValueOnce({ size: 2048 });

      const legacyPath = '/assets/hamlet/images/hamlet-02.png';
      
      // First call
      await assetExistsInBlobStorage(legacyPath);
      expect(blobService.getFileInfo).toHaveBeenCalledTimes(1);
      
      // Second call with useCache = false
      await assetExistsInBlobStorage(legacyPath, {}, false);
      expect(blobService.getFileInfo).toHaveBeenCalledTimes(2);
    });
  });
});