// Use TypeScript imports to ensure proper typing
import { AssetType } from '../../types/assets.js';
import { AssetPathService } from '../../utils/services/AssetPathService.js';

// Mock modules that are used in the script
jest.mock('@vercel/blob', () => ({
  list: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
  head: jest.fn(),
}));

jest.mock('../../utils/logger.js', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    level: 'info',
  }),
}));

describe('Blob Path Reorganization Tool', () => {
  let assetPathService: AssetPathService;

  beforeEach(() => {
    assetPathService = new AssetPathService();
  });

  // Test path mapping for different asset types
  describe('Path Mapping', () => {
    // Test book images path mapping
    test('should correctly map book image paths', () => {
      const originalPath = 'books/the-iliad/images/cover.jpg';
      const expectedPath = 'assets/image/the-iliad/cover.jpg';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test audio path mapping
    test('should correctly map audio paths', () => {
      const originalPath = 'books/the-iliad/audio/01.mp3';
      const expectedPath = 'assets/audio/the-iliad/chapter-01.mp3';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test direct audio path mapping
    test('should correctly map direct audio paths', () => {
      const originalPath = 'the-iliad/audio/01.mp3';
      const expectedPath = 'assets/audio/the-iliad/chapter-01.mp3';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test text path mapping
    test('should correctly map brainrot text paths', () => {
      const originalPath = 'books/the-iliad/text/brainrot/01.txt';
      const expectedPath = 'assets/text/the-iliad/brainrot-chapter-01.txt';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test fulltext path mapping
    test('should correctly map brainrot fulltext paths', () => {
      const originalPath = 'books/the-iliad/text/brainrot/fulltext.txt';
      const expectedPath = 'assets/text/the-iliad/brainrot-fulltext.txt';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test source text path mapping
    test('should correctly map source text paths', () => {
      const originalPath = 'books/the-iliad/text/source/chapter-01.txt';
      const expectedPath = 'assets/text/the-iliad/source-chapter-01.txt';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test shared images path mapping
    test('should correctly map shared image paths', () => {
      const originalPath = 'images/logo.png';
      const expectedPath = 'assets/shared/logo.png';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });

    // Test site assets path mapping
    test('should correctly map site asset paths', () => {
      const originalPath = 'site-assets/favicon.ico';
      const expectedPath = 'assets/site/favicon.ico';

      const mappedPath = assetPathService.convertLegacyPath(originalPath);
      expect(mappedPath).toBe(expectedPath);
    });
  });

  // Test book slug extraction
  describe('Book Slug Extraction', () => {
    // Test book slug extraction from book paths
    test('should extract book slug from books path', () => {
      const path = 'books/the-iliad/images/cover.jpg';
      const slug = assetPathService.getBookSlugFromPath(path);
      expect(slug).toBe('the-iliad');
    });

    // Test book slug extraction from direct audio paths
    test('should extract book slug from direct audio path', () => {
      const path = 'the-iliad/audio/01.mp3';
      const slug = assetPathService.getBookSlugFromPath(path);
      expect(slug).toBe('the-iliad');
    });

    // Test book slug extraction from new unified paths
    test('should extract book slug from new unified path', () => {
      const path = 'assets/audio/the-iliad/chapter-01.mp3';
      const slug = assetPathService.getBookSlugFromPath(path);
      expect(slug).toBe('the-iliad');
    });

    // Test null return for shared assets
    test('should return null for shared assets', () => {
      const path = 'assets/shared/logo.png';
      const slug = assetPathService.getBookSlugFromPath(path);
      expect(slug).toBeNull();
    });
  });

  // Test asset type determination
  describe('Asset Type Determination', () => {
    // Test book image as image asset type
    test('should identify books/*/images/* as image asset type', () => {
      const path = 'books/the-iliad/images/cover.jpg';
      expect(path.includes('/images/')).toBe(true);

      // This logic mimics what would be done in the migration tool
      let assetType: AssetType | 'shared' | 'site' | null = null;

      if (path.startsWith('books/')) {
        const parts = path.split('/');
        if (parts.length >= 3) {
          if (parts[2] === 'images') {
            assetType = AssetType.IMAGE;
          }
        }
      }

      expect(assetType).toBe(AssetType.IMAGE);
    });

    // Test audio path as audio asset type
    test('should identify books/*/audio/* as audio asset type', () => {
      const path = 'books/the-iliad/audio/01.mp3';
      expect(path.includes('/audio/')).toBe(true);

      let assetType: AssetType | 'shared' | 'site' | null = null;

      if (path.startsWith('books/')) {
        const parts = path.split('/');
        if (parts.length >= 3) {
          if (parts[2] === 'audio') {
            assetType = AssetType.AUDIO;
          }
        }
      }

      expect(assetType).toBe(AssetType.AUDIO);
    });

    // Test direct audio path as audio asset type
    test('should identify */audio/* as audio asset type', () => {
      const path = 'the-iliad/audio/01.mp3';

      let assetType: AssetType | 'shared' | 'site' | null = null;

      if (path.match(/^[^/]+\/audio\//)) {
        assetType = AssetType.AUDIO;
      }

      expect(assetType).toBe(AssetType.AUDIO);
    });

    // Test shared images as shared asset type
    test('should identify images/* as shared asset type', () => {
      const path = 'images/logo.png';

      let assetType: AssetType | 'shared' | 'site' | null = null;

      if (path.startsWith('images/')) {
        assetType = 'shared';
      }

      expect(assetType).toBe('shared');
    });

    // Test site assets as site asset type
    test('should identify site-assets/* as site asset type', () => {
      const path = 'site-assets/favicon.ico';

      let assetType: AssetType | 'shared' | 'site' | null = null;

      if (path.startsWith('site-assets/')) {
        assetType = 'site';
      }

      expect(assetType).toBe('site');
    });
  });
});
