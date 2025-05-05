import { DownloadService } from '@/services/downloadService';
import { AssetUrlResolver } from '@/types/dependencies';
import { getAssetUrlWithFallback } from '@/utils';
import { Logger } from '@/utils/logger';

import { safeLog } from './errorHandlers';

/**
 * Creates an instance of the download service with all required dependencies
 *
 * This factory function follows the dependency injection pattern to:
 * - Initialize the AssetUrlResolver with the getAssetUrlWithFallback function
 * - Create a properly configured DownloadService with all dependencies
 * - Log environment configuration for debugging purposes
 *
 * The service is environment-agnostic and works without any special credentials
 * since it uses public CDN URLs as the primary source with Blob storage as fallback.
 *
 * @param log - Logger instance for recording service initialization issues
 * @returns The initialized download service or null if initialization failed
 */
export function createDownloadService(log: Logger): DownloadService | null {
  try {
    // Create an adapter that implements the AssetUrlResolver interface
    const assetUrlResolver: AssetUrlResolver = {
      getAssetUrlWithFallback,
    };

    // Log environment variables for debugging (without sensitive values)
    safeLog(log, 'debug', {
      msg: 'Download service environment configuration',
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobUrl: !!process.env.NEXT_PUBLIC_BLOB_BASE_URL,
      hasSpacesBucket: !!process.env.SPACES_BUCKET_NAME || !!process.env.DO_SPACES_BUCKET,
      nodeEnv: process.env.NODE_ENV,
    });

    // Create and return the download service with dependencies
    return new DownloadService(assetUrlResolver);
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
