/**
 * BlobPathService - LEGACY SERVICE
 *
 * @deprecated This service is maintained for backward compatibility.
 * New code should use AssetPathService directly instead.
 *
 * This service delegates to AssetPathService internally and adapts the results
 * to maintain compatibility with existing code.
 */
import { AssetType } from '../../types/assets';
import {
  AssetNameValidator,
  assetNameValidator as defaultValidator,
} from '../validators/AssetNameValidator';
import { AssetPathService, assetPathService as defaultAssetPathService } from './AssetPathService';

export class BlobPathService {
  /** The underlying AssetPathService that generates standardized paths */
  private readonly assetPathService: AssetPathService;
  /** The validator for asset names */
  private readonly validator: AssetNameValidator;

  constructor(assetPathService?: AssetPathService, validator?: AssetNameValidator) {
    this.assetPathService = assetPathService || defaultAssetPathService;
    this.validator = validator || defaultValidator;
  }

  /**
   * Gets the path for an asset of the specified type
   * @deprecated Use AssetPathService.getAssetPath instead
   */
  public getAssetPath(assetType: AssetType, bookSlug: string, assetName: string): string {
    return this.adaptAssetPath(this.assetPathService.getAssetPath(assetType, bookSlug, assetName));
  }

  /**
   * Generate a path for book images
   * @deprecated Use AssetPathService.getBookImagePath or AssetPathService.getImagePath instead
   */
  public getBookImagePath(bookSlug: string, filename: string): string {
    return this.adaptAssetPath(this.assetPathService.getBookImagePath(bookSlug, filename));
  }

  /**
   * Generate a path for brainrot text
   * @deprecated Use AssetPathService.getBrainrotTextPath instead
   */
  public getBrainrotTextPath(bookSlug: string, chapter: string): string {
    return this.adaptAssetPath(this.assetPathService.getBrainrotTextPath(bookSlug, chapter));
  }

  /**
   * Generate a path for fulltext brainrot
   * @deprecated Use AssetPathService.getTextPath with textType='fulltext' instead
   */
  public getFulltextPath(bookSlug: string): string {
    return this.adaptAssetPath(this.assetPathService.getTextPath(bookSlug, 'fulltext'));
  }

  /**
   * Generate a path for source text
   * @deprecated Use AssetPathService.getSourceTextPath instead
   */
  public getSourceTextPath(bookSlug: string, filename: string): string {
    return this.adaptAssetPath(this.assetPathService.getSourceTextPath(bookSlug, filename));
  }

  /**
   * Generate a path for shared images
   * @deprecated Use AssetPathService.getSharedImagePath instead
   */
  public getSharedImagePath(filename: string): string {
    return this.adaptAssetPath(this.assetPathService.getSharedImagePath(filename));
  }

  /**
   * Generate a path for UI assets
   * @deprecated Use AssetPathService.getSiteAssetPath instead
   */
  public getSiteAssetPath(filename: string): string {
    return this.adaptAssetPath(this.assetPathService.getSiteAssetPath(filename));
  }

  /**
   * Generate a path for audio files
   * @deprecated Use AssetPathService.getAudioPath instead
   */
  public getAudioPath(bookSlug: string, chapter: string): string {
    return this.adaptAssetPath(this.assetPathService.getAudioPath(bookSlug, chapter));
  }

  /**
   * Convert a legacy asset path to a blob path
   * Example: /assets/hamlet/images/hamlet-01.png → books/hamlet/images/hamlet-01.png
   * @deprecated Use AssetPathService.normalizeLegacyPath instead for the new path format
   */
  public convertLegacyPath(legacyPath: string): string {
    const normalizedPath = this.assetPathService.normalizeLegacyPath(legacyPath);
    return this.adaptAssetPath(normalizedPath);
  }

  /**
   * Get the book slug from a path
   * @deprecated Use AssetPathService.getBookSlugFromPath instead
   */
  public getBookSlugFromPath(path: string): string | null {
    // Handle both new and old format paths
    return this.assetPathService.getBookSlugFromPath(path);
  }

  /**
   * Adapt a new asset path to the old blob path format
   * This is needed to maintain backward compatibility with existing code
   * @private
   */
  private adaptAssetPath(newPath: string): string {
    // Convert new format "assets/{type}/{book}/..." to old format "books/{book}/{type}/..."
    if (newPath.startsWith('assets/')) {
      // Handle shared and site assets differently
      if (newPath.startsWith('assets/shared/')) {
        return newPath.replace('assets/shared/', 'images/');
      }

      if (newPath.startsWith('assets/site/')) {
        return newPath.replace('assets/site/', 'site-assets/');
      }

      // For book-specific assets (audio, text, image)
      const match = newPath.match(/^assets\/([^/]+)\/([^/]+)\/(.+)$/);
      if (match) {
        const [, assetType, bookSlug, remainder] = match;
        // Singular to plural for 'image' -> 'images'
        const oldTypeName = assetType === 'image' ? 'images' : assetType;
        return `books/${bookSlug}/${oldTypeName}/${remainder}`;
      }
    }

    // If the path doesn't match our conversion rules, return it unchanged
    return newPath;
  }
}

// Export a singleton instance
export const blobPathService = new BlobPathService();
