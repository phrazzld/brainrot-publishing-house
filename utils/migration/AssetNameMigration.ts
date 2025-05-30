/**
 * Asset Name Migration Utility
 *
 * Provides utilities for converting legacy asset names to standardized formats.
 * This helps with gradual migration of asset names without breaking compatibility.
 */
import { AssetType } from '@/types/assets.js';

import { assetNameValidator } from '../validators/AssetNameValidator.js';

/**
 * Result of an asset name migration attempt
 */
export interface MigrationResult {
  /**
   * Original asset name
   */
  originalName: string;

  /**
   * Migrated asset name (may be the same as original if already compliant)
   */
  migratedName: string;

  /**
   * Whether the name was changed during migration
   */
  wasChanged: boolean;

  /**
   * Whether the migration was successful
   */
  success: boolean;

  /**
   * Error message if migration failed
   */
  error?: string;
}

/**
 * Utility for migrating legacy asset names to standardized formats
 */
export class AssetNameMigration {
  /**
   * Attempts to convert a legacy asset name to the standardized format
   * @param assetType Type of asset (audio, text, image)
   * @param assetName Original asset name
   * @returns Migration result indicating success or failure and the new name
   */
  migrateAssetName(assetType: AssetType, assetName: string): MigrationResult {
    const result: MigrationResult = {
      originalName: assetName,
      migratedName: assetName,
      wasChanged: false,
      success: true,
    };

    try {
      // Try to validate the name using the validator
      const validatedName = assetNameValidator.validateAssetName(assetType, assetName);

      // If validation succeeded but the name was changed
      if (validatedName !== assetName) {
        result.migratedName = validatedName;
        result.wasChanged = true;
      }
    } catch (error) {
      // If validation failed, try to handle specific legacy patterns
      try {
        let migratedName: string | undefined;

        switch (assetType) {
          case AssetType.AUDIO:
            migratedName = this.migrateAudioAssetName(assetName);
            break;
          case AssetType.TEXT:
            migratedName = this.migrateTextAssetName(assetName);
            break;
          case AssetType.IMAGE:
            migratedName = this.migrateImageAssetName(assetName);
            break;
        }

        if (migratedName) {
          result.migratedName = migratedName;
          result.wasChanged = true;
        } else {
          // If we couldn't migrate the name
          result.success = false;
          result.error = `Unable to migrate asset name: ${assetName}`;
        }
      } catch {
        // If all migration attempts failed
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
      }
    }

    return result;
  }

  /**
   * Attempts to migrate a legacy audio asset name
   * @param assetName Original audio asset name
   * @returns Migrated name or undefined if migration failed
   */
  private migrateAudioAssetName(assetName: string): string | undefined {
    // Simple numeric pattern: 1.mp3, 10.mp3, etc.
    const numericMatch = assetName.match(/^(\d+)\.mp3$/);
    if (numericMatch) {
      const chapter = assetNameValidator.formatChapterNumber(numericMatch[1]);
      return `chapter-${chapter}.mp3`;
    }

    // Legacy book pattern: book-1.mp3, book-10.mp3, etc.
    const bookMatch = assetName.match(/^book-(\d+)\.mp3$/);
    if (bookMatch) {
      const chapter = assetNameValidator.formatChapterNumber(bookMatch[1]);
      return `chapter-${chapter}.mp3`;
    }

    // Legacy slug pattern: slug-chapter-1.mp3
    const slugMatch = assetName.match(/^.*-chapter-(\d+)\.mp3$/);
    if (slugMatch) {
      const chapter = assetNameValidator.formatChapterNumber(slugMatch[1]);
      return `chapter-${chapter}.mp3`;
    }

    return undefined;
  }

  /**
   * Attempts to migrate a legacy text asset name
   * @param assetName Original text asset name
   * @returns Migrated name or undefined if migration failed
   */
  private migrateTextAssetName(assetName: string): string | undefined {
    // Legacy brainrot directory pattern: brainrot/1.txt
    const brainrotDirMatch = assetName.match(/^brainrot\/(\d+)\.txt$/);
    if (brainrotDirMatch) {
      const chapter = assetNameValidator.formatChapterNumber(brainrotDirMatch[1]);
      return `brainrot-chapter-${chapter}.txt`;
    }

    // Legacy fulltext patterns
    if (assetName === 'brainrot/fulltext.txt') {
      return 'brainrot-fulltext.txt';
    }

    // Legacy source directory pattern: source/intro.txt
    const sourceDirMatch = assetName.match(/^source\/(.+)\.txt$/);
    if (sourceDirMatch) {
      if (/^\d+$/.test(sourceDirMatch[1])) {
        // It's a numeric chapter
        const chapter = assetNameValidator.formatChapterNumber(sourceDirMatch[1]);
        return `source-chapter-${chapter}.txt`;
      }
      // It's a named file
      return `source-${sourceDirMatch[1]}.txt`;
    }

    // Simple numeric pattern: 1.txt
    const numericMatch = assetName.match(/^(\d+)\.txt$/);
    if (numericMatch) {
      const chapter = assetNameValidator.formatChapterNumber(numericMatch[1]);
      return `chapter-${chapter}.txt`;
    }

    return undefined;
  }

  /**
   * Attempts to migrate a legacy image asset name
   * @param assetName Original image asset name
   * @returns Migrated name or undefined if migration failed
   */
  private migrateImageAssetName(assetName: string): string | undefined {
    // Simple numeric pattern with various extensions: 1.jpg, 2.png, etc.
    const numericMatch = assetName.match(/^(\d+)\.([a-z]+)$/);
    if (numericMatch) {
      const chapter = assetNameValidator.formatChapterNumber(numericMatch[1]);
      const extension = numericMatch[2];
      return `chapter-${chapter}.${extension}`;
    }

    // Legacy slug pattern: slug-chapter-1.jpg
    const slugMatch = assetName.match(/^.*-chapter-(\d+)\.([a-z]+)$/);
    if (slugMatch) {
      const chapter = assetNameValidator.formatChapterNumber(slugMatch[1]);
      const extension = slugMatch[2];
      return `chapter-${chapter}.${extension}`;
    }

    return undefined;
  }
}

// Export a singleton instance
export const assetNameMigration = new AssetNameMigration();
