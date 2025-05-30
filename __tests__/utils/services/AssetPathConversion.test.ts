import { AssetPathService } from '../../../utils/services/AssetPathService.js';

describe('AssetPathService - Path Conversion', () => {
  let service: AssetPathService;
  const TEST_BOOKS = {
    HAMLET: 'hamlet',
    ILIAD: 'the-iliad',
    ODYSSEY: 'the-odyssey',
  };

  beforeEach(() => {
    service = new AssetPathService();
  });

  describe('convertLegacyPath', () => {
    describe('Book Assets', () => {
      it('should convert books-prefixed image paths', () => {
        const legacy = 'books/the-iliad/images/cover.jpg';
        const unified = 'assets/image/the-iliad/cover.jpg';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });

      it('should convert books-prefixed audio paths', () => {
        const legacy = 'books/the-odyssey/audio/01.mp3';
        const unified = 'assets/audio/the-odyssey/chapter-01.mp3';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });

      it('should convert books-prefixed brainrot text paths', () => {
        const legacy = 'books/hamlet/text/brainrot/03.txt';
        const unified = 'assets/text/hamlet/brainrot-chapter-03.txt';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });

      it('should convert books-prefixed brainrot fulltext paths', () => {
        const legacy = 'books/macbeth/text/brainrot/fulltext.txt';
        const unified = 'assets/text/macbeth/brainrot-fulltext.txt';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });

      it('should convert books-prefixed source text paths', () => {
        const legacy = 'books/othello/text/source/introduction.txt';
        const unified = 'assets/text/othello/source-introduction.txt';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });
    });

    describe('Direct Paths', () => {
      it('should convert direct audio paths', () => {
        const legacy = 'the-iliad/audio/05.mp3';
        const unified = 'assets/audio/the-iliad/chapter-05.mp3';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });
    });

    describe('Shared and Site Assets', () => {
      it('should convert shared image paths', () => {
        const legacy = 'images/logo.png';
        const unified = 'assets/shared/logo.png';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });

      it('should convert site asset paths', () => {
        const legacy = 'site-assets/icon.svg';
        const unified = 'assets/site/icon.svg';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });
    });

    describe('Edge Cases', () => {
      it('should handle paths with leading slashes', () => {
        const legacy = '/the-iliad/audio/01.mp3';
        const unified = 'assets/audio/the-iliad/chapter-01.mp3';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });

      it('should handle unknown path formats by adding assets/ prefix', () => {
        const legacy = 'unknown/path/structure.txt';
        const unified = 'assets/unknown/path/structure.txt';
        expect(service.convertLegacyPath(legacy)).toBe(unified);
      });
    });
  });

  describe('getBookSlugFromPath', () => {
    it('should extract book slug from new unified paths', () => {
      const path = 'assets/audio/the-iliad/chapter-01.mp3';
      expect(service.getBookSlugFromPath(path)).toBe(TEST_BOOKS.ILIAD);
    });

    it('should extract book slug from books-prefixed paths', () => {
      const path = 'books/the-odyssey/audio/01.mp3';
      expect(service.getBookSlugFromPath(path)).toBe(TEST_BOOKS.ODYSSEY);
    });

    it('should extract book slug from direct paths', () => {
      const path = 'hamlet/audio/02.mp3';
      expect(service.getBookSlugFromPath(path)).toBe(TEST_BOOKS.HAMLET);
    });

    it('should extract book slug from legacy paths with assets/ prefix', () => {
      const path = 'assets/images/the-iliad/cover.jpg';
      expect(service.getBookSlugFromPath(path)).toBe(TEST_BOOKS.ILIAD);
    });

    it('should return null for paths without a book slug', () => {
      const path = 'assets/shared/logo.png';
      expect(service.getBookSlugFromPath(path)).toBeNull();
    });

    it('should handle paths with leading slashes', () => {
      const path = '/assets/audio/the-iliad/chapter-01.mp3';
      expect(service.getBookSlugFromPath(path)).toBe(TEST_BOOKS.ILIAD);
    });
  });
});
