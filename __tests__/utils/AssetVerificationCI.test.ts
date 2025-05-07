/**
 * Asset Verification CI Tests
 *
 * These tests are designed to run in CI environments where real Blob storage may not be available.
 * They use mocked responses and focus on path generation and URL construction without actual HTTP requests.
 */
import {
  AUDIO_ASSETS,
  IMAGE_ASSETS,
  MOCK_BLOB_BASE_URL,
  TEST_BOOKS,
  TEXT_ASSETS,
} from '../../__mocks__/assetFixtures';
import { AssetType } from '../../types/assets';
import { assetPathService } from '../../utils/services/AssetPathService';
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

// Skip actual fetch operations in CI
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  text: jest.fn().mockResolvedValue('Mock content'),
});

describe('Asset Verification CI Tests', () => {
  let blobService: BlobService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new BlobService instance
    blobService = new BlobService();

    // Set environment variables for testing
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = MOCK_BLOB_BASE_URL;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  });

  describe('Path Generation Regression Tests', () => {
    describe('Asset Type Path Structure', () => {
      test('text asset paths have consistent structure', () => {
        // Text asset path
        const textPath = assetPathService.getAssetPath(
          AssetType.TEXT,
          TEST_BOOKS.HAMLET,
          'test.txt'
        );
        expect(textPath).toMatch(/^assets\/text\/[^/]+\/[^/]+$/);
      });

      test('audio asset paths have consistent structure', () => {
        // Audio asset path
        const audioPath = assetPathService.getAssetPath(
          AssetType.AUDIO,
          TEST_BOOKS.ILIAD,
          'test.mp3'
        );
        expect(audioPath).toMatch(/^assets\/audio\/[^/]+\/[^/]+$/);
      });

      test('image asset paths have consistent structure', () => {
        // Image asset path
        const imagePath = assetPathService.getAssetPath(
          AssetType.IMAGE,
          TEST_BOOKS.ODYSSEY,
          'test.jpg'
        );
        expect(imagePath).toMatch(/^assets\/image\/[^/]+\/[^/]+$/);
      });

      test('shared and site asset paths have consistent structure', () => {
        // Shared asset path
        const sharedPath = assetPathService.getAssetPath('shared' as AssetType, null, 'test.png');
        expect(sharedPath).toMatch(/^assets\/shared\/[^/]+$/);

        // Site asset path
        const sitePath = assetPathService.getAssetPath('site' as AssetType, null, 'test.svg');
        expect(sitePath).toMatch(/^assets\/site\/[^/]+$/);
      });
    });

    describe('Chapter Numbering', () => {
      test('single-digit chapters are padded with zeros', () => {
        // Single-digit chapter number
        const singleDigitPath = assetPathService.getAudioPath(TEST_BOOKS.HAMLET, '1');
        expect(singleDigitPath).toContain('chapter-01.mp3');
      });

      test('double-digit chapters are formatted correctly', () => {
        // Double-digit chapter number
        const doubleDigitPath = assetPathService.getAudioPath(TEST_BOOKS.HAMLET, '12');
        expect(doubleDigitPath).toContain('chapter-12.mp3');
      });

      test('numeric chapter types are handled correctly', () => {
        // Number type
        const numberPath = assetPathService.getAudioPath(TEST_BOOKS.HAMLET, 5);
        expect(numberPath).toContain('chapter-05.mp3');
      });
    });

    describe('Brainrot Text Handling', () => {
      test('correctly creates chapter paths for brainrot text', () => {
        // Brainrot chapter
        const brainrotChapterPath = assetPathService.getBrainrotTextPath(TEST_BOOKS.HAMLET, '3');
        expect(brainrotChapterPath).toContain('brainrot-chapter-03.txt');
      });

      test('correctly handles fulltext keyword for brainrot text', () => {
        // Brainrot fulltext
        const brainrotFulltextPath = assetPathService.getBrainrotTextPath(
          TEST_BOOKS.HAMLET,
          'full'
        );
        expect(brainrotFulltextPath).toContain('brainrot-fulltext.txt');
      });

      test('handles fulltext alternate format for brainrot text', () => {
        // Also works with 'fulltext' keyword
        const brainrotFulltextAltPath = assetPathService.getBrainrotTextPath(
          TEST_BOOKS.HAMLET,
          'fulltext'
        );
        expect(brainrotFulltextAltPath).toContain('brainrot-fulltext.txt');
      });
    });
  });

  describe('Legacy Path Conversion Tests', () => {
    test('converts all legacy path formats correctly', () => {
      // Test all path types from fixtures
      Object.values(TEXT_ASSETS).forEach((asset) => {
        expect(assetPathService.convertLegacyPath(asset.legacy)).toBe(asset.unified);
      });

      Object.values(AUDIO_ASSETS).forEach((asset) => {
        expect(assetPathService.convertLegacyPath(asset.legacy)).toBe(asset.unified);
      });

      Object.values(IMAGE_ASSETS).forEach((asset) => {
        expect(assetPathService.convertLegacyPath(asset.legacy)).toBe(asset.unified);
      });
    });

    test('handles paths with leading slashes', () => {
      // With leading slash
      const pathWithSlash = `/${TEXT_ASSETS.BRAINROT_CHAPTER.legacy}`;
      expect(assetPathService.convertLegacyPath(pathWithSlash)).toBe(
        TEXT_ASSETS.BRAINROT_CHAPTER.unified
      );

      // With multiple leading slashes
      const pathWithMultipleSlashes = `/////${AUDIO_ASSETS.CHAPTER.legacy}`;
      expect(assetPathService.convertLegacyPath(pathWithMultipleSlashes)).toBe(
        AUDIO_ASSETS.CHAPTER.unified
      );
    });

    test('handles unknown path formats gracefully', () => {
      // Completely unknown format
      const unknownPath = 'unknown/path/format/test.txt';
      const convertedPath = assetPathService.convertLegacyPath(unknownPath);
      expect(convertedPath).toContain('assets/');

      // Partly recognizable format
      const partialPath = 'books/hamlet/unknown/test.txt';
      const convertedPartialPath = assetPathService.convertLegacyPath(partialPath);
      expect(convertedPartialPath).toContain('assets/');
      expect(convertedPartialPath).toContain('hamlet');
    });
  });

  describe('URL Generation Tests', () => {
    test('constructs URLs with correct base URL', () => {
      // Standard URL generation
      const url = blobService.getUrlForPath(TEXT_ASSETS.BRAINROT_CHAPTER.unified);
      expect(url).toBe(`${MOCK_BLOB_BASE_URL}/${TEXT_ASSETS.BRAINROT_CHAPTER.unified}`);

      // With custom base URL
      const customUrl = blobService.getUrlForPath(AUDIO_ASSETS.CHAPTER.unified, {
        baseUrl: 'https://custom-cdn.example.com',
      });
      expect(customUrl).toBe(`https://custom-cdn.example.com/${AUDIO_ASSETS.CHAPTER.unified}`);

      // With default base URL (when env var not set)
      delete process.env.NEXT_PUBLIC_BLOB_BASE_URL;
      const defaultUrl = blobService.getUrlForPath(IMAGE_ASSETS.BOOK_COVER.unified);
      expect(defaultUrl).toBe(
        `https://public.blob.vercel-storage.com/${IMAGE_ASSETS.BOOK_COVER.unified}`
      );
    });

    test('handles paths with special characters in URLs', () => {
      // Path with spaces
      const pathWithSpaces = 'assets/text/hamlet/file with spaces.txt';
      const urlWithSpaces = blobService.getUrlForPath(pathWithSpaces);
      // The URL should not have encoded spaces at this point as fetch will handle that
      expect(urlWithSpaces).toBe(`${MOCK_BLOB_BASE_URL}/${pathWithSpaces}`);

      // Path with special characters
      const pathWithSpecialChars = 'assets/text/hamlet/special&chars!.txt';
      const urlWithSpecialChars = blobService.getUrlForPath(pathWithSpecialChars);
      expect(urlWithSpecialChars).toBe(`${MOCK_BLOB_BASE_URL}/${pathWithSpecialChars}`);
    });
  });
});
