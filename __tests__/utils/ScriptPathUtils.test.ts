import { AssetType } from '../../types/assets';
import {
  extractAssetInfo,
  generateAssetUrl,
  generateBlobPath,
  generateFilename,
  getFileExtension,
  isLegacyPath,
  normalizePath,
} from '../../utils/ScriptPathUtils';

describe('ScriptPathUtils', () => {
  describe('normalizePath', () => {
    test('should convert legacy paths to standardized format', () => {
      // Legacy path patterns
      expect(normalizePath('/assets/hamlet/images/cover.jpg')).toBe(
        'assets/image/hamlet/cover.jpg',
      );
      expect(normalizePath('books/hamlet/images/cover.jpg')).toBe('assets/image/hamlet/cover.jpg');
      expect(normalizePath('/assets/hamlet/audio/chapter-01.mp3')).toBe(
        'assets/audio/hamlet/chapter-01.mp3',
      );
      expect(
        normalizePath('/assets/the-adventures-of-huckleberry-finn/text/brainrot/chapter-01.txt'),
      ).toBe('assets/text/huckleberry-finn/brainrot-chapter-01.txt');
    });

    test('should handle paths that are already standardized', () => {
      // Already standardized paths
      expect(normalizePath('assets/audio/hamlet/chapter-01.mp3')).toBe(
        'assets/audio/hamlet/chapter-01.mp3',
      );
      expect(normalizePath('assets/text/the-iliad/brainrot-chapter-01.txt')).toBe(
        'assets/text/the-iliad/brainrot-chapter-01.txt',
      );
      expect(normalizePath('assets/image/the-odyssey/cover.jpg')).toBe(
        'assets/image/the-odyssey/cover.jpg',
      );
    });

    test('should handle special case paths', () => {
      // Special cases
      expect(normalizePath('images/shared-icon.png')).toBe('assets/shared/shared-icon.png');
      expect(normalizePath('site-assets/logo.svg')).toBe('assets/site/logo.svg');
      expect(normalizePath('/assets/covers/placeholder.jpg')).toBe('assets/shared/placeholder.jpg');
    });
  });

  describe('extractAssetInfo', () => {
    test('should extract correct information from book-specific assets', () => {
      // Book-specific asset
      const info = extractAssetInfo('/assets/hamlet/audio/chapter-01.mp3');
      expect(info).toEqual({
        originalPath: '/assets/hamlet/audio/chapter-01.mp3',
        normalizedPath: 'assets/audio/hamlet/chapter-01.mp3',
        assetType: 'audio',
        bookSlug: 'hamlet',
        filename: 'chapter-01.mp3',
        isLegacyFormat: true,
        chapterNumber: '01',
        metadata: {
          assetCategory: 'chapter',
        },
      });
    });

    test('should extract correct information from standardized paths', () => {
      // Standardized path
      const info = extractAssetInfo('assets/text/the-iliad/brainrot-chapter-01.txt');
      expect(info).toEqual({
        originalPath: 'assets/text/the-iliad/brainrot-chapter-01.txt',
        normalizedPath: 'assets/text/the-iliad/brainrot-chapter-01.txt',
        assetType: 'text',
        bookSlug: 'the-iliad',
        filename: 'brainrot-chapter-01.txt',
        isLegacyFormat: false,
        chapterNumber: '01',
        metadata: {
          assetCategory: 'brainrot',
        },
      });
    });

    test('should extract correct information from shared assets', () => {
      // Shared asset
      const info = extractAssetInfo('assets/shared/placeholder.jpg');
      expect(info).toEqual({
        originalPath: 'assets/shared/placeholder.jpg',
        normalizedPath: 'assets/shared/placeholder.jpg',
        assetType: 'shared',
        bookSlug: null,
        filename: 'placeholder.jpg',
        isLegacyFormat: false,
        metadata: {
          assetCategory: 'shared',
        },
      });
    });

    test('should handle legacy path formats with books prefix', () => {
      // Legacy path with books prefix
      const info = extractAssetInfo('books/the-odyssey/images/cover.jpg');
      expect(info).toEqual({
        originalPath: 'books/the-odyssey/images/cover.jpg',
        normalizedPath: 'assets/image/the-odyssey/cover.jpg',
        assetType: 'image',
        bookSlug: 'the-odyssey',
        filename: 'cover.jpg',
        isLegacyFormat: true,
        metadata: {
          assetCategory: 'cover',
        },
      });
    });
  });

  describe('generateBlobPath', () => {
    test('should generate correct blob paths for book assets', () => {
      expect(generateBlobPath('hamlet', AssetType.AUDIO, 'chapter-01.mp3')).toBe(
        'assets/audio/hamlet/chapter-01.mp3',
      );
      expect(generateBlobPath('the-iliad', AssetType.TEXT, 'brainrot-chapter-01.txt')).toBe(
        'assets/text/the-iliad/brainrot-chapter-01.txt',
      );
      expect(generateBlobPath('the-odyssey', AssetType.IMAGE, 'cover.jpg')).toBe(
        'assets/image/the-odyssey/cover.jpg',
      );
    });

    test('should handle shared and site assets', () => {
      expect(generateBlobPath(null, 'shared', 'placeholder.jpg')).toBe(
        'assets/shared/placeholder.jpg',
      );
      expect(generateBlobPath(null, 'site', 'logo.svg')).toBe('assets/site/logo.svg');
    });
  });

  describe('generateAssetUrl', () => {
    test('should generate URLs with the default base URL', () => {
      // Mock env variable
      const originalEnv = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://example.blob.vercel-storage.com';

      expect(generateAssetUrl('assets/audio/hamlet/chapter-01.mp3')).toBe(
        'https://example.blob.vercel-storage.com/assets/audio/hamlet/chapter-01.mp3',
      );

      // Restore original env
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = originalEnv;
    });

    test('should generate URLs with a custom base URL', () => {
      expect(
        generateAssetUrl('assets/audio/hamlet/chapter-01.mp3', {
          baseUrl: 'https://custom.example.com',
        }),
      ).toBe('https://custom.example.com/assets/audio/hamlet/chapter-01.mp3');
    });

    test('should handle legacy paths by normalizing them', () => {
      // Mock env variable
      const originalEnv = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://example.blob.vercel-storage.com';

      expect(generateAssetUrl('/assets/hamlet/audio/chapter-01.mp3')).toBe(
        'https://example.blob.vercel-storage.com/assets/audio/hamlet/chapter-01.mp3',
      );

      // Restore original env
      process.env.NEXT_PUBLIC_BLOB_BASE_URL = originalEnv;
    });
  });

  describe('isLegacyPath', () => {
    test('should correctly identify legacy paths', () => {
      expect(isLegacyPath('/assets/hamlet/audio/chapter-01.mp3')).toBe(true);
      expect(isLegacyPath('books/the-odyssey/images/cover.jpg')).toBe(true);
      expect(isLegacyPath('hamlet/text/brainrot/chapter-01.txt')).toBe(true);
    });

    test('should correctly identify standardized paths', () => {
      expect(isLegacyPath('assets/audio/hamlet/chapter-01.mp3')).toBe(false);
      expect(isLegacyPath('assets/text/the-iliad/brainrot-chapter-01.txt')).toBe(false);
      expect(isLegacyPath('assets/image/the-odyssey/cover.jpg')).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    test('should return the correct extension for asset types', () => {
      expect(getFileExtension(AssetType.AUDIO)).toBe('mp3');
      expect(getFileExtension(AssetType.TEXT)).toBe('txt');
      expect(getFileExtension(AssetType.IMAGE, 'cover')).toBe('jpg');
      expect(getFileExtension(AssetType.IMAGE, 'misc')).toBe('png');
    });
  });

  describe('generateFilename', () => {
    test('should generate standardized filenames for chapter assets', () => {
      expect(generateFilename(AssetType.AUDIO, 1)).toBe('chapter-01.mp3');
      expect(generateFilename(AssetType.AUDIO, '1')).toBe('chapter-01.mp3');
      expect(generateFilename(AssetType.AUDIO, 10)).toBe('chapter-10.mp3');
    });

    test('should generate filenames with custom prefixes', () => {
      expect(generateFilename(AssetType.TEXT, 1, { prefix: 'brainrot' })).toBe(
        'brainrot-chapter-01.txt',
      );
      expect(generateFilename(AssetType.TEXT, 'full', { prefix: 'brainrot' })).toBe(
        'brainrot-fulltext.txt',
      );
    });

    test('should handle special cases like covers and full assets', () => {
      expect(generateFilename(AssetType.IMAGE, 'cover')).toBe('cover.jpg');
      expect(generateFilename(AssetType.AUDIO, 'full')).toBe('full-audiobook.mp3');
      expect(generateFilename(AssetType.TEXT, 'full')).toBe('fulltext.txt');
    });
  });
});
