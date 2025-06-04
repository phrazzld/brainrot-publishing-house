import { DownloadRequestParams, DownloadService } from '../../services/downloadService.js';
import { AssetNotFoundError, AssetUrlResolver } from '../../types/dependencies.js';

// Mock implementations of dependencies
const createMockAssetUrlResolver = (): jest.Mocked<AssetUrlResolver> => ({
  getAssetUrl: jest.fn(),
});

describe('DownloadService', () => {
  // Constants for testing
  const TEST_BLOB_URL = 'https://public.blob.vercel-storage.com/assets/audio/hamlet/chapter-01.mp3';

  // Common request parameters
  const fullAudiobookParams: DownloadRequestParams = {
    slug: 'hamlet',
    type: 'full',
  };

  const chapterAudiobookParams: DownloadRequestParams = {
    slug: 'hamlet',
    type: 'chapter',
    chapter: '1',
  };

  // Test dependencies
  let mockAssetUrlResolver: jest.Mocked<AssetUrlResolver>;
  let downloadService: DownloadService;

  beforeEach(() => {
    // Reset mocks before each test
    mockAssetUrlResolver = createMockAssetUrlResolver();

    // Create service instance
    downloadService = new DownloadService(mockAssetUrlResolver);
  });

  describe('constructor', () => {
    it('should initialize with correct dependencies', () => {
      // Testing initialization happens in beforeEach
      // Just verify that the service was created successfully
      expect(downloadService).toBeInstanceOf(DownloadService);
    });
  });

  describe('getAssetService', () => {
    it('should return the asset service instance', () => {
      expect(downloadService.getAssetService()).toBe(mockAssetUrlResolver);
    });
  });

  describe('getDownloadUrl', () => {
    // Default setup: asset resolver returns a URL
    beforeEach(() => {
      mockAssetUrlResolver.getAssetUrl.mockResolvedValue(TEST_BLOB_URL);
    });

    it('should return URL directly from the resolver for full audiobook', async () => {
      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify asset resolver was called with correct path
      expect(mockAssetUrlResolver.getAssetUrl).toHaveBeenCalledWith(
        'audio',
        'hamlet',
        'full-audiobook.mp3',
      );

      // Verify result is the resolved URL
      expect(result).toBe(TEST_BLOB_URL);
    });

    it('should handle chapter paths correctly', async () => {
      const result = await downloadService.getDownloadUrl(chapterAudiobookParams);

      // Verify asset resolver was called with correct path including zero-padded chapter
      expect(mockAssetUrlResolver.getAssetUrl).toHaveBeenCalledWith(
        'audio',
        'hamlet',
        'chapter-01.mp3',
      );

      expect(result).toBe(TEST_BLOB_URL);
    });

    it('should throw error when resolver throws AssetNotFoundError', async () => {
      // Setup: asset resolver throws AssetNotFoundError
      const originalError = new AssetNotFoundError('Asset not found error');
      mockAssetUrlResolver.getAssetUrl.mockRejectedValue(originalError);

      // Expect the error to be propagated
      await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
        AssetNotFoundError,
      );
    });

    it('should throw error when resolver throws any other error', async () => {
      // Setup: asset resolver throws a generic error
      const originalError = new Error('Generic error');
      mockAssetUrlResolver.getAssetUrl.mockRejectedValue(originalError);

      // Expect the error to be propagated
      await expect(downloadService.getDownloadUrl(fullAudiobookParams)).rejects.toThrow(
        'Generic error',
      );
    });

    it('should throw error when chapter is missing for chapter type', async () => {
      // Invalid params: chapter type without chapter number
      const invalidParams: DownloadRequestParams = {
        slug: 'hamlet',
        type: 'chapter',
        // Missing chapter
      };

      await expect(downloadService.getDownloadUrl(invalidParams)).rejects.toThrow(
        'Chapter parameter is required',
      );
    });
  });
});
