import { AssetType } from '@/types/assets';
import { AssetNameValidator } from '@/utils/validators/AssetNameValidator';

describe('AssetNameValidator', () => {
  let validator: AssetNameValidator;

  beforeEach(() => {
    validator = new AssetNameValidator();
  });

  describe('validateAssetName', () => {
    test('should throw error for empty asset names', () => {
      expect(() => validator.validateAssetName(AssetType.AUDIO, '')).toThrow(
        'Asset name cannot be empty'
      );
    });

    test('should throw error for unsupported asset types', () => {
      // Using type assertion to create an invalid type for testing
      const invalidType = 'invalid' as unknown as AssetType;
      expect(() => validator.validateAssetName(invalidType, 'test.jpg')).toThrow(
        'Unsupported asset type'
      );
    });

    test('should delegate to the correct validator based on asset type', () => {
      // Mock the specialized validators
      jest.spyOn(validator, 'validateAudioAssetName').mockReturnValue('audio-result.mp3');
      jest.spyOn(validator, 'validateTextAssetName').mockReturnValue('text-result.txt');
      jest.spyOn(validator, 'validateImageAssetName').mockReturnValue('image-result.jpg');

      // Verify correct delegation
      expect(validator.validateAssetName(AssetType.AUDIO, 'test.mp3')).toBe('audio-result.mp3');
      expect(validator.validateAssetName(AssetType.TEXT, 'test.txt')).toBe('text-result.txt');
      expect(validator.validateAssetName(AssetType.IMAGE, 'test.jpg')).toBe('image-result.jpg');

      // Verify each validator was called with the correct arguments
      expect(validator.validateAudioAssetName).toHaveBeenCalledWith('test.mp3');
      expect(validator.validateTextAssetName).toHaveBeenCalledWith('test.txt');
      expect(validator.validateImageAssetName).toHaveBeenCalledWith('test.jpg');
    });
  });

  describe('validateAudioAssetName', () => {
    test('accepts valid full audiobook', () => {
      expect(validator.validateAudioAssetName('full-audiobook.mp3')).toBe('full-audiobook.mp3');
    });

    test('accepts valid chapter formats', () => {
      expect(validator.validateAudioAssetName('chapter-01.mp3')).toBe('chapter-01.mp3');
      expect(validator.validateAudioAssetName('chapter-10.mp3')).toBe('chapter-10.mp3');
    });

    test('converts legacy book-XX format', () => {
      expect(validator.validateAudioAssetName('book-1.mp3')).toBe('chapter-01.mp3');
      expect(validator.validateAudioAssetName('book-10.mp3')).toBe('chapter-10.mp3');
    });

    test('converts simple numeric format', () => {
      expect(validator.validateAudioAssetName('1.mp3')).toBe('chapter-01.mp3');
      expect(validator.validateAudioAssetName('10.mp3')).toBe('chapter-10.mp3');
    });

    test('handles legacy slug-based names', () => {
      expect(validator.validateAudioAssetName('hamlet-chapter-1.mp3')).toBe('chapter-01.mp3');
      expect(validator.validateAudioAssetName('the-odyssey-chapter-10.mp3')).toBe('chapter-10.mp3');
    });

    test('throws error for invalid names', () => {
      expect(() => validator.validateAudioAssetName('invalid.mp3')).toThrow(
        'Invalid audio asset name'
      );
      expect(() => validator.validateAudioAssetName('chapter.mp3')).toThrow(
        'Invalid audio asset name'
      );
      expect(() => validator.validateAudioAssetName('audio.wav')).toThrow(
        'Invalid audio asset name'
      );
    });
  });

  describe('validateTextAssetName', () => {
    test('should accept valid fulltext formats', () => {
      expect(validator.validateTextAssetName('fulltext.txt')).toBe('fulltext.txt');
      expect(validator.validateTextAssetName('brainrot-fulltext.txt')).toBe(
        'brainrot-fulltext.txt'
      );
      expect(validator.validateTextAssetName('source-fulltext.txt')).toBe('source-fulltext.txt');
    });

    test('should accept valid chapter formats', () => {
      expect(validator.validateTextAssetName('chapter-01.txt')).toBe('chapter-01.txt');
      expect(validator.validateTextAssetName('brainrot-chapter-01.txt')).toBe(
        'brainrot-chapter-01.txt'
      );
      expect(validator.validateTextAssetName('source-chapter-01.txt')).toBe(
        'source-chapter-01.txt'
      );
    });

    test('should accept valid source custom formats', () => {
      expect(validator.validateTextAssetName('source-introduction.txt')).toBe(
        'source-introduction.txt'
      );
      expect(validator.validateTextAssetName('source-translators-note.txt')).toBe(
        'source-translators-note.txt'
      );
    });

    test('should convert legacy brainrot path format', () => {
      expect(validator.validateTextAssetName('brainrot/1.txt')).toBe('brainrot-chapter-01.txt');
      expect(validator.validateTextAssetName('brainrot/10.txt')).toBe('brainrot-chapter-10.txt');
    });

    test('should convert legacy source path format', () => {
      expect(validator.validateTextAssetName('source/1.txt')).toBe('source-chapter-01.txt');
      expect(validator.validateTextAssetName('source/introduction.txt')).toBe(
        'source-introduction.txt'
      );
    });

    test('should convert simple numeric format', () => {
      expect(validator.validateTextAssetName('1.txt')).toBe('chapter-01.txt');
      expect(validator.validateTextAssetName('10.txt')).toBe('chapter-10.txt');
    });

    test('should throw error for invalid text asset names', () => {
      expect(() => validator.validateTextAssetName('invalid.doc')).toThrow(
        'Invalid text asset name'
      );
      expect(() => validator.validateTextAssetName('chapter.txt')).toThrow(
        'Invalid text asset name'
      );
    });
  });

  describe('validateImageAssetName', () => {
    test('should accept valid cover images', () => {
      expect(validator.validateImageAssetName('cover.jpg')).toBe('cover.jpg');
      expect(validator.validateImageAssetName('cover.png')).toBe('cover.png');
    });

    test('should accept valid thumbnail images', () => {
      expect(validator.validateImageAssetName('thumbnail.jpg')).toBe('thumbnail.jpg');
      expect(validator.validateImageAssetName('thumbnail.webp')).toBe('thumbnail.webp');
    });

    test('should accept valid chapter images', () => {
      expect(validator.validateImageAssetName('chapter-01.jpg')).toBe('chapter-01.jpg');
      expect(validator.validateImageAssetName('chapter-10.png')).toBe('chapter-10.png');
    });

    test('should allow other book-specific images with valid extensions', () => {
      expect(validator.validateImageAssetName('title-page.jpg')).toBe('title-page.jpg');
      expect(validator.validateImageAssetName('introduction-illustration.png')).toBe(
        'introduction-illustration.png'
      );
    });

    test('should convert simple numeric format to chapter format', () => {
      expect(validator.validateImageAssetName('1.jpg')).toBe('chapter-01.jpg');
      expect(validator.validateImageAssetName('10.png')).toBe('chapter-10.png');
    });

    test('should throw error for invalid image asset names', () => {
      expect(() => validator.validateImageAssetName('image.tiff')).toThrow(
        'Invalid image asset name'
      );
      expect(() => validator.validateImageAssetName('chapter.gif')).toThrow(
        'Invalid image asset name'
      );
    });
  });

  describe('formatChapterNumber', () => {
    test('should pad single-digit numbers to two digits', () => {
      expect(validator.formatChapterNumber(1)).toBe('01');
      expect(validator.formatChapterNumber('2')).toBe('02');
      expect(validator.formatChapterNumber('9')).toBe('09');
    });

    test('should leave double-digit numbers unchanged', () => {
      expect(validator.formatChapterNumber(10)).toBe('10');
      expect(validator.formatChapterNumber('20')).toBe('20');
      expect(validator.formatChapterNumber('99')).toBe('99');
    });

    test('should handle non-numeric strings without modification', () => {
      expect(validator.formatChapterNumber('introduction')).toBe('introduction');
      expect(validator.formatChapterNumber('appendix')).toBe('appendix');
    });

    test('should handle already padded numbers correctly', () => {
      expect(validator.formatChapterNumber('01')).toBe('01');
      expect(validator.formatChapterNumber('09')).toBe('09');
    });
  });
});
