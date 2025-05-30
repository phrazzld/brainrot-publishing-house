/**
 * Utility for creating standardized service instances with proper logging
 */
import { AssetService, AssetServiceConfig } from '../types/assets.js';
import { createScriptLogger } from './createScriptLogger.js';
import { Logger } from './logger.js';
import { AssetPathService, assetPathService } from './services/AssetPathService.js';
import { createAssetService } from './services/AssetServiceFactory.js';
import { BlobService, blobService } from './services/BlobService.js';

export interface ServiceOptions {
  /**
   * Logger to use (if not provided, creates a default logger)
   */
  logger?: Logger;

  /**
   * Script or module name for the logger context (if logger not provided)
   */
  scriptName?: string;

  /**
   * Optional task ID for the logger context
   */
  taskId?: string;

  /**
   * Optional context category for the logger
   */
  context?: string;

  /**
   * Path service instance to use (if not provided, uses default)
   */
  pathService?: AssetPathService;

  /**
   * Asset service configuration overrides
   */
  assetServiceConfig?: Partial<AssetServiceConfig>;

  /**
   * Custom error handler for service initialization errors
   */
  onError?: (error: Error, service: string) => void;
}

/**
 * Standard service bundle with all common services
 */
export interface Services {
  /**
   * Logger instance
   */
  logger: Logger;

  /**
   * Asset service for managing assets
   */
  assetService: AssetService;

  /**
   * Blob service for direct Vercel Blob operations
   */
  blobService: BlobService;

  /**
   * Path service for generating standardized paths
   */
  pathService: AssetPathService;
}

/**
 * Creates a standardized set of services with proper logging
 *
 * @param options Options for service initialization
 * @returns Object containing initialized services
 */
export function createServices(options: ServiceOptions = {}): Services {
  try {
    // Create logger if not provided
    const logger =
      options.logger ||
      createScriptLogger({
        scriptName: options.scriptName,
        taskId: options.taskId,
        context: options.context,
      });

    // Use provided path service or default
    const pathService = options.pathService || assetPathService;

    // Create asset service with logger and path service
    const assetService = createAssetService({
      logger,
      pathService,
      config: options.assetServiceConfig,
    });

    return {
      logger,
      assetService,
      blobService,
      pathService,
    };
  } catch (error) {
    // Handle service initialization errors
    const errorHandler =
      options.onError ||
      ((error, service) => {
        console.error(`Failed to initialize ${service}:`, error);
        throw error;
      });

    errorHandler(error instanceof Error ? error : new Error(String(error)), 'services');

    // This will never execute due to errorHandler throwing, but TypeScript requires it
    throw error;
  }
}

export default createServices;
