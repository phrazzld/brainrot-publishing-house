/**
 * Asset Verification Tests
 *
 * This test suite verifies the correctness of asset paths and access using the
 * standardized path structure from the migration project.
 */
import { createErrorResponse, createSuccessResponse } from '../../__mocks__/MockResponse';
import {
  AUDIO_ASSETS,
  IMAGE_ASSETS,
  MOCK_BLOB_BASE_URL,
  TEST_BOOKS,
  TEXT_ASSETS,
} from '../../__mocks__/assetFixtures';
import { AssetType } from '../../types/assets';
import { assetPathService } from '../../utils/services/AssetPathService';
import { blobPathService } from '../../utils/services/BlobPathService';
import { BlobService } from '../../utils/services/BlobService';

// Mock the Vercel Blob module
jest.mock('@vercel/blob', () => ({
  put: jest.fn().mockResolvedValue({
    url: 'https://test-blob-storage.com/test-asset',
    pathname: 'test-asset',
  }),
  list: jest.fn().mockResolvedValue({
    blobs: [
      {
        url: 'https://test-blob-storage.com/assets/text/hamlet/chapter-01.txt',
        pathname: 'assets/text/hamlet/chapter-01.txt',
      },
      {
        url: 'https://test-blob-storage.com/assets/audio/hamlet/chapter-01.mp3',
        pathname: 'assets/audio/hamlet/chapter-01.mp3',
      },
    ],
    cursor: undefined,
  }),
  head: jest.fn().mockResolvedValue({
    url: 'https://test-blob-storage.com/test-asset',
    pathname: 'test-asset',
    contentType: 'text/plain',
    contentLength: 100,
  }),
  del: jest.fn().mockResolvedValue(undefined),
}));

// Mock global.fetch
const originalFetch = global.fetch;
let mockFetchImplementation: jest.Mock;

describe('Asset Verification', () => {
  let blobService: BlobService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a new instance for each test
    blobService = new BlobService();

    // Set up fetch mock
    mockFetchImplementation = jest.fn();
    global.fetch = mockFetchImplementation;

    // Set environment variables for testing
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = MOCK_BLOB_BASE_URL;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;

    // Restore global.fetch
    global.fetch = originalFetch;
  });

  describe('Asset Path Generation', () => {
    test('generates correct path for text assets', () => {
      // Test brainrot chapter path
      const brainrotChapterPath = assetPathService.getBrainrotTextPath(TEST_BOOKS.HAMLET, '1');
      expect(brainrotChapterPath).toBe(TEXT_ASSETS.BRAINROT_CHAPTER.unified);

      // Test brainrot fulltext path
      const brainrotFulltextPath = assetPathService.getBrainrotTextPath(TEST_BOOKS.HAMLET, 'full');
      expect(brainrotFulltextPath).toBe(TEXT_ASSETS.BRAINROT_FULLTEXT.unified);

      // Test with actual AssetType enum
      const textAssetPath = assetPathService.getAssetPath(
        AssetType.TEXT,
        TEST_BOOKS.HAMLET,
        'brainrot-chapter-01.txt',
      );
      expect(textAssetPath).toBe(TEXT_ASSETS.BRAINROT_CHAPTER.unified);
    });

    test('generates correct path for audio assets', () => {
      // Test chapter audio path
      const chapterAudioPath = assetPathService.getAudioPath(TEST_BOOKS.HAMLET, '3');
      expect(chapterAudioPath).toBe(AUDIO_ASSETS.CHAPTER.unified);

      // Test full audiobook path
      const fullAudiobookPath = assetPathService.getAudioPath(TEST_BOOKS.ILIAD, 'full');

      // Verify the path structure without exact match
      expect(fullAudiobookPath).toContain('assets/audio/the-iliad');
      expect(fullAudiobookPath).toContain('.mp3');

      // Test with actual AssetType enum
      const audioAssetPath = assetPathService.getAssetPath(
        AssetType.AUDIO,
        TEST_BOOKS.HAMLET,
        'chapter-03.mp3',
      );
      expect(audioAssetPath).toBe(AUDIO_ASSETS.CHAPTER.unified);
    });

    test('generates correct path for image assets', () => {
      // Test book cover image path
      const coverImagePath = assetPathService.getBookImagePath(TEST_BOOKS.ODYSSEY, 'cover.jpg');
      expect(coverImagePath).toBe(IMAGE_ASSETS.BOOK_COVER.unified);

      // Test with shared image path
      const sharedImagePath = assetPathService.getSharedImagePath('publisher-logo.png');
      expect(sharedImagePath).toBe(IMAGE_ASSETS.SHARED_IMAGE.unified);

      // Test with site asset path
      const siteAssetPath = assetPathService.getSiteAssetPath('site-icon.svg');
      expect(siteAssetPath).toBe(IMAGE_ASSETS.SITE_ASSET.unified);
    });

    test('correctly converts legacy paths to unified paths', () => {
      // Test brainrot chapter text path conversion
      const brainrotTextConversion = assetPathService.convertLegacyPath(
        TEXT_ASSETS.BRAINROT_CHAPTER.legacy,
      );
      expect(brainrotTextConversion).toBe(TEXT_ASSETS.BRAINROT_CHAPTER.unified);

      // Test audio chapter path conversion
      const audioChapterConversion = assetPathService.convertLegacyPath(
        AUDIO_ASSETS.CHAPTER.legacy,
      );
      expect(audioChapterConversion).toBe(AUDIO_ASSETS.CHAPTER.unified);

      // Test image path conversion
      const imageConversion = assetPathService.convertLegacyPath(IMAGE_ASSETS.BOOK_COVER.legacy);
      expect(imageConversion).toBe(IMAGE_ASSETS.BOOK_COVER.unified);

      // Test shared asset path conversion
      const sharedImageConversion = assetPathService.convertLegacyPath(
        IMAGE_ASSETS.SHARED_IMAGE.legacy,
      );
      expect(sharedImageConversion).toBe(IMAGE_ASSETS.SHARED_IMAGE.unified);
    });

    test('correctly extracts book slug from paths', () => {
      // Extract from unified path
      const bookSlugFromUnified = assetPathService.getBookSlugFromPath(
        TEXT_ASSETS.BRAINROT_CHAPTER.unified,
      );
      expect(bookSlugFromUnified).toBe(TEST_BOOKS.HAMLET);

      // Extract from legacy path
      const bookSlugFromLegacy = assetPathService.getBookSlugFromPath(AUDIO_ASSETS.CHAPTER.legacy);
      expect(bookSlugFromLegacy).toBe(TEST_BOOKS.HAMLET);

      // No book slug from shared assets
      const bookSlugFromShared = assetPathService.getBookSlugFromPath(
        IMAGE_ASSETS.SHARED_IMAGE.unified,
      );
      expect(bookSlugFromShared).toBeNull();
    });

    test('handles edge cases and special characters in paths', () => {
      // Test path with spaces and special characters
      const pathWithSpecialChars = assetPathService.getAssetPath(
        AssetType.TEXT,
        TEST_BOOKS.HAMLET,
        'special characters & symbols!.txt',
      );
      expect(pathWithSpecialChars).toBe('assets/text/hamlet/special characters & symbols!.txt');

      // Test with very long paths
      const longBookSlug = 'very-long-book-title-that-exceeds-normal-length-limits';
      const longPath = assetPathService.getAssetPath(
        AssetType.TEXT,
        longBookSlug,
        'extremely-long-filename-with-detailed-description-of-contents.txt',
      );
      expect(longPath).toBe(
        'assets/text/very-long-book-title-that-exceeds-normal-length-limits/extremely-long-filename-with-detailed-description-of-contents.txt',
      );
    });
  });

  describe('URL Generation and Access', () => {
    describe('URL Construction', () => {
      test('generates correct public URLs from asset paths', () => {
        // Test URL generation for text asset
        const textAssetUrl = blobService.getUrlForPath(TEXT_ASSETS.BRAINROT_CHAPTER.unified);
        expect(textAssetUrl).toBe(`${MOCK_BLOB_BASE_URL}/${TEXT_ASSETS.BRAINROT_CHAPTER.unified}`);

        // Test URL generation for audio asset
        const audioAssetUrl = blobService.getUrlForPath(AUDIO_ASSETS.CHAPTER.unified);
        expect(audioAssetUrl).toBe(`${MOCK_BLOB_BASE_URL}/${AUDIO_ASSETS.CHAPTER.unified}`);

        // Test URL generation for image asset
        const imageAssetUrl = blobService.getUrlForPath(IMAGE_ASSETS.BOOK_COVER.unified);
        expect(imageAssetUrl).toBe(`${MOCK_BLOB_BASE_URL}/${IMAGE_ASSETS.BOOK_COVER.unified}`);
      });
    });

    test('handles URL cache control options correctly', () => {
      // Mock Date.now
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      try {
        const expectedUrl = `${MOCK_BLOB_BASE_URL}/${TEXT_ASSETS.BRAINROT_CHAPTER.unified}?_t=1234567890`;
        expect(
          blobService.getUrlForPath(TEXT_ASSETS.BRAINROT_CHAPTER.unified, { noCache: true }),
        ).toBe(expectedUrl);
      } finally {
        // Restore original Date.now
        Date.now = originalDateNow;
      }
    });

    test('successfully fetches text asset content', async () => {
      // Mock successful text response
      mockFetchImplementation.mockResolvedValueOnce(
        createSuccessResponse(TEXT_ASSETS.BRAINROT_CHAPTER.content, {
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      // Generate URL
      const textAssetUrl = blobService.getUrlForPath(TEXT_ASSETS.BRAINROT_CHAPTER.unified);

      // Fetch the text
      const result = await blobService.fetchText(textAssetUrl);

      // Verify
      expect(mockFetchImplementation).toHaveBeenCalledWith(textAssetUrl);
      expect(result).toBe(TEXT_ASSETS.BRAINROT_CHAPTER.content);
    });

    test('handles fetch errors correctly', async () => {
      // Mock error response - not found
      mockFetchImplementation.mockResolvedValueOnce(createErrorResponse(404, 'Not Found'));

      // Generate URL
      const textAssetUrl = blobService.getUrlForPath(TEXT_ASSETS.BRAINROT_CHAPTER.unified);

      // Attempt to fetch
      await expect(blobService.fetchText(textAssetUrl)).rejects.toThrow(
        'Failed to fetch text: HTTP error! Status: 404',
      );

      // Mock network error
      mockFetchImplementation.mockRejectedValueOnce(new Error('Network error'));

      // Attempt to fetch again
      await expect(blobService.fetchText(textAssetUrl)).rejects.toThrow(
        'Failed to fetch text: Network error',
      );
    });
  });

  describe('Backwards Compatibility', () => {
    test('legacy BlobPathService still works but produces old paths', () => {
      // Generate paths using legacy BlobPathService
      const legacyTextPath = blobPathService.getBrainrotTextPath(TEST_BOOKS.HAMLET, '1');
      const legacyAudioPath = blobPathService.getAudioPath(TEST_BOOKS.HAMLET, '3');
      const legacyImagePath = blobPathService.getBookImagePath(TEST_BOOKS.ODYSSEY, 'cover.jpg');

      // Verify the structure of the legacy paths
      expect(legacyTextPath).toContain('books/hamlet/text/brainrot');
      expect(legacyAudioPath).toContain('books/hamlet/audio');
      expect(legacyImagePath).toContain('books/the-odyssey/images');

      // Verify that AssetPathService can normalize these paths
      expect(assetPathService.convertLegacyPath(legacyTextPath)).toBe(
        TEXT_ASSETS.BRAINROT_CHAPTER.unified,
      );
      expect(assetPathService.convertLegacyPath(legacyAudioPath)).toBe(
        AUDIO_ASSETS.CHAPTER.unified,
      );
      expect(assetPathService.convertLegacyPath(legacyImagePath)).toBe(
        IMAGE_ASSETS.BOOK_COVER.unified,
      );
    });

    test('can extract book slugs from both old and new paths', () => {
      // Extract from unified path
      const bookSlugFromUnified = assetPathService.getBookSlugFromPath(
        TEXT_ASSETS.BRAINROT_CHAPTER.unified,
      );
      expect(bookSlugFromUnified).toBe(TEST_BOOKS.HAMLET);

      // Extract from legacy path
      const bookSlugFromLegacy = assetPathService.getBookSlugFromPath(
        TEXT_ASSETS.BRAINROT_CHAPTER.legacy,
      );
      expect(bookSlugFromLegacy).toBe(TEST_BOOKS.HAMLET);

      // Extract using legacy BlobPathService
      const bookSlugFromLegacyService = blobPathService.getBookSlugFromPath(
        TEXT_ASSETS.BRAINROT_CHAPTER.legacy,
      );
      expect(bookSlugFromLegacyService).toBe(TEST_BOOKS.HAMLET);
    });
  });

  describe('File Integrity and Metadata', () => {
    test('verifies content type of fetched assets', async () => {
      // Mock head response for text asset
      const { head } = require('@vercel/blob');
      head.mockResolvedValueOnce({
        url: `${MOCK_BLOB_BASE_URL}/${TEXT_ASSETS.BRAINROT_CHAPTER.unified}`,
        pathname: TEXT_ASSETS.BRAINROT_CHAPTER.unified,
        contentType: 'text/plain',
        contentLength: TEXT_ASSETS.BRAINROT_CHAPTER.content.length,
      });

      // Get file info
      const textFileInfo = await blobService.getFileInfo(
        `${MOCK_BLOB_BASE_URL}/${TEXT_ASSETS.BRAINROT_CHAPTER.unified}`,
      );

      // Verify content type
      expect(textFileInfo.contentType).toBe('text/plain');

      // Mock head response for audio asset
      head.mockResolvedValueOnce({
        url: `${MOCK_BLOB_BASE_URL}/${AUDIO_ASSETS.CHAPTER.unified}`,
        pathname: AUDIO_ASSETS.CHAPTER.unified,
        contentType: 'audio/mpeg',
        contentLength: 1024, // Mock file size
      });

      // Get file info
      const audioFileInfo = await blobService.getFileInfo(
        `${MOCK_BLOB_BASE_URL}/${AUDIO_ASSETS.CHAPTER.unified}`,
      );

      // Verify content type
      expect(audioFileInfo.contentType).toBe('audio/mpeg');
    });
  });
});
