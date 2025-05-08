import { DownloadService } from '@/services/downloadService';
import { AssetService } from '@/types/assets';
import { Logger } from '@/utils/logger';
import { createAssetService } from '@/utils/services/AssetServiceFactory';

import { safeLog } from './errorHandlers';

/**
 * Creates an instance of the download service with all required dependencies
 *
 * This factory function follows the dependency injection pattern to:
 * - Create an AssetService using the AssetServiceFactory
 * - Create a properly configured DownloadService with all dependencies
 * - Log environment configuration for debugging purposes
 *
 * The service is environment-agnostic and works with the unified AssetService
 * which handles all asset operations consistently.
 *
 * @param log - Logger instance for recording service initialization issues
 * @param correlationId - Optional correlation ID for request tracing
 * @returns The initialized download service or null if initialization failed
 */
export function createDownloadService(log: Logger, correlationId?: string): DownloadService | null {
  try {
    // Create an AssetService instance with proper configuration
    const assetService: AssetService = createAssetService({
      logger: log,
      correlationId,
    });

    // Log environment variables for debugging (without sensitive values)
    safeLog(log, 'debug', {
      msg: 'Download service environment configuration',
      hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
      hasBlobUrl: !!process.env.NEXT_PUBLIC_BLOB_BASE_URL,
      nodeEnv: process.env.NODE_ENV,
    });

    // Create and return the download service with dependencies
    return new DownloadService(assetService);
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
