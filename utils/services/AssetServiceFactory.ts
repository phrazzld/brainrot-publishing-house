/**
 * AssetServiceFactory
 *
 * Factory for creating instances of AssetService with the correct dependencies.
 * This makes dependency injection consistent across the application.
 */
import { AssetService, AssetServiceConfig } from '../../types/assets';
import { Logger, createRequestLogger, logger as defaultLogger } from '../logger';
import { AssetPathService, assetPathService } from './AssetPathService';
import { VercelBlobAssetService } from './VercelBlobAssetService';

/**
 * Creates a new instance of AssetService
 *
 * @param options Configuration options for the service
 * @returns AssetService instance
 */
export function createAssetService(options?: {
  config?: Partial<AssetServiceConfig>;
  pathService?: AssetPathService;
  logger?: Logger;
  correlationId?: string;
}): AssetService {
  // Use provided path service or default
  const pathService = options?.pathService || assetPathService;

  // Create logger (with correlation ID if provided)
  const logger = options?.correlationId
    ? createRequestLogger(options.correlationId)
    : options?.logger || defaultLogger;

  // Merge default config with provided options
  const config: AssetServiceConfig = {
    baseUrl: process.env.NEXT_PUBLIC_BLOB_BASE_URL,
    rootPrefix: 'assets',
    defaultCacheControl: 'public, max-age=31536000',
    defaultCacheBusting: false,
    ...options?.config,
  };

  // Create and return the service instance
  return new VercelBlobAssetService(pathService, config, logger);
}

// Export a default singleton instance
export const assetService = createAssetService();
