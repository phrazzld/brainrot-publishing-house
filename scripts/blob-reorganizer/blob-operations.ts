/**
 * Blob operation utilities for the reorganization tool
 */
import { del, list, put } from '@vercel/blob';
import { createHash } from 'crypto';

import { AssetType } from '../../types/assets';
import { AssetPathService } from '../../utils/services/AssetPathService';
import { logger as _logger } from './logging';
import { CliOptions, ExtendedBlobResult, PathMapping } from './types';

// Initialize AssetPathService
const assetPathService = new AssetPathService();

/**
 * Determine asset type and book slug from path
 */
export function getAssetTypeAndSlug(path: string): {
  assetType: AssetType | 'shared' | 'site' | null;
  bookSlug: string | null;
} {
  // Try to determine the asset type and book slug based on the path
  if (path.startsWith('books/')) {
    const parts = path.split('/');
    if (parts.length >= 3) {
      const bookSlug = parts[1];

      switch (parts[2]) {
        case 'images':
          return { assetType: AssetType.IMAGE, bookSlug };
        case 'audio':
          return { assetType: AssetType.AUDIO, bookSlug };
        case 'text':
          return { assetType: AssetType.TEXT, bookSlug };
        default:
          return { assetType: null, bookSlug: null };
      }
    }
  } else if (path.match(/^[^/]+\/audio\//)) {
    // Direct audio path: hamlet/audio/act-1.mp3
    const parts = path.split('/');
    return { assetType: AssetType.AUDIO, bookSlug: parts[0] };
  } else if (path.startsWith('images/')) {
    return { assetType: 'shared', bookSlug: null };
  } else if (path.startsWith('site-assets/')) {
    return { assetType: 'site', bookSlug: null };
  }

  return { assetType: null, bookSlug: null };
}

/**
 * List all assets in Vercel Blob
 */
export async function listAllBlobs(options: {
  prefix?: string;
  limit?: number;
}): Promise<ExtendedBlobResult[]> {
  const allBlobs: ExtendedBlobResult[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: options.prefix,
      limit: 1000,
      cursor,
    });

    // Map the API result to our extended type
    const extendedBlobs = result.blobs.map((blob) => {
      // First convert to unknown, then to our custom structure to avoid type errors
      const blobWithContentType = blob as unknown as {
        pathname: string;
        url: string;
        size: number;
        contentType?: string;
        uploadedAt: string | Date;
      };

      return {
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        contentType: blobWithContentType.contentType || 'application/octet-stream', // Provide a default
        uploadedAt:
          typeof blob.uploadedAt === 'string'
            ? blob.uploadedAt
            : blob.uploadedAt
              ? new Date(blob.uploadedAt).toISOString()
              : new Date().toISOString(),
      };
    });

    allBlobs.push(...extendedBlobs);
    cursor = result.cursor;

    logger.info({ msg: `Listed ${allBlobs.length} blobs so far...` });

    if (options.limit && allBlobs.length >= options.limit) {
      allBlobs.splice(options.limit);
      break;
    }
  } while (cursor);

  return allBlobs;
}

/**
 * Map current paths to new paths using the AssetPathService
 */
export function mapPaths(blobs: ExtendedBlobResult[]): PathMapping[] {
  const mappings: PathMapping[] = [];

  for (const blob of blobs) {
    try {
      const path = blob.pathname;
      const { assetType, bookSlug } = getAssetTypeAndSlug(path);

      // Skip if we couldn't determine the asset type
      if (!assetType) {
        logger.warn({ msg: `Skipping blob with unrecognized path pattern: ${path}` });
        continue;
      }

      // Generate the new path using AssetPathService
      const newPath = assetPathService.convertLegacyPath(path);

      // Skip if the path doesn't change
      if (newPath === path) {
        logger.debug({ msg: `Path already in correct format, skipping: ${path}` });
        continue;
      }

      mappings.push({
        originalPath: path,
        newPath,
        assetType,
        bookSlug,
        contentType: blob.contentType,
        size: blob.size,
        url: blob.url,
      });
    } catch (error) {
      logger.error({ msg: `Error mapping path for blob ${blob.pathname}:`, error });
    }
  }

  return mappings;
}

/**
 * Compute hash of content for verification
 */
export async function computeContentHash(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
  }

  const content = await response.arrayBuffer();
  return createHash('sha256').update(Buffer.from(content)).digest('hex');
}

/**
 * Move a blob to its new path
 */
export async function moveBlob(mapping: PathMapping, options: CliOptions): Promise<boolean> {
  try {
    if (options.dryRun) {
      logger.info({
        msg: `[DRY RUN] Would move: ${mapping.originalPath} -> ${mapping.newPath}`,
      });
      return true;
    }

    // Fetch the blob content
    const response = await fetch(mapping.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
    }

    const content = await response.arrayBuffer();

    // Compute content hash for verification
    const originalHash = createHash('sha256').update(Buffer.from(content)).digest('hex');

    // Upload to the new path
    logger.info({ msg: `Moving blob: ${mapping.originalPath} -> ${mapping.newPath}` });
    const result = await put(mapping.newPath, new Blob([content], { type: mapping.contentType }), {
      access: 'public',
      contentType: mapping.contentType,
    });

    // Verify content hash if verification is enabled
    if (!options.skipVerification) {
      const newHash = await computeContentHash(result.url);
      if (originalHash !== newHash) {
        throw new Error('Content verification failed: hash mismatch');
      }
    }

    // Delete the original blob
    await del(mapping.url);

    logger.info({
      msg: `Successfully moved: ${mapping.originalPath} -> ${mapping.newPath}`,
    });
    return true;
  } catch (error) {
    logger.error({ msg: `Error moving blob ${mapping.originalPath}:`, error });
    return false;
  }
}
