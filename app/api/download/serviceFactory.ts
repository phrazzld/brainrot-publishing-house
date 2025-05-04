import { DownloadService } from '@/services/downloadService';
import { createS3SignedUrlGenerator } from '@/services/s3SignedUrlGenerator';
import { AssetUrlResolver } from '@/types/dependencies';
import { getAssetUrlWithFallback } from '@/utils';
import { Logger } from '@/utils/logger';

import { safeLog } from './errorHandlers';

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

    // Get S3 endpoint from environment (support both standard and legacy env var names)
    const s3Endpoint = process.env.SPACES_ENDPOINT || process.env.DO_SPACES_ENDPOINT;

    // Log environment variables for debugging (without sensitive values)
    safeLog(log, 'debug', {
      msg: 'Download service environment configuration',
      hasSpacesEndpoint: !!process.env.SPACES_ENDPOINT,
      hasDOSpacesEndpoint: !!process.env.DO_SPACES_ENDPOINT,
      hasSpacesAccessKey: !!process.env.SPACES_ACCESS_KEY_ID,
      hasDOAccessKey: !!process.env.DO_SPACES_ACCESS_KEY,
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobUrl: !!process.env.NEXT_PUBLIC_BLOB_BASE_URL,
    });

    // S3 endpoint validation happens in the validator, we know it's valid here
    if (!s3Endpoint) {
      safeLog(log, 'error', {
        msg: 'Missing required S3 endpoint configuration',
      });
      return null;
    }

    // Create and return the download service with dependencies
    return new DownloadService(assetUrlResolver, s3SignedUrlGenerator, s3Endpoint);
  } catch (error) {
    // Log any errors that occur during service initialization
    safeLog(log, 'error', {
      msg: 'Failed to initialize download service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}
