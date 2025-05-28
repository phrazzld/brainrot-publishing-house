/**
 * AssetNameValidator
 *
 * Validates and standardizes asset names according to the project's naming conventions.
 * This ensures consistency across all asset types and prevents naming-related issues.
 */
import { AssetType } from '@/types/assets';

/**
 * Validates and enforces standard asset naming conventions
 */
export class AssetNameValidator {
  // Roman to Arabic numeral mapping
  private readonly ROMAN_TO_ARABIC: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
    xi: 11,
    xii: 12,
    xiii: 13,
    xiv: 14,
    xv: 15,
    xvi: 16,
    xvii: 17,
    xviii: 18,
    xix: 19,
    xx: 20,
    xxi: 21,
    xxii: 22,
    xxiii: 23,
    xxiv: 24,
    xxv: 25,
    xxvi: 26,
    xxvii: 27,
    xxviii: 28,
    xxix: 29,
    xxx: 30,
    xxxi: 31,
    xxxii: 32,
    xxxiii: 33,
    xxxiv: 34,
    xxxv: 35,
    xxxvi: 36,
    xxxvii: 37,
    xxxviii: 38,
    xxxix: 39,
    xl: 40,
    xli: 41,
    xlii: 42,
    xliii: 43,
    xliv: 44,
    xlv: 45,
  };
  /**
   * Validates and normalizes an asset name according to type-specific conventions
   * @param assetType The type of asset (audio, text, image)
   * @param assetName The name to validate
   * @returns The validated and possibly normalized asset name
   * @throws Error if the asset name doesn't follow conventions and can't be normalized
   */
  validateAssetName(assetType: AssetType, assetName: string): string {
    if (!assetName) {
      throw new Error('Asset name cannot be empty');
    }

    switch (assetType) {
      case AssetType.AUDIO:
        return this.validateAudioAssetName(assetName);
      case AssetType.TEXT:
        return this.validateTextAssetName(assetName);
      case AssetType.IMAGE:
        return this.validateImageAssetName(assetName);
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }
  }

  /**
   * Validates audio asset names
   * Valid formats:
   * - full-audiobook.mp3
   * - chapter-XX.mp3 (where XX is a padded number)
   *
   * @param assetName The audio asset name
   * @returns Standardized asset name
   */
  validateAudioAssetName(assetName: string): string {
    // Check for full audiobook
    if (assetName === 'full-audiobook.mp3') {
      return assetName;
    }

    // Check for chapter-XX.mp3 format
    const chapterRegex = /^chapter-(\d{2})\.mp3$/;
    if (chapterRegex.test(assetName)) {
      return assetName;
    }

    // Legacy format: book-XX.mp3 - convert to standardized format
    const bookRegex = /^book-(\d+)\.mp3$/;
    const bookMatch = assetName.match(bookRegex);
    if (bookMatch) {
      const chapter = this.formatChapterNumber(bookMatch[1]);
      return `chapter-${chapter}.mp3`;
    }

    // Legacy format: just a number 1.mp3, 2.mp3, etc.
    const numericRegex = /^(\d+)\.mp3$/;
    const numericMatch = assetName.match(numericRegex);
    if (numericMatch) {
      const chapter = this.formatChapterNumber(numericMatch[1]);
      return `chapter-${chapter}.mp3`;
    }

    // Handle other patterns that might be specific to test files
    // Legacy format: slug-chapter-X.mp3 (from DownloadButton.tsx)
    const slugChapterRegex = /^.*-chapter-(\d+)\.mp3$/;
    const slugMatch = assetName.match(slugChapterRegex);
    if (slugMatch) {
      const chapter = this.formatChapterNumber(slugMatch[1]);
      // Extract just the chapter number part and standardize
      return `chapter-${chapter}.mp3`;
    }

    throw new Error(
      `Invalid audio asset name: "${assetName}". ` +
        'Should be "full-audiobook.mp3" or "chapter-XX.mp3".',
    );
  }

  /**
   * Validates if the asset name is a standard fulltext format
   *
   * @param assetName The asset name to check
   * @returns The asset name if valid, null otherwise
   */
  private validateFulltextFormat(assetName: string): string | null {
    const fulltextFormats = ['fulltext.txt', 'brainrot-fulltext.txt', 'source-fulltext.txt'];

    return fulltextFormats.includes(assetName) ? assetName : null;
  }

  /**
   * Validates if the asset name follows standard chapter format
   *
   * @param assetName The asset name to check
   * @returns The asset name if valid, null otherwise
   */
  private validateChapterFormat(assetName: string): string | null {
    // Standard chapter formats
    const chapterPatterns = [
      /^chapter-(\d{2})\.txt$/,
      /^brainrot-chapter-(\d{2})\.txt$/,
      /^source-chapter-(\d{2})\.txt$/,
    ];

    // Check against each pattern
    for (const pattern of chapterPatterns) {
      if (pattern.test(assetName)) {
        return assetName;
      }
    }

    return null;
  }

  /**
   * Validates if the asset name is a source-custom format
   *
   * @param assetName The asset name to check
   * @returns The asset name if valid, null otherwise
   */
  private validateSourceCustomFormat(assetName: string): string | null {
    const sourceCustomRegex = /^source-(.+)\.txt$/;
    return sourceCustomRegex.test(assetName) ? assetName : null;
  }

  /**
   * Attempts to normalize legacy format asset names
   *
   * @param assetName The asset name to normalize
   * @returns The normalized asset name if possible, null otherwise
   */
  private normalizeLegacyTextFormat(assetName: string): string | null {
    // Define pattern to handler mappings
    const legacyPatterns = [
      {
        // Legacy format: brainrot/X.txt
        pattern: /^brainrot\/(\d+)\.txt$/,
        handler: (matches: RegExpMatchArray) => {
          const chapter = this.formatChapterNumber(matches[1]);
          return `brainrot-chapter-${chapter}.txt`;
        },
      },
      {
        // Legacy format: source/X.txt
        pattern: /^source\/(\d+)\.txt$/,
        handler: (matches: RegExpMatchArray) => {
          const chapter = this.formatChapterNumber(matches[1]);
          return `source-chapter-${chapter}.txt`;
        },
      },
      {
        // Legacy format: source/{custom}.txt
        pattern: /^source\/(.+)\.txt$/,
        handler: (matches: RegExpMatchArray) => {
          return `source-${matches[1]}.txt`;
        },
      },
      {
        // Legacy format: X.txt (just a number)
        pattern: /^(\d+)\.txt$/,
        handler: (matches: RegExpMatchArray) => {
          const chapter = this.formatChapterNumber(matches[1]);
          return `chapter-${chapter}.txt`;
        },
      },
    ];

    // Try each pattern and return the first match
    for (const { pattern, handler } of legacyPatterns) {
      const matches = assetName.match(pattern);
      if (matches) {
        return handler(matches);
      }
    }

    return null;
  }

  /**
   * Validates text asset names
   * Valid formats:
   * - brainrot-fulltext.txt
   * - brainrot-chapter-XX.txt
   * - source-fulltext.txt
   * - source-chapter-XX.txt
   * - source-{custom}.txt
   * - fulltext.txt
   * - chapter-XX.txt
   *
   * @param assetName The text asset name
   * @returns Standardized asset name
   */
  validateTextAssetName(assetName: string): string {
    // Try standard formats first (fulltext)
    const fulltextResult = this.validateFulltextFormat(assetName);
    if (fulltextResult) return fulltextResult;

    // Try chapter formats
    const chapterResult = this.validateChapterFormat(assetName);
    if (chapterResult) return chapterResult;

    // Try source custom format
    const sourceCustomResult = this.validateSourceCustomFormat(assetName);
    if (sourceCustomResult) return sourceCustomResult;

    // Try to normalize from legacy formats as a last resort
    const legacyResult = this.normalizeLegacyTextFormat(assetName);
    if (legacyResult) return legacyResult;

    // If we get here, the name is invalid
    throw new Error(
      `Invalid text asset name: "${assetName}". ` +
        'Should follow standard naming conventions for text assets.',
    );
  }

  /**
   * Validates image asset names
   * Valid formats:
   * - cover.jpg
   * - thumbnail.jpg
   * - chapter-XX.jpg (or other extensions)
   *
   * @param assetName The image asset name
   * @returns Standardized asset name
   */
  validateImageAssetName(assetName: string): string {
    // For legacy chapter images: just a number with extension
    // Process this first to handle conversion
    const numericRegex = /^(\d+)\.(jpg|jpeg|png|webp)$/;
    const numericMatch = assetName.match(numericRegex);
    if (numericMatch) {
      const chapter = this.formatChapterNumber(numericMatch[1]);
      return `chapter-${chapter}.${numericMatch[2]}`;
    }

    // Check for cover and thumbnail
    if (
      /^cover\.(jpg|jpeg|png|webp)$/.test(assetName) ||
      /^thumbnail\.(jpg|jpeg|png|webp)$/.test(assetName)
    ) {
      return assetName;
    }

    // Check for chapter-XX.jpg format
    const chapterRegex = /^chapter-(\d{2})\.(jpg|jpeg|png|webp)$/;
    if (chapterRegex.test(assetName)) {
      return assetName;
    }

    // Legacy slug pattern: slug-chapter-1.jpg
    const slugMatch = assetName.match(/^.*-chapter-(\d+)\.(jpg|jpeg|png|webp)$/);
    if (slugMatch) {
      const chapter = this.formatChapterNumber(slugMatch[1]);
      return `chapter-${chapter}.${slugMatch[2]}`;
    }

    // For other book-specific images that might have custom naming
    // We'll allow them to pass through if they have a valid extension
    if (/\.(jpg|jpeg|png|webp|svg)$/.test(assetName)) {
      return assetName;
    }

    throw new Error(
      `Invalid image asset name: "${assetName}". ` +
        'Should follow standard naming conventions for image assets.',
    );
  }

  /**
   * Formats a chapter number to ensure it's zero-padded to 2 digits
   * @param chapter The chapter number as string or number
   * @returns Formatted chapter string (e.g., "01", "02", etc.)
   */
  formatChapterNumber(chapter: string | number): string {
    // If it's a string that might be a Roman numeral
    if (typeof chapter === 'string') {
      // Check if it's already a numeric string
      if (/^\d+$/.test(chapter)) {
        const num = parseInt(chapter, 10);
        return num.toString().padStart(2, '0');
      }

      // Check if it's a Roman numeral (lowercase)
      const lowerChapter = chapter.toLowerCase();
      if (this.ROMAN_TO_ARABIC[lowerChapter]) {
        const num = this.ROMAN_TO_ARABIC[lowerChapter];
        return num.toString().padStart(2, '0');
      }

      // If not a recognized format, return as is
      return chapter;
    }

    // If it's a number, convert and pad
    return chapter.toString().padStart(2, '0');
  }

  /**
   * Standardizes a chapter identifier to the new format
   * Handles various input formats and converts them to brainrot-{type}-{number}.txt
   *
   * @param input The input identifier (could be a filename or chapter identifier)
   * @returns Standardized filename
   */
  // eslint-disable-next-line complexity
  standardizeChapterIdentifier(input: string): string {
    const cleanInput = input.toLowerCase().trim();

    // Remove .txt extension if present
    const withoutExt = cleanInput.replace(/\.txt$/, '');

    // Check for special cases first
    if (withoutExt === 'fulltext' || withoutExt === 'brainrot-fulltext') {
      return 'brainrot-fulltext.txt';
    }

    if (withoutExt === 'prologue' || withoutExt === 'brainrot-prologue') {
      return 'brainrot-prologue.txt';
    }

    if (withoutExt === 'epilogue' || withoutExt === 'brainrot-epilogue') {
      return 'brainrot-epilogue.txt';
    }

    // Pattern to extract type and number from various formats
    const patterns = [
      // brainrot-chapter-01, brainrot-act-05
      /^brainrot-(chapter|act|part|scene)-(\d+)$/,
      // chapter-01, act-05, part-02
      /^(chapter|act|part|scene)-(\d+)$/,
      // chapter-i, act-v (Roman numerals)
      /^(chapter|act|part|scene)-([ivxlcdm]+)$/,
      // act_01, chapter_02 (underscore separator)
      /^(chapter|act|part|scene)_(\d+)$/,
      // Chapter 1, Act 3 (space separator, capitalized)
      /^(chapter|act|part|scene)\s+(\d+)$/i,
      // Just the number (assume chapter)
      /^(\d+)$/,
      // Roman numeral only (assume chapter)
      /^([ivxlcdm]+)$/,
    ];

    for (const pattern of patterns) {
      const match = withoutExt.match(pattern);
      if (match) {
        let type: string;
        let numberPart: string;

        if (pattern.toString() === '/^(\\d+)$/' || pattern.toString() === '/^([ivxlcdm]+)$/') {
          // Just a number or Roman numeral - assume chapter
          type = 'chapter';
          numberPart = match[1];
        } else if (pattern.toString() === '/^brainrot-(chapter|act|part|scene)-(\\d+)$/') {
          // Already standardized, just extract parts
          type = match[1];
          numberPart = match[2];
        } else {
          type = match[1].toLowerCase();
          numberPart = match[2];
        }

        // Convert to Arabic if needed and pad
        const arabicNumber = this.parseNumber(numberPart);
        const paddedNumber = String(arabicNumber).padStart(2, '0');

        return `brainrot-${type}-${paddedNumber}.txt`;
      }
    }

    // If no pattern matches, return the original with brainrot prefix
    return `brainrot-${withoutExt}.txt`;
  }

  /**
   * Parses a number from various formats (Arabic or Roman numerals)
   *
   * @param input The input string to parse
   * @returns The parsed number
   */
  private parseNumber(input: string): number {
    // Guard against undefined/null input
    if (!input) {
      return 1;
    }

    // Check if it's already a numeric string
    if (/^\d+$/.test(input)) {
      return parseInt(input, 10);
    }

    // Check if it's a Roman numeral
    const lowerInput = input.toLowerCase();
    if (this.ROMAN_TO_ARABIC[lowerInput]) {
      return this.ROMAN_TO_ARABIC[lowerInput];
    }

    // Try to convert general Roman numerals (not in our mapping)
    const romanValue = this.romanToArabic(lowerInput);
    if (romanValue > 0) {
      return romanValue;
    }

    // Default to 1 if we can't parse
    return 1;
  }

  /**
   * Converts a Roman numeral string to Arabic number
   * Handles Roman numerals beyond the basic mapping
   *
   * @param roman The Roman numeral string
   * @returns The Arabic number equivalent
   */
  private romanToArabic(roman: string): number {
    const romanMap: Record<string, number> = {
      i: 1,
      v: 5,
      x: 10,
      l: 50,
      c: 100,
      d: 500,
      m: 1000,
    };

    let result = 0;
    let prevValue = 0;

    // Process from right to left
    for (let i = roman.length - 1; i >= 0; i--) {
      const char = roman[i];
      const value = romanMap[char];

      if (!value) {
        return 0; // Invalid Roman numeral
      }

      if (value < prevValue) {
        result -= value;
      } else {
        result += value;
      }

      prevValue = value;
    }

    return result;
  }
}

// Export a singleton instance
export const assetNameValidator = new AssetNameValidator();
