/**
 * Interface for resolving asset URLs with fallback mechanisms.
 * Used to obtain the primary asset URL which could be from Blob storage or a legacy S3 path.
 */
export interface AssetUrlResolver {
  /**
   * Retrieves an asset URL with fallback logic if the primary source is unavailable.
   *
   * @param legacyPath - The legacy path of the asset to resolve
   * @returns A Promise that resolves to the asset URL string
   * @throws {AssetNotFoundError} When the asset cannot be found in any storage location
   */
  getAssetUrlWithFallback(legacyPath: string): Promise<string>;
}

/**
 * Interface for generating signed URLs for S3-compatible storage services.
 * Used to create time-limited access URLs for protected assets in S3 buckets.
 */
export interface S3SignedUrlGenerator {
  /**
   * Creates a signed URL for an S3 object path with limited-time access.
   *
   * @param path - The S3 object path to create a signed URL for
   * @returns A Promise that resolves to the signed URL string
   * @throws {SigningError} When URL signing fails due to credentials, permissions, or service issues
   */
  createSignedS3Url(path: string): Promise<string>;
}

/**
 * Custom error thrown when an asset cannot be found in any storage location.
 * Used to clearly distinguish asset not found scenarios from other error types.
 */
export class AssetNotFoundError extends Error {
  /**
   * Creates a new AssetNotFoundError instance.
   *
   * @param message - The error message describing which asset was not found
   */
  constructor(message: string) {
    super(message);
    this.name = 'AssetNotFoundError';
  }
}

/**
 * Custom error thrown when generating a signed URL fails.
 * Used to clearly distinguish signing failures from other error types and preserve original error cause.
 */
export class SigningError extends Error {
  /**
   * Creates a new SigningError instance.
   *
   * @param message - The error message describing the signing failure
   * @param cause - Optional underlying error that caused the signing failure
   */
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SigningError';
  }
}
