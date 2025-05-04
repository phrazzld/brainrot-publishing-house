import { DownloadService } from '@/services/downloadService';
import { createS3SignedUrlGenerator } from '@/services/s3SignedUrlGenerator';
import { AssetUrlResolver } from '@/types/dependencies';
import { getAssetUrlWithFallback } from '@/utils';
import { Logger } from '@/utils/logger';

/**
 * Creates an instance of the download service with all required dependencies
 * @param log - Logger instance for recording service initialization issues
 * @returns The initialized download service or null if initialization failed
 */
export function createDownloadService(log: Logger): DownloadService | null {
  try {
    // Create an adapter that implements the AssetUrlResolver interface
    const assetUrlResolver: AssetUrlResolver = {
      getAssetUrlWithFallback,
    };

    // Create the S3 signed URL generator
    const s3SignedUrlGenerator = createS3SignedUrlGenerator();

    // Get S3 endpoint from environment
    const s3Endpoint = process.env.SPACES_ENDPOINT;

    // S3 endpoint validation happens in the validator, we know it's valid here
    if (!s3Endpoint) {
      return null;
    }

    // Create and return the download service with dependencies
    return new DownloadService(assetUrlResolver, s3SignedUrlGenerator, s3Endpoint);
  } catch (error) {
    // Log any errors that occur during service initialization
    log.error({
      msg: 'Failed to initialize download service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}
