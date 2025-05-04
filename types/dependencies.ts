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

/**
 * Interface for generating signed URLs for S3-compatible storage services.
 * Used to create time-limited access URLs for protected assets in S3 buckets.
 *
 * Implementations of this interface handle the authentication and configuration needed
 * to communicate with S3-compatible storage services (AWS S3, DigitalOcean Spaces, etc.)
 * and generate signed URLs with appropriate expiry times for secure, temporary access.
 *
 * @interface
 */
export interface S3SignedUrlGenerator {
  /**
   * Creates a signed URL for an S3 object path with limited-time access.
   * The generated URL will include authentication parameters and an expiration timestamp
   * that allows temporary access to the object without requiring permanent public access.
   *
   * @param path - The S3 object path to create a signed URL for (can be a full URL or a relative path)
   * @returns A Promise that resolves to the signed URL string with a limited expiry time
   * @throws {SigningError} When URL signing fails due to credentials, permissions, or service issues
   */
  createSignedS3Url(path: string): Promise<string>;
}

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

/**
 * Custom error thrown when generating a signed URL fails.
 * Used to clearly distinguish signing failures from other error types and preserve original error cause.
 *
 * This error is typically thrown when:
 * - AWS/S3 credentials are invalid or missing
 * - The AWS SDK encounters an error during signing
 * - The requested resource doesn't exist or is inaccessible
 * - Network issues prevent communication with the storage service
 *
 * The error includes an optional cause property that contains the original error
 * from the underlying API or SDK for detailed troubleshooting.
 */
export class SigningError extends Error {
  /**
   * Creates a new SigningError instance.
   *
   * @param message - The error message describing the signing failure
   * @param cause - Optional underlying error that caused the signing failure
   * @example
   * try {
   *   // AWS SDK call that fails
   * } catch (error) {
   *   throw new SigningError('Failed to generate signed URL', error instanceof Error ? error : undefined);
   * }
   */
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SigningError';
  }
}
