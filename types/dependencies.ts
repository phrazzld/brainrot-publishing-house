/**
 * Interface for resolving asset URLs.
 * Used to obtain asset URLs from Vercel Blob storage.
 *
 * This abstraction allows the application to be agnostic about the specific storage implementation.
 *
 * @interface
 */
export interface AssetUrlResolver {
  /**
   * Retrieves an asset URL from Vercel Blob storage.
   *
   * @param assetType - The type of asset (e.g., 'audio', 'image', 'text')
   * @param bookSlug - The slug identifier for the book
   * @param assetName - The name of the asset file
   * @returns A Promise that resolves to the asset URL string which can be used for direct access or download
   * @throws {AssetNotFoundError} When the asset cannot be found in storage
   */
  getAssetUrl(assetType: string, bookSlug: string, assetName: string): Promise<string>;
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
