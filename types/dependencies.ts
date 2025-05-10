/**
 * Interface for resolving asset URLs with fallback mechanisms.
 * Used to obtain the primary asset URL which could be from Blob storage or a legacy S3 path.
 *
 * Implementations of this interface should handle the logic of trying multiple storage locations
 * and determine the most appropriate URL to return based on asset availability and configuration.
 * This abstraction allows the application to be agnostic about the specific storage implementation.
 *
 * @interface
 */
export interface AssetUrlResolver {
  /**
   * Retrieves an asset URL with fallback logic if the primary source is unavailable.
   * This method attempts to locate an asset in the primary storage location (e.g., Blob storage),
   * and if not found, falls back to alternative storage locations (e.g., S3, local filesystem).
   *
   * @param legacyPath - The legacy path of the asset to resolve (typically a relative path like '/book-slug/audio/file.mp3')
   * @returns A Promise that resolves to the asset URL string which can be used for direct access or download
   * @throws {AssetNotFoundError} When the asset cannot be found in any storage location
   */
  getAssetUrlWithFallback(legacyPath: string): Promise<string>;
}

// Note: S3SignedUrlGenerator interface has been removed
// as we are now using direct CDN URLs instead of signed URLs

/**
 * Custom error thrown when an asset cannot be found in any storage location.
 * Used to clearly distinguish asset not found scenarios from other error types.
 *
 * This error is typically thrown when:
 * - An asset doesn't exist in Blob storage
 * - An asset doesn't exist in S3/Spaces storage
 * - An asset doesn't exist in the local filesystem
 *
 * Applications can catch this specific error type to handle asset not found scenarios
 * appropriately, such as showing user-friendly messages or fallback content.
 */
export class AssetNotFoundError extends Error {
  /**
   * Creates a new AssetNotFoundError instance.
   *
   * @param message - The error message describing which asset was not found
   * @example
   * throw new AssetNotFoundError('Asset not found: /book-slug/audio/chapter-1.mp3');
   */
  constructor(message: string) {
    super(message);
    this.name = 'AssetNotFoundError';
  }
}

// Note: SigningError class has been removed
// as we are now using direct CDN URLs instead of signed URLs
