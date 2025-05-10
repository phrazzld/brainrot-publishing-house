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
        'Should be "full-audiobook.mp3" or "chapter-XX.mp3".'
    );
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
    // Check for fulltext formats
    if (
      assetName === 'fulltext.txt' ||
      assetName === 'brainrot-fulltext.txt' ||
      assetName === 'source-fulltext.txt'
    ) {
      return assetName;
    }

    // Check for chapter-XX.txt format
    const chapterRegex = /^chapter-(\d{2})\.txt$/;
    if (chapterRegex.test(assetName)) {
      return assetName;
    }

    // Check for brainrot-chapter-XX.txt format
    const brainrotChapterRegex = /^brainrot-chapter-(\d{2})\.txt$/;
    if (brainrotChapterRegex.test(assetName)) {
      return assetName;
    }

    // Check for source-chapter-XX.txt format
    const sourceChapterRegex = /^source-chapter-(\d{2})\.txt$/;
    if (sourceChapterRegex.test(assetName)) {
      return assetName;
    }

    // Check for source-{custom}.txt format
    const sourceCustomRegex = /^source-(.+)\.txt$/;
    if (sourceCustomRegex.test(assetName)) {
      return assetName;
    }

    // Legacy format: brainrot/X.txt
    const legacyBrainrotRegex = /^brainrot\/(\d+)\.txt$/;
    const brainrotMatch = assetName.match(legacyBrainrotRegex);
    if (brainrotMatch) {
      const chapter = this.formatChapterNumber(brainrotMatch[1]);
      return `brainrot-chapter-${chapter}.txt`;
    }

    // Legacy format: source/X.txt
    const legacySourceRegex = /^source\/(\d+)\.txt$/;
    const sourceMatch = assetName.match(legacySourceRegex);
    if (sourceMatch) {
      const chapter = this.formatChapterNumber(sourceMatch[1]);
      return `source-chapter-${chapter}.txt`;
    }

    // Legacy format: source/{custom}.txt
    const legacySourceCustomRegex = /^source\/(.+)\.txt$/;
    const sourceCustomMatch = assetName.match(legacySourceCustomRegex);
    if (sourceCustomMatch) {
      return `source-${sourceCustomMatch[1]}.txt`;
    }

    // Legacy format: X.txt (just a number)
    const numericRegex = /^(\d+)\.txt$/;
    const numericMatch = assetName.match(numericRegex);
    if (numericMatch) {
      const chapter = this.formatChapterNumber(numericMatch[1]);
      return `chapter-${chapter}.txt`;
    }

    throw new Error(
      `Invalid text asset name: "${assetName}". ` +
        'Should follow standard naming conventions for text assets.'
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
        'Should follow standard naming conventions for image assets.'
    );
  }

  /**
   * Formats a chapter number to ensure it's zero-padded to 2 digits
   * @param chapter The chapter number as string or number
   * @returns Formatted chapter string (e.g., "01", "02", etc.)
   */
  formatChapterNumber(chapter: string | number): string {
    // If not a numeric string, return as is
    if (typeof chapter === 'string' && !/^\d+$/.test(chapter)) {
      return chapter;
    }

    // Convert to number and pad
    const num = typeof chapter === 'string' ? parseInt(chapter, 10) : chapter;
    return num.toString().padStart(2, '0');
  }
}

// Export a singleton instance
export const assetNameValidator = new AssetNameValidator();
