import { type ListBlobResultBlob, head, list, put } from '@vercel/blob';

import { AssetDestinationAdapter, AssetSourceAdapter } from '../../types/migration';
import { logger } from '../logger';

/**
 * Shared utility methods for Vercel Blob adapters
 */
class VercelBlobUtils {
  /**
   * Get the base URL for Vercel Blob
   * @returns The base URL for Vercel Blob
   */
  public static getBlobBaseUrl(): string {
    return process.env.NEXT_PUBLIC_BLOB_BASE_URL || 'https://public.blob.vercel-storage.com';
  }

  /**
   * Get a full URL for a blob path
   * @param path The blob path
   * @returns The full URL for the blob
   */
  public static getUrlForPath(path: string): string {
    const baseUrl = this.getBlobBaseUrl();
    const cleanPath = path.replace(/^\/+/, ''); // Remove leading slashes
    return `${baseUrl}/${cleanPath}`;
  }

  /**
   * Extract a blob path from a URL
   * @param url The blob URL
   * @returns The blob path
   */
  public static getPathFromUrl(url: string): string {
    const baseUrl = this.getBlobBaseUrl();
    if (url.startsWith(baseUrl)) {
      return url.substring(baseUrl.length + 1); // +1 for the trailing slash
    }
    return url;
  }
}

/**
 * Vercel Blob adapter for retrieving assets
 */
export class VercelBlobSourceAdapter implements AssetSourceAdapter {
  public readonly name = 'VercelBlob';
  public readonly type = 'vercel-blob' as const;

  /**
   * List all assets in Vercel Blob
   * @param prefix Optional prefix to filter by
   * @param options Optional listing options
   * @returns Promise resolving to a list of assets
   */
  public async listAssets(
    prefix?: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    assets: {
      path: string;
      size?: number;
      contentType?: string;
      lastModified?: Date;
      metadata?: Record<string, string>;
    }[];
    cursor?: string;
    hasMore: boolean;
  }> {
    try {
      logger.debug(`Listing Vercel Blob assets with prefix: ${prefix || 'none'}`);

      const response = await list({
        prefix,
        limit: options?.limit,
        cursor: options?.cursor,
      });

      // Map the response to our standardized format
      const assets = response.blobs.map((blob: ListBlobResultBlob) => ({
        path: blob.pathname,
        size: blob.size,
        contentType: blob.contentType,
        lastModified: new Date(blob.uploadedAt),
        // Vercel Blob doesn't expose metadata in list results
      }));

      logger.debug(`Listed ${assets.length} Vercel Blob assets`);

      return {
        assets,
        cursor: response.cursor,
        hasMore: assets.length > 0 && !!response.cursor,
      };
    } catch (error) {
      logger.error('Error listing assets from Vercel Blob:', error);
      throw new Error(
        `Failed to list assets from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch an asset from Vercel Blob
   * @param path Path to the asset
   * @returns Promise resolving to the asset content
   */
  public async fetchAsset(path: string): Promise<{
    content: ArrayBuffer;
    contentType?: string;
    size: number;
    metadata?: Record<string, string>;
  }> {
    try {
      logger.debug(`Fetching Vercel Blob asset: ${path}`);

      // Construct the URL for the asset
      const url = VercelBlobUtils.getUrlForPath(path);

      // Fetch the asset
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch asset from Vercel Blob: ${response.status} ${response.statusText}`
        );
      }

      // Get the content
      const content = await response.arrayBuffer();

      // Get content type from the response
      const contentType = response.headers.get('content-type') || undefined;

      logger.debug(`Successfully fetched Vercel Blob asset: ${path}`);

      return {
        content,
        contentType,
        size: content.byteLength,
        // Metadata not available from fetch API
      };
    } catch (error) {
      logger.error(`Error fetching asset from Vercel Blob (${path}):`, error);
      throw new Error(
        `Failed to fetch asset from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an asset exists in Vercel Blob
   * @param path Path to the asset
   * @returns Promise resolving to true if the asset exists
   */
  public async assetExists(path: string): Promise<boolean> {
    try {
      logger.debug(`Checking if Vercel Blob asset exists: ${path}`);

      // Construct the URL for the asset
      const url = VercelBlobUtils.getUrlForPath(path);

      // Use the head function to check if the asset exists
      const result = await head(url);

      logger.debug(`Vercel Blob asset exists: ${path}`);
      return true;
    } catch (error) {
      // If a 404 error is thrown, the asset doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        logger.debug(`Vercel Blob asset does not exist: ${path}`);
        return false;
      }

      logger.error(`Error checking if Vercel Blob asset exists (${path}):`, error);
      throw new Error(
        `Failed to check if asset exists in Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get asset metadata from Vercel Blob
   * @param path Path to the asset
   * @returns Promise resolving to asset metadata
   */
  public async getAssetInfo(path: string): Promise<{
    path: string;
    size?: number;
    contentType?: string;
    lastModified?: Date;
    metadata?: Record<string, string>;
  } | null> {
    try {
      logger.debug(`Getting Vercel Blob asset info: ${path}`);

      // Construct the URL for the asset
      const url = VercelBlobUtils.getUrlForPath(path);

      // Use the head function to get asset info
      const info = await head(url);

      logger.debug(`Retrieved Vercel Blob asset info: ${path}`);

      return {
        path,
        size: info.size,
        contentType: info.contentType,
        lastModified: new Date(info.uploadedAt),
        // Metadata not available from head API
      };
    } catch (error) {
      // If a 404 error is thrown, the asset doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        logger.debug(`Vercel Blob asset does not exist: ${path}`);
        return null;
      }

      logger.error(`Error getting Vercel Blob asset info (${path}):`, error);
      throw new Error(
        `Failed to get asset info from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Vercel Blob adapter for storing assets
 */
export class VercelBlobDestinationAdapter implements AssetDestinationAdapter {
  public readonly name = 'VercelBlob';

  /**
   * Upload an asset to Vercel Blob
   * @param path Path to store the asset
   * @param content Asset content
   * @param options Upload options
   * @returns Promise resolving to information about the uploaded asset
   */
  public async uploadAsset(
    path: string,
    content: ArrayBuffer,
    options?: {
      contentType?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<{
    path: string;
    url: string;
    size: number;
    contentType?: string;
  }> {
    try {
      logger.debug(`Uploading asset to Vercel Blob: ${path}`);

      // Create a blob from the content
      const blob = new Blob([content], {
        type: options?.contentType,
      });

      // Upload the asset
      const result = await put(path, blob, {
        access: 'public',
        contentType: options?.contentType,
        // Metadata is not supported by Vercel Blob
      });

      logger.debug(`Successfully uploaded asset to Vercel Blob: ${path}`);

      return {
        path,
        url: result.url,
        size: result.size,
        contentType: options?.contentType,
      };
    } catch (error) {
      logger.error(`Error uploading asset to Vercel Blob (${path}):`, error);
      throw new Error(
        `Failed to upload asset to Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an asset exists in Vercel Blob
   * @param path Path to the asset
   * @returns Promise resolving to true if the asset exists
   */
  public async assetExists(path: string): Promise<boolean> {
    try {
      logger.debug(`Checking if Vercel Blob asset exists: ${path}`);

      // Construct the URL for the asset
      const url = VercelBlobUtils.getUrlForPath(path);

      // Use the head function to check if the asset exists
      await head(url);

      logger.debug(`Vercel Blob asset exists: ${path}`);
      return true;
    } catch (error) {
      // If a 404 error is thrown, the asset doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        logger.debug(`Vercel Blob asset does not exist: ${path}`);
        return false;
      }

      logger.error(`Error checking if Vercel Blob asset exists (${path}):`, error);
      throw new Error(
        `Failed to check if asset exists in Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get asset metadata from Vercel Blob
   * @param path Path to the asset
   * @returns Promise resolving to asset metadata
   */
  public async getAssetInfo(path: string): Promise<{
    path: string;
    size?: number;
    contentType?: string;
    lastModified?: Date;
    metadata?: Record<string, string>;
  } | null> {
    try {
      logger.debug(`Getting Vercel Blob asset info: ${path}`);

      // Construct the URL for the asset
      const url = VercelBlobUtils.getUrlForPath(path);

      // Use the head function to get asset info
      const info = await head(url);

      logger.debug(`Retrieved Vercel Blob asset info: ${path}`);

      return {
        path,
        size: info.size,
        contentType: info.contentType,
        lastModified: new Date(info.uploadedAt),
        // Metadata not available from head API
      };
    } catch (error) {
      // If a 404 error is thrown, the asset doesn't exist
      if (error instanceof Error && error.message.includes('404')) {
        logger.debug(`Vercel Blob asset does not exist: ${path}`);
        return null;
      }

      logger.error(`Error getting Vercel Blob asset info (${path}):`, error);
      throw new Error(
        `Failed to get asset info from Vercel Blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
