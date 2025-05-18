import { AssetPathService } from '@/utils/services/AssetPathService';
import { AssetNameValidator } from '@/utils/validators/AssetNameValidator';

describe('AssetNameValidator - standardizeChapterIdentifier', () => {
  const validator = new AssetNameValidator();

  describe('standard formats', () => {
    it('should handle already standardized formats', () => {
      expect(validator.standardizeChapterIdentifier('brainrot-chapter-01.txt')).toBe(
        'brainrot-chapter-01.txt'
      );
      expect(validator.standardizeChapterIdentifier('brainrot-act-05.txt')).toBe(
        'brainrot-act-05.txt'
      );
      expect(validator.standardizeChapterIdentifier('brainrot-part-03.txt')).toBe(
        'brainrot-part-03.txt'
      );
    });

    it('should handle special cases', () => {
      expect(validator.standardizeChapterIdentifier('fulltext')).toBe('brainrot-fulltext.txt');
      expect(validator.standardizeChapterIdentifier('brainrot-fulltext')).toBe(
        'brainrot-fulltext.txt'
      );
      expect(validator.standardizeChapterIdentifier('prologue')).toBe('brainrot-prologue.txt');
      expect(validator.standardizeChapterIdentifier('epilogue')).toBe('brainrot-epilogue.txt');
    });
  });

  describe('chapter variations', () => {
    it('should convert chapter-XX formats', () => {
      expect(validator.standardizeChapterIdentifier('chapter-01')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('chapter-1')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('chapter-15')).toBe('brainrot-chapter-15.txt');
    });

    it('should convert Roman numerals', () => {
      expect(validator.standardizeChapterIdentifier('chapter-i')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('chapter-v')).toBe('brainrot-chapter-05.txt');
      expect(validator.standardizeChapterIdentifier('chapter-xv')).toBe('brainrot-chapter-15.txt');
    });

    it('should handle capitalized formats', () => {
      expect(validator.standardizeChapterIdentifier('Chapter 1')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('ACT 3')).toBe('brainrot-act-03.txt');
    });

    it('should handle just numbers', () => {
      expect(validator.standardizeChapterIdentifier('1')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('01')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('15')).toBe('brainrot-chapter-15.txt');
    });

    it('should handle Roman numerals only', () => {
      expect(validator.standardizeChapterIdentifier('i')).toBe('brainrot-chapter-01.txt');
      expect(validator.standardizeChapterIdentifier('v')).toBe('brainrot-chapter-05.txt');
      expect(validator.standardizeChapterIdentifier('xliii')).toBe('brainrot-chapter-43.txt');
    });
  });

  describe('act variations', () => {
    it('should convert act formats', () => {
      expect(validator.standardizeChapterIdentifier('act-01')).toBe('brainrot-act-01.txt');
      expect(validator.standardizeChapterIdentifier('act-1')).toBe('brainrot-act-01.txt');
      expect(validator.standardizeChapterIdentifier('act-v')).toBe('brainrot-act-05.txt');
    });

    it('should handle underscore separators', () => {
      expect(validator.standardizeChapterIdentifier('act_01')).toBe('brainrot-act-01.txt');
      expect(validator.standardizeChapterIdentifier('chapter_02')).toBe('brainrot-chapter-02.txt');
    });
  });

  describe('part and scene variations', () => {
    it('should convert part formats', () => {
      expect(validator.standardizeChapterIdentifier('part-01')).toBe('brainrot-part-01.txt');
      expect(validator.standardizeChapterIdentifier('part-1')).toBe('brainrot-part-01.txt');
    });

    it('should convert scene formats', () => {
      expect(validator.standardizeChapterIdentifier('scene-01')).toBe('brainrot-scene-01.txt');
      expect(validator.standardizeChapterIdentifier('scene-1')).toBe('brainrot-scene-01.txt');
    });
  });

  describe('edge cases', () => {
    it('should handle files with .txt extension', () => {
      expect(validator.standardizeChapterIdentifier('chapter-1.txt')).toBe(
        'brainrot-chapter-01.txt'
      );
      expect(validator.standardizeChapterIdentifier('act-v.txt')).toBe('brainrot-act-05.txt');
    });

    it('should handle unrecognized formats', () => {
      expect(validator.standardizeChapterIdentifier('unknown-format')).toBe(
        'brainrot-unknown-format.txt'
      );
      expect(validator.standardizeChapterIdentifier('custom')).toBe('brainrot-custom.txt');
    });
  });

  describe('parseNumber', () => {
    it('should parse Arabic numerals', () => {
      // Access through a public method that uses parseNumber
      expect(validator.formatChapterNumber('1')).toBe('01');
      expect(validator.formatChapterNumber('15')).toBe('15');
      expect(validator.formatChapterNumber('99')).toBe('99');
    });

    it('should parse Roman numerals from mapping', () => {
      expect(validator.formatChapterNumber('i')).toBe('01');
      expect(validator.formatChapterNumber('v')).toBe('05');
      expect(validator.formatChapterNumber('xliii')).toBe('43');
    });
  });
});

describe('AssetPathService - convertLegacyPath with text standardization', () => {
  const service = new AssetPathService();

  describe('text file path conversions', () => {
    it('should standardize Huckleberry Finn paths', () => {
      expect(
        service.convertLegacyPath('/assets/the-adventures-of-huckleberry-finn/text/chapter-i.txt')
      ).toBe('assets/text/huckleberry-finn/brainrot-chapter-01.txt');
      expect(
        service.convertLegacyPath(
          'books/the-adventures-of-huckleberry-finn/text/brainrot/chapter-1.txt'
        )
      ).toBe('assets/text/huckleberry-finn/brainrot-chapter-01.txt');
    });

    it('should standardize Hamlet paths', () => {
      expect(service.convertLegacyPath('/assets/hamlet/text/act-1.txt')).toBe(
        'assets/text/hamlet/brainrot-act-01.txt'
      );
      expect(service.convertLegacyPath('books/hamlet/text/brainrot/act-05.txt')).toBe(
        'assets/text/hamlet/brainrot-act-05.txt'
      );
    });

    it('should handle various path patterns', () => {
      // Direct text path
      expect(service.convertLegacyPath('the-iliad/text/chapter-1.txt')).toBe(
        'assets/text/the-iliad/brainrot-chapter-01.txt'
      );

      // Assets prefix with text subdirectory
      expect(service.convertLegacyPath('assets/the-odyssey/text/chapter-v.txt')).toBe(
        'assets/text/the-odyssey/brainrot-chapter-05.txt'
      );

      // Already partially standardized
      expect(service.convertLegacyPath('assets/text/the-aeneid/brainrot/chapter-10.txt')).toBe(
        'assets/text/the-aeneid/brainrot-chapter-10.txt'
      );
    });

    it('should handle Roman numerals in filenames', () => {
      expect(service.convertLegacyPath('/assets/hamlet/text/act-i.txt')).toBe(
        'assets/text/hamlet/brainrot-act-01.txt'
      );
      expect(service.convertLegacyPath('/assets/hamlet/text/act-v.txt')).toBe(
        'assets/text/hamlet/brainrot-act-05.txt'
      );
    });

    it('should handle special files', () => {
      expect(service.convertLegacyPath('/assets/the-raven/text/fulltext.txt')).toBe(
        'assets/text/the-raven/brainrot-fulltext.txt'
      );
      expect(service.convertLegacyPath('/assets/some-book/text/prologue.txt')).toBe(
        'assets/text/some-book/brainrot-prologue.txt'
      );
    });

    it('should handle numeric-only filenames', () => {
      expect(service.convertLegacyPath('books/huckleberry-finn/text/brainrot/1.txt')).toBe(
        'assets/text/huckleberry-finn/brainrot-chapter-01.txt'
      );
      expect(service.convertLegacyPath('books/huckleberry-finn/text/brainrot/15.txt')).toBe(
        'assets/text/huckleberry-finn/brainrot-chapter-15.txt'
      );
    });
  });

  describe('book slug normalization', () => {
    it('should normalize book slugs during conversion', () => {
      expect(
        service.convertLegacyPath('/assets/the-adventures-of-huckleberry-finn/text/chapter-1.txt')
      ).toBe('assets/text/huckleberry-finn/brainrot-chapter-01.txt');
      expect(
        service.convertLegacyPath('/assets/the-declaration-of-independence/text/fulltext.txt')
      ).toBe('assets/text/the-declaration/brainrot-fulltext.txt');
    });
  });

  describe('non-text paths', () => {
    it('should not affect audio paths', () => {
      expect(service.convertLegacyPath('/assets/the-iliad/audio/chapter-01.mp3')).toBe(
        'assets/audio/the-iliad/chapter-01.mp3'
      );
    });

    it('should not affect image paths', () => {
      expect(service.convertLegacyPath('/assets/the-odyssey/images/cover.jpg')).toBe(
        'assets/image/the-odyssey/cover.jpg'
      );
    });
  });
});
