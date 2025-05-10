import {
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';

import { AssetSourceAdapter } from '../../types/migration';
import { logger } from '../logger';

/**
 * Digital Ocean Spaces adapter for retrieving assets
 */
export class DigitalOceanSourceAdapter implements AssetSourceAdapter {
  public readonly name = 'DigitalOceanSpaces';
  public readonly type = 'digital-ocean' as const;

  private client: S3Client;
  private bucket: string;

  /**
   * Create a new Digital Ocean source adapter
   */
  constructor() {
    // Check for required environment variables
    const requiredEnvVars = [
      'DO_SPACES_ACCESS_KEY',
      'DO_SPACES_SECRET_KEY',
      'DO_SPACES_ENDPOINT',
      'DO_SPACES_BUCKET',
    ];

    const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

    if (missingEnvVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
    }

    this.bucket = process.env.DO_SPACES_BUCKET!;

    // Parse the endpoint to get the region
    const endpoint = process.env.DO_SPACES_ENDPOINT!;
    const region = endpoint.split('.')[0]; // nyc3.digitaloceanspaces.com -> nyc3

    this.client = new S3Client({
      region,
      endpoint: `https://${endpoint}`,
      credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY!,
        secretAccessKey: process.env.DO_SPACES_SECRET_KEY!,
      },
    });

    logger.info(`Initialized Digital Ocean Spaces adapter for bucket: ${this.bucket}`);
  }

  /**
   * List all assets in Digital Ocean Spaces
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
      logger.debug(`Listing Digital Ocean assets with prefix: ${prefix || 'none'}`);

      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: options?.limit || 1000,
        ContinuationToken: options?.cursor,
      });

      const response: ListObjectsV2CommandOutput = await this.client.send(command);

      // Map the response to our standardized format
      const assets = (response.Contents || []).map((item) => ({
        path: item.Key || '',
        size: item.Size,
        lastModified: item.LastModified,
        // We don't get content type in the list, so we'll have to fetch it separately if needed
      }));

      logger.debug(`Listed ${assets.length} Digital Ocean assets`);

      return {
        assets,
        cursor: response.NextContinuationToken,
        hasMore: !!response.IsTruncated,
      };
    } catch (error) {
      logger.error('Error listing assets from Digital Ocean:', error);
      throw new Error(
        `Failed to list assets from Digital Ocean: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Fetch an asset from Digital Ocean Spaces
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
      logger.debug(`Fetching Digital Ocean asset: ${path}`);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response: GetObjectCommandOutput = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`Empty response body for asset: ${path}`);
      }

      // Convert the body to an ArrayBuffer
      const streamReader = response.Body.transformToWebStream().getReader();
      const chunks: Uint8Array[] = [];

      let result;
      while (!(result = await streamReader.read()).done) {
        chunks.push(result.value);
      }

      // Combine all chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const content = new Uint8Array(totalLength);

      let offset = 0;
      for (const chunk of chunks) {
        content.set(chunk, offset);
        offset += chunk.length;
      }

      // Extract metadata from the response
      const metadata = response.Metadata ? { ...response.Metadata } : undefined;

      logger.debug(`Successfully fetched Digital Ocean asset: ${path}`);

      return {
        content: content.buffer,
        contentType: response.ContentType,
        size: content.byteLength,
        metadata,
      };
    } catch (error) {
      logger.error(`Error fetching asset from Digital Ocean (${path}):`, error);
      throw new Error(
        `Failed to fetch asset from Digital Ocean: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an asset exists in Digital Ocean Spaces
   * @param path Path to the asset
   * @returns Promise resolving to true if the asset exists
   */
  public async assetExists(path: string): Promise<boolean> {
    try {
      logger.debug(`Checking if Digital Ocean asset exists: ${path}`);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      await this.client.send(command);

      // If we got here, the asset exists
      logger.debug(`Digital Ocean asset exists: ${path}`);
      return true;
    } catch (error) {
      // If the error is a 404, the asset doesn't exist
      if ((error as { name?: string })?.name === 'NotFound') {
        logger.debug(`Digital Ocean asset does not exist: ${path}`);
        return false;
      }

      // For other errors, we'll rethrow
      logger.error(`Error checking if Digital Ocean asset exists (${path}):`, error);
      throw new Error(
        `Failed to check if asset exists in Digital Ocean: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get asset metadata from Digital Ocean Spaces
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
      logger.debug(`Getting Digital Ocean asset info: ${path}`);

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });

      const response: HeadObjectCommandOutput = await this.client.send(command);

      logger.debug(`Retrieved Digital Ocean asset info: ${path}`);

      return {
        path,
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata ? { ...response.Metadata } : undefined,
      };
    } catch (error) {
      // If the error is a 404, the asset doesn't exist
      if ((error as { name?: string })?.name === 'NotFound') {
        logger.debug(`Digital Ocean asset does not exist: ${path}`);
        return null;
      }

      logger.error(`Error getting Digital Ocean asset info (${path}):`, error);
      throw new Error(
        `Failed to get asset info from Digital Ocean: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
