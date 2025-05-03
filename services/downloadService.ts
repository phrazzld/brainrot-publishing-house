import {
  // These imports will be used in T005 when implementing the method body
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AssetNotFoundError,
  AssetUrlResolver,
  S3SignedUrlGenerator,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SigningError,
} from '../types/dependencies';

/**
 * Parameters required to request a download URL.
 */
export interface DownloadRequestParams {
  /**
   * The slug identifier for the book or resource to download.
   */
  slug: string;

  /**
   * The type of download requested - either a full book or a specific chapter.
   */
  type: 'full' | 'chapter';

  /**
   * Optional chapter identifier. Required when type is 'chapter'.
   */
  chapter?: string;
}

/**
 * Service responsible for orchestrating the download URL resolution process.
 * Handles the logic to determine whether to return a Blob URL or generate a signed S3 URL.
 */
export class DownloadService {
  /**
   * Creates a new DownloadService instance.
   *
   * @param assetUrlResolver - Service that resolves asset URLs with fallback logic
   * @param s3SignedUrlGenerator - Service that generates signed URLs for S3 objects
   * @param s3Endpoint - The S3 endpoint URL used to determine if URL signing is needed
   */
  constructor(
    private readonly assetUrlResolver: AssetUrlResolver,
    private readonly s3SignedUrlGenerator: S3SignedUrlGenerator,
    private readonly s3Endpoint: string
  ) {}

  /**
   * Gets a download URL for the requested asset.
   * Determines whether to return a Blob URL or a signed S3 URL based on the resolved URL.
   *
   * @param params - The download request parameters
   * @returns A Promise that resolves to the final download URL
   * @throws {AssetNotFoundError} When the requested asset cannot be found
   * @throws {SigningError} When S3 URL signing fails
   */
  async getDownloadUrl(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: DownloadRequestParams
  ): Promise<string> {
    // Implementation will be added in T005
    throw new Error('Not implemented');
  }
}
