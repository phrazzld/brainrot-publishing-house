/**
 * VercelBlobAssetService
 *
 * Implementation of the AssetService interface using Vercel Blob as the storage backend.
 * This service provides a unified approach to asset management, with robust logging,
 * error handling, and retry mechanisms.
 *
 * TODO: This file exceeds the max line count. It should be refactored into smaller files.
 */
/* eslint-disable max-lines */
import { del, head, list, put } from '@vercel/blob';

import {
  AssetError,
  AssetErrorType,
  AssetInfo,
  AssetListResult,
  AssetPathService,
  AssetService,
  AssetServiceConfig,
  AssetType,
  AssetUploadResult,
  AssetUrlOptions,
  ListOptions,
  UploadOptions,
} from '../../types/assets';
import { Logger, logger as defaultLogger } from '../logger';

// Number of retry attempts for transient errors
const DEFAULT_RETRY_ATTEMPTS = 3;
// Delay between retry attempts in ms (exponential backoff)
const BASE_RETRY_DELAY = 500;

export class VercelBlobAssetService implements AssetService {
  /**
   * Creates a new VercelBlobAssetService
   *
   * @param pathService Service to generate standardized asset paths
   * @param config Configuration options for the service
   * @param logger Optional logger instance (defaults to global logger)
   */
  constructor(
    private readonly pathService: AssetPathService,
    private readonly config: AssetServiceConfig,
    private readonly logger: Logger = defaultLogger
  ) {
    this.logger.info({
      message: 'VercelBlobAssetService initialized',
      baseUrl: this.config.baseUrl,
      rootPrefix: this.config.rootPrefix,
    });
  }

  /**
   * Get a public URL for an asset
   *
   * @param assetType Type of asset (audio, text, image)
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @param options Additional options (e.g., cache control)
   * @returns Promise resolving to a public URL for the asset
   */
  async getAssetUrl(
    assetType: AssetType,
    bookSlug: string,
    assetName: string,
    options?: AssetUrlOptions
  ): Promise<string> {
    const operation = 'getAssetUrl';
    const path = this.pathService.getAssetPath(assetType, bookSlug, assetName);
    const cacheBusting = options?.cacheBusting ?? this.config.defaultCacheBusting;
    const startTime = performance.now();
    const requestId = crypto.randomUUID();

    this.logger.info({
      message: `Generating URL for asset`,
      operation,
      assetType,
      bookSlug,
      assetName,
      path,
      cacheBusting,
      requestId,
      context: 'asset_monitoring',
      action: 'url_generation_start',
      timestamp: new Date().toISOString(),
    });

    try {
      // Verify the asset exists, but don't fail if it doesn't
      // Just log a warning
      let assetExists = false;
      let assetSize = 0;
      let assetContentType = '';

      try {
        const headResult = await head(this.getFullPath(path));
        assetExists = true;
        assetSize = headResult.size; // Use size instead of contentLength
        assetContentType = headResult.contentType;
      } catch (error) {
        this.logger.warn({
          message: `Asset existence check failed, still returning URL`,
          operation,
          path,
          error: this.formatError(error),
          requestId,
          context: 'asset_monitoring',
          action: 'asset_existence_check_failed',
          timestamp: new Date().toISOString(),
        });
      }

      // Generate URL
      const baseUrl =
        this.config.baseUrl ||
        process.env.NEXT_PUBLIC_BLOB_BASE_URL ||
        'https://public.blob.vercel-storage.com';
      let url = `${baseUrl}/${path}`;

      // Add cache busting if requested
      if (cacheBusting) {
        const cacheBuster = `_t=${Date.now()}`;
        url = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      this.logger.info({
        message: `Asset URL generated successfully`,
        operation,
        url,
        path,
        requestId,
        context: 'asset_monitoring',
        action: 'url_generation_complete',
        timestamp: new Date().toISOString(),
        metrics: {
          duration_ms: duration,
          asset_exists: assetExists,
          asset_size_bytes: assetSize,
          content_type: assetContentType,
        },
      });

      return url;
    } catch (error) {
      // Log and rethrow as AssetError
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.logger.error({
        message: `Failed to generate asset URL`,
        operation,
        assetType,
        bookSlug,
        assetName,
        error: this.formatError(error),
        requestId,
        context: 'asset_monitoring',
        action: 'url_generation_error',
        timestamp: new Date().toISOString(),
        metrics: {
          duration_ms: duration,
          error_type: error instanceof Error ? error.name : 'Unknown',
        },
      });

      throw this.createAssetError(
        'Failed to generate asset URL',
        AssetErrorType.UNKNOWN_ERROR,
        operation,
        { cause: error, assetPath: path }
      );
    }
  }

  /**
   * Check if an asset exists
   *
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving to boolean indicating existence
   */
  async assetExists(assetType: AssetType, bookSlug: string, assetName: string): Promise<boolean> {
    const operation = 'assetExists';
    const path = this.pathService.getAssetPath(assetType, bookSlug, assetName);

    this.logger.info({
      message: `Checking if asset exists`,
      operation,
      assetType,
      bookSlug,
      assetName,
      path,
    });

    try {
      const fullPath = this.getFullPath(path);
      await head(fullPath);

      this.logger.info({
        message: `Asset exists`,
        operation,
        path,
      });

      return true;
    } catch (error) {
      this.logger.info({
        message: `Asset does not exist`,
        operation,
        path,
        error: this.formatError(error),
      });

      return false;
    }
  }

  /**
   * Fetch an asset's content
   *
   * TODO: Refactor to reduce complexity below threshold of 10
   *
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving to the asset content
   */
  /* eslint-disable-next-line complexity */
  async fetchAsset(
    assetType: AssetType,
    bookSlug: string,
    assetName: string
  ): Promise<ArrayBuffer> {
    const operation = 'fetchAsset';
    const path = this.pathService.getAssetPath(assetType, bookSlug, assetName);
    const startTime = performance.now();
    const requestId = crypto.randomUUID();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'server';

    this.logger.info({
      message: `Fetching asset content`,
      operation,
      assetType,
      bookSlug,
      assetName,
      path,
      requestId,
      context: 'asset_monitoring',
      action: 'asset_fetch_start',
      timestamp: new Date().toISOString(),
      client_info: {
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      const url = await this.getAssetUrl(assetType, bookSlug, assetName);

      // Use fetch with retries
      let attempts = 0;
      const maxAttempts = DEFAULT_RETRY_ATTEMPTS;
      const attemptTimings: number[] = [];

      while (attempts < maxAttempts) {
        const attemptStartTime = performance.now();
        try {
          attempts++;
          const response = await fetch(url);

          // Capture response timing
          const responseTime = performance.now() - attemptStartTime;
          attemptTimings.push(responseTime);

          if (!response.ok) {
            const errorType = this.mapHttpStatusToErrorType(response.status);

            this.logger.warn({
              message: `Fetch attempt ${attempts} failed with HTTP ${response.status}`,
              operation,
              path,
              requestId,
              context: 'asset_monitoring',
              action: 'asset_fetch_http_error',
              timestamp: new Date().toISOString(),
              metrics: {
                attempt: attempts,
                max_attempts: maxAttempts,
                response_time_ms: responseTime,
                http_status: response.status,
                error_type: errorType,
              },
            });

            throw this.createAssetError(
              `Failed to fetch asset: HTTP ${response.status} ${response.statusText}`,
              errorType,
              operation,
              { statusCode: response.status, assetPath: path }
            );
          }

          const content = await response.arrayBuffer();
          const endTime = performance.now();
          const totalDuration = endTime - startTime;

          this.logger.info({
            message: `Successfully fetched asset content`,
            operation,
            path,
            contentLength: content.byteLength,
            requestId,
            context: 'asset_monitoring',
            action: 'asset_fetch_success',
            timestamp: new Date().toISOString(),
            metrics: {
              total_duration_ms: totalDuration,
              content_size_bytes: content.byteLength,
              attempts: attempts,
              content_type: response.headers.get('content-type'),
              attempt_timings_ms: attemptTimings,
              caching: {
                cache_hit: response.headers.get('x-vercel-cache') === 'HIT',
                cache_control: response.headers.get('cache-control'),
              },
            },
          });

          return content;
        } catch (error) {
          // If this is the last attempt, rethrow
          if (attempts >= maxAttempts) {
            throw error;
          }

          // Otherwise log and retry
          const attemptDuration = performance.now() - attemptStartTime;
          attemptTimings.push(attemptDuration);

          const backoffDelay = BASE_RETRY_DELAY * Math.pow(2, attempts - 1);

          this.logger.warn({
            message: `Fetch attempt ${attempts} failed, retrying...`,
            operation,
            path,
            error: this.formatError(error),
            requestId,
            context: 'asset_monitoring',
            action: 'asset_fetch_retry',
            timestamp: new Date().toISOString(),
            metrics: {
              attempt: attempts,
              max_attempts: maxAttempts,
              attempt_duration_ms: attemptDuration,
              backoff_delay_ms: backoffDelay,
              error_type: error instanceof Error ? error.name : 'Unknown',
            },
          });

          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }

      // This should never happen due to the while loop condition, but TypeScript needs it
      throw new Error('Failed to fetch asset after all retry attempts');
    } catch (error) {
      // Log and rethrow as AssetError if it's not already
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      this.logger.error({
        message: `Failed to fetch asset content`,
        operation,
        path,
        error: this.formatError(error),
        requestId,
        context: 'asset_monitoring',
        action: 'asset_fetch_failure',
        timestamp: new Date().toISOString(),
        metrics: {
          total_duration_ms: totalDuration,
          error_type:
            error instanceof AssetError
              ? error.type
              : error instanceof Error
                ? error.name
                : 'Unknown',
          error_message: error instanceof Error ? error.message : String(error),
        },
      });

      if (error instanceof AssetError) {
        throw error;
      }

      throw this.createAssetError(
        'Failed to fetch asset content',
        AssetErrorType.UNKNOWN_ERROR,
        operation,
        { cause: error, assetPath: path }
      );
    }
  }

  /**
   * Fetch text asset content
   *
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving to the text content
   */
  async fetchTextAsset(bookSlug: string, assetName: string): Promise<string> {
    const operation = 'fetchTextAsset';
    const path = this.pathService.getAssetPath(AssetType.TEXT, bookSlug, assetName);

    this.logger.info({
      message: `Fetching text asset content`,
      operation,
      bookSlug,
      assetName,
      path,
    });

    try {
      const url = await this.getAssetUrl(AssetType.TEXT, bookSlug, assetName);

      // Use fetch with retries
      let attempts = 0;
      const maxAttempts = DEFAULT_RETRY_ATTEMPTS;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          const response = await fetch(url);

          if (!response.ok) {
            throw this.createAssetError(
              `Failed to fetch text asset: HTTP ${response.status} ${response.statusText}`,
              this.mapHttpStatusToErrorType(response.status),
              operation,
              { statusCode: response.status, assetPath: path }
            );
          }

          const content = await response.text();

          this.logger.info({
            message: `Successfully fetched text asset`,
            operation,
            path,
            contentLength: content.length,
          });

          return content;
        } catch (error) {
          // If this is the last attempt, rethrow
          if (attempts >= maxAttempts || !(error instanceof Error)) {
            throw error;
          }

          // Otherwise log and retry
          this.logger.warn({
            message: `Fetch attempt ${attempts} failed, retrying...`,
            operation,
            path,
            error: this.formatError(error),
          });

          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempts - 1))
          );
        }
      }

      // This should never happen due to the while loop condition, but TypeScript needs it
      throw new Error('Failed to fetch text asset after all retry attempts');
    } catch (error) {
      // Log and rethrow as AssetError if it's not already
      this.logger.error({
        message: `Failed to fetch text asset`,
        operation,
        bookSlug,
        assetName,
        error: this.formatError(error),
      });

      if (error instanceof AssetError) {
        throw error;
      }

      throw this.createAssetError(
        'Failed to fetch text asset',
        AssetErrorType.UNKNOWN_ERROR,
        operation,
        { cause: error, assetPath: path }
      );
    }
  }

  /**
   * Upload an asset
   *
   * TODO: Refactor to reduce complexity below threshold of 10
   *
   * @param context Object containing upload parameters
   * @returns Promise resolving when upload completes
   */
  /* eslint-disable-next-line complexity */
  async uploadAsset(context: {
    assetType: AssetType;
    bookSlug: string;
    assetName: string;
    content: Blob | ArrayBuffer | string;
    options?: UploadOptions;
  }): Promise<AssetUploadResult> {
    const { assetType, bookSlug, assetName, content, options } = context;
    const operation = 'uploadAsset';
    const path = this.pathService.getAssetPath(assetType, bookSlug, assetName);

    this.logger.info({
      message: `Uploading asset`,
      operation,
      assetType,
      bookSlug,
      assetName,
      path,
      contentType: options?.contentType,
    });

    try {
      // Convert content to Blob if it's not already
      let blob: Blob;

      if (content instanceof Blob) {
        blob = content;
      } else if (content instanceof ArrayBuffer) {
        blob = new Blob([content], { type: options?.contentType });
      } else {
        // String content
        blob = new Blob([content], { type: options?.contentType || 'text/plain' });
      }

      // Upload to Vercel Blob
      // Note: cacheControl and metadata are not available in PutCommandOptions, removed
      const result = await put(this.getFullPath(path), blob, {
        contentType: options?.contentType,
        addRandomSuffix: options?.addRandomSuffix || false,
        access: 'public',
      });

      this.logger.info({
        message: `Asset uploaded successfully`,
        operation,
        assetType,
        bookSlug,
        assetName,
        path,
        url: result.url,
        size: blob.size, // Use blob.size instead of contentLength
      });

      // Transform result to match AssetUploadResult
      // Use current date for uploadedAt since it's not available in PutBlobResult
      return {
        url: result.url,
        path: path,
        size: blob.size, // Use blob.size instead of contentLength
        contentType: result.contentType,
        uploadedAt: new Date(), // Use current date as upload timestamp
        metadata: options?.metadata,
      };
    } catch (error) {
      // Log and rethrow as AssetError
      this.logger.error({
        message: `Failed to upload asset`,
        operation,
        assetType,
        bookSlug,
        assetName,
        error: this.formatError(error),
      });

      throw this.createAssetError(
        'Failed to upload asset',
        AssetErrorType.STORAGE_ERROR,
        operation,
        { cause: error, assetPath: path }
      );
    }
  }

  /**
   * Delete an asset
   *
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param assetName Name of the specific asset
   * @returns Promise resolving when deletion completes
   */
  async deleteAsset(assetType: AssetType, bookSlug: string, assetName: string): Promise<boolean> {
    const operation = 'deleteAsset';
    const path = this.pathService.getAssetPath(assetType, bookSlug, assetName);

    this.logger.info({
      message: `Deleting asset`,
      operation,
      assetType,
      bookSlug,
      assetName,
      path,
    });

    try {
      // First check if the asset exists
      const exists = await this.assetExists(assetType, bookSlug, assetName);

      if (!exists) {
        this.logger.info({
          message: `Asset does not exist, skipping deletion`,
          operation,
          path,
        });

        return true;
      }

      // Get the full URL to delete
      const url = await this.getAssetUrl(assetType, bookSlug, assetName);

      // Delete the asset
      await del(url);

      this.logger.info({
        message: `Asset deleted successfully`,
        operation,
        path,
      });

      return true;
    } catch (error) {
      // Log and rethrow as AssetError
      this.logger.error({
        message: `Failed to delete asset`,
        operation,
        assetType,
        bookSlug,
        assetName,
        error: this.formatError(error),
      });

      throw this.createAssetError(
        'Failed to delete asset',
        AssetErrorType.STORAGE_ERROR,
        operation,
        { cause: error, assetPath: path }
      );
    }
  }

  /**
   * List assets of a specific type for a book
   *
   * @param assetType Type of asset
   * @param bookSlug Book identifier
   * @param options List options (e.g., pagination)
   * @returns Promise resolving to list of assets
   */
  async listAssets(
    assetType: AssetType,
    bookSlug: string,
    options?: ListOptions
  ): Promise<AssetListResult> {
    const operation = 'listAssets';
    const prefix = `${this.config.rootPrefix || 'assets'}/${assetType}/${bookSlug}/`;

    this.logger.info({
      message: `Listing assets`,
      operation,
      assetType,
      bookSlug,
      prefix,
      options,
    });

    try {
      // List assets from Vercel Blob
      const result = await list({
        prefix,
        limit: options?.limit,
        cursor: options?.cursor,
      });

      // Transform results to match AssetListResult
      // Import ListBlobResult from @vercel/blob doesn't include contentType in its type definition
      const assets: AssetInfo[] = result.blobs.map((blob) => {
        // Define explicit interface for blob from Vercel Blob service
        interface VercelBlobItem {
          pathname: string;
          url: string;
          size: number;
          uploadedAt: string;
          contentType?: string;
        }

        // Convert to unknown first, then to our interface to avoid direct type conversion errors
        const blobWithContentType = blob as unknown as VercelBlobItem;

        return {
          name: blob.pathname.split('/').pop() || '',
          path: blob.pathname,
          url: blob.url,
          size: blob.size,
          contentType: blobWithContentType.contentType || 'application/octet-stream', // Default if not present
          uploadedAt: new Date(blob.uploadedAt), // Assuming uploadedAt is a string ISO date
        };
      });

      this.logger.info({
        message: `Listed ${assets.length} assets`,
        operation,
        assetType,
        bookSlug,
        hasMore: !!result.cursor,
      });

      return {
        assets,
        cursor: result.cursor,
        hasMore: !!result.cursor,
      };
    } catch (error) {
      // Log and rethrow as AssetError
      this.logger.error({
        message: `Failed to list assets`,
        operation,
        assetType,
        bookSlug,
        error: this.formatError(error),
      });

      throw this.createAssetError(
        'Failed to list assets',
        AssetErrorType.STORAGE_ERROR,
        operation,
        { cause: error }
      );
    }
  }

  /**
   * Fetch asset content with retry logic
   *
   * @param path Asset path
   * @param operation Name of operation for logging
   * @returns Promise resolving to array buffer content
   * @private
   */
  private async fetchWithRetry(path: string, operation: string): Promise<ArrayBuffer> {
    try {
      const url = await this.getAssetUrl(
        this.getAssetTypeFromPath(path),
        this.getBookSlugFromPath(path),
        this.getAssetNameFromPath(path)
      );

      // Use fetch with retries
      let attempts = 0;
      const maxAttempts = DEFAULT_RETRY_ATTEMPTS;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          const response = await fetch(url);

          if (!response.ok) {
            throw this.createAssetError(
              `Failed to fetch asset: HTTP ${response.status} ${response.statusText}`,
              this.mapHttpStatusToErrorType(response.status),
              operation,
              { statusCode: response.status, assetPath: path }
            );
          }

          const content = await response.arrayBuffer();

          this.logger.info({
            message: `Successfully fetched asset content`,
            operation,
            path,
            contentLength: content.byteLength,
          });

          return content;
        } catch (error) {
          // If this is the last attempt, rethrow
          if (attempts >= maxAttempts || !(error instanceof Error)) {
            throw error;
          }

          // Otherwise log and retry
          this.logger.warn({
            message: `Fetch attempt ${attempts} failed, retrying...`,
            operation,
            path,
            error: this.formatError(error),
          });

          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, BASE_RETRY_DELAY * Math.pow(2, attempts - 1))
          );
        }
      }

      // This should never happen due to the while loop condition, but TypeScript needs it
      throw new Error('Failed to fetch asset after all retry attempts');
    } catch (error) {
      // Log and rethrow as AssetError if it's not already
      this.logger.error({
        message: `Failed to fetch asset content`,
        operation,
        path,
        error: this.formatError(error),
      });

      if (error instanceof AssetError) {
        throw error;
      }

      throw this.createAssetError(
        'Failed to fetch asset content',
        AssetErrorType.UNKNOWN_ERROR,
        operation,
        { cause: error, assetPath: path }
      );
    }
  }

  /**
   * Get the full path for an asset
   *
   * @param path Asset path
   * @returns Full path including prefix
   * @private
   */
  private getFullPath(path: string): string {
    // Add a root prefix if it doesn't already have one
    if (path.startsWith('assets/')) {
      return path;
    }

    return `assets/${path}`;
  }

  /**
   * Create an AssetError with appropriate context
   *
   * @param message Error message
   * @param type Error type
   * @param operation Operation that was being performed
   * @param options Additional error options
   * @returns AssetError instance
   * @private
   */
  private createAssetError(
    message: string,
    type: AssetErrorType,
    operation: string,
    options?: {
      cause?: unknown;
      statusCode?: number;
      assetPath?: string;
    }
  ): AssetError {
    return new AssetError(message, type, operation, options);
  }

  /**
   * Map HTTP status code to AssetErrorType
   *
   * @param status HTTP status code
   * @returns Appropriate AssetErrorType
   * @private
   */
  private mapHttpStatusToErrorType(status: number): AssetErrorType {
    switch (status) {
      case 404:
        return AssetErrorType.NOT_FOUND;
      case 401:
        return AssetErrorType.UNAUTHORIZED;
      case 403:
        return AssetErrorType.FORBIDDEN;
      case 409:
        return AssetErrorType.CONFLICT;
      case 400:
        return AssetErrorType.VALIDATION_ERROR;
      default:
        return status >= 500 ? AssetErrorType.STORAGE_ERROR : AssetErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * Format error for logging
   *
   * @param error Error to format
   * @returns Formatted error object
   * @private
   */
  private formatError(error: unknown): Record<string, unknown> {
    if (error instanceof AssetError) {
      return {
        message: error.message,
        type: error.type,
        operation: error.operation,
        statusCode: error.statusCode,
        assetPath: error.assetPath,
        cause: error.cause ? this.formatError(error.cause) : undefined,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
        cause: error.cause ? this.formatError(error.cause) : undefined,
      };
    }

    return { error };
  }

  /**
   * Extract the asset type from a path
   *
   * @param path Asset path
   * @returns AssetType
   * @private
   */
  private getAssetTypeFromPath(path: string): AssetType {
    const parts = path.split('/');
    if (parts.length >= 2) {
      const typeStr = parts[1].toLowerCase();
      switch (typeStr) {
        case 'audio':
          return AssetType.AUDIO;
        case 'text':
          return AssetType.TEXT;
        case 'image':
          return AssetType.IMAGE;
        default:
          return AssetType.TEXT; // Default to text
      }
    }
    return AssetType.TEXT; // Default to text
  }

  /**
   * Extract the book slug from a path
   *
   * @param path Asset path
   * @returns Book slug
   * @private
   */
  private getBookSlugFromPath(path: string): string {
    const parts = path.split('/');
    if (parts.length >= 3) {
      return parts[2];
    }
    return 'unknown';
  }

  /**
   * Extract the asset name from a path
   *
   * @param path Asset path
   * @returns Asset name
   * @private
   */
  private getAssetNameFromPath(path: string): string {
    const parts = path.split('/');
    if (parts.length >= 4) {
      return parts[parts.length - 1];
    }
    return path;
  }
}

// Export singleton instance
export const vercelBlobAssetService = new VercelBlobAssetService(
  // This will be replaced during dependency injection
  // Using a more specific type assertion to avoid 'any'
  undefined as unknown as AssetPathService,
  {
    baseUrl: process.env.NEXT_PUBLIC_BLOB_BASE_URL,
    rootPrefix: 'assets',
    defaultCacheControl: 'public, max-age=31536000',
    defaultCacheBusting: false,
  }
);
