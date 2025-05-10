import { DownloadRequestParams, DownloadService } from '../../services/downloadService';
import { AssetNotFoundError, AssetUrlResolver } from '../../types/dependencies';

// Mock implementations of dependencies
const createMockAssetUrlResolver = (): jest.Mocked<AssetUrlResolver> => ({
  getAssetUrlWithFallback: jest.fn(),
});

describe('DownloadService', () => {
  // Constants for testing
  const TEST_CDN_URL =
    'https://brainrot-publishing.nyc3.cdn.digitaloceanspaces.com/hamlet/audio/full-audiobook.mp3';
  const TEST_BLOB_URL =
    'https://public.blob.vercel-storage.com/books/hamlet/audio/full-audiobook.mp3';

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

  describe('getDownloadUrl', () => {
    // Default setup: asset resolver returns a URL
    beforeEach(() => {
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_BLOB_URL);
    });

    it('should return URL directly from the resolver', async () => {
      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify asset resolver was called with correct path
      expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
        '/hamlet/audio/full-audiobook.mp3'
      );

      // Verify result is the resolved URL
      expect(result).toBe(TEST_BLOB_URL);
    });

    it('should handle chapter paths correctly', async () => {
      const result = await downloadService.getDownloadUrl(chapterAudiobookParams);

      // Verify asset resolver was called with correct path including zero-padded chapter
      expect(mockAssetUrlResolver.getAssetUrlWithFallback).toHaveBeenCalledWith(
        '/hamlet/audio/book-01.mp3'
      );

      expect(result).toBe(TEST_BLOB_URL);
    });

    it('should handle CDN URLs correctly', async () => {
      // Setup: asset resolver returns a CDN URL
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(TEST_CDN_URL);

      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify result is the CDN URL directly
      expect(result).toBe(TEST_CDN_URL);
    });

    it('should use CDN URL when resolver returns falsy value', async () => {
      // Setup: asset resolver returns null (asset not found)
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue('');

      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify the CDN URL is used as fallback
      expect(result).toContain('cdn.digitaloceanspaces.com');
      expect(result).toContain('hamlet/audio/full-audiobook.mp3');
    });

    it('should use CDN URL when resolver throws AssetNotFoundError', async () => {
      // Setup: asset resolver throws AssetNotFoundError
      const originalError = new AssetNotFoundError('Original asset not found error');
      mockAssetUrlResolver.getAssetUrlWithFallback.mockRejectedValue(originalError);

      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify the CDN URL is used as fallback
      expect(result).toContain('cdn.digitaloceanspaces.com');
      expect(result).toContain('hamlet/audio/full-audiobook.mp3');
    });

    it('should use CDN URL when resolver throws any error', async () => {
      // Setup: asset resolver throws a generic error
      mockAssetUrlResolver.getAssetUrlWithFallback.mockRejectedValue(new Error('Generic error'));

      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify the CDN URL is used as fallback
      expect(result).toContain('cdn.digitaloceanspaces.com');
      expect(result).toContain('hamlet/audio/full-audiobook.mp3');
    });

    it('should use fallback URL from resolver when available', async () => {
      // Setup: asset resolver returns a Blob URL
      const blobUrl = 'https://public.blob.vercel-storage.com/hamlet/audio/full-audiobook.mp3';
      mockAssetUrlResolver.getAssetUrlWithFallback.mockResolvedValue(blobUrl);

      const result = await downloadService.getDownloadUrl(fullAudiobookParams);

      // Verify the Blob URL is used since it was available
      expect(result).toBe(blobUrl);
    });

    // Note: Signing error tests removed as we now use direct URLs

    it('should throw error when chapter is missing for chapter type', async () => {
      // Invalid params: chapter type without chapter number
      const invalidParams: DownloadRequestParams = {
        slug: 'hamlet',
        type: 'chapter',
        // Missing chapter
      };

      await expect(downloadService.getDownloadUrl(invalidParams)).rejects.toThrow(
        'Chapter parameter is required'
      );
    });
  });

  describe('Direct CDN URL Generation', () => {
    // Testing the direct CDN URL generation functionality

    // We're mocking our own method to verify its behavior without introducing
    // nested callbacks, so we'll test in a different way to avoid max-nested-callbacks
    // warnings.

    // This uses a simpler approach to test the URL generation logic
    it('should generate correct full audiobook CDN URL format', () => {
      // Create a new service just for this test
      const testService = new DownloadService(mockAssetUrlResolver);

      // Access the private method using type casting to verify format directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paths = (testService as any).generatePaths('hamlet', 'full');

      // Verify the generated CDN URL matches expected pattern
      expect(paths.cdnUrl).toMatch(
        /https:\/\/[\w-]+\.nyc3\.cdn\.digitaloceanspaces\.com\/hamlet\/audio\/full-audiobook\.mp3/
      );
    });
  });
});
