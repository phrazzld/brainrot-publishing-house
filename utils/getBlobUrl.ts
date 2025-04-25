import { blobService } from './services/BlobService';
import { blobPathService } from './services/BlobPathService';

// URL generation options interface
export interface BlobUrlOptions {
  /** Base URL to use (overrides environment variables) */
  baseUrl?: string;
  /** Force no-cache by adding timestamp parameter */
  noCache?: boolean;
  /** Whether to use Blob storage or return local path (for migration) */
  useBlobStorage?: boolean;
  /** Environment to use (development or production) */
  environment?: 'development' | 'production';
}

// Cache for blob URLs to improve performance
const urlCache: Record<string, string> = {};

/**
 * Generate a public URL for a Blob asset
 * 
 * This is the primary function to use for generating Blob URLs.
 * It supports both blob paths and legacy paths, and can be configured with various options.
 * 
 * @param path The path to the asset (can be a blob path or legacy path)
 * @param options Configuration options for URL generation
 * @returns The public URL for the Blob asset
 */
export function generateBlobUrl(path: string, options: BlobUrlOptions = {}): string {
  // Default options
  const {
    baseUrl,
    noCache = false,
    useBlobStorage = true,
    environment = process.env.NODE_ENV as 'development' | 'production'
  } = options;
  
  // If not using Blob storage, return the path as is (for legacy paths)
  if (!useBlobStorage && path.startsWith('/')) {
    return path;
  }
  
  // Check cache first if caching is enabled
  const cacheKey = `${path}-${baseUrl}-${environment}-${useBlobStorage}`;
  if (!noCache && urlCache[cacheKey]) {
    return urlCache[cacheKey];
  }
  
  // Determine if this is a legacy path that needs conversion
  const isLegacyPath = path.startsWith('/');
  
  // Convert legacy path to blob path if needed
  const blobPath = isLegacyPath 
    ? blobPathService.convertLegacyPath(path)
    : path;
  
  // Generate URL with the correct base URL for the environment
  let blobBaseUrl = baseUrl;
  if (!blobBaseUrl) {
    blobBaseUrl = environment === 'development'
      ? process.env.NEXT_PUBLIC_BLOB_DEV_URL || process.env.NEXT_PUBLIC_BLOB_BASE_URL
      : process.env.NEXT_PUBLIC_BLOB_BASE_URL;
  }
  
  // Get the full URL
  const url = blobService.getUrlForPath(blobPath, { baseUrl: blobBaseUrl, noCache });
  
  // Cache the result if caching is enabled
  if (!noCache) {
    urlCache[cacheKey] = url;
  }
  
  return url;
}

/**
 * Convert a legacy asset path to a Blob URL
 * 
 * @param legacyPath The legacy path (e.g., /assets/hamlet/images/hamlet-01.png)
 * @param options Optional configuration for URL generation
 * @returns The Blob URL for the asset
 */
export function getBlobUrl(legacyPath: string, options: Omit<BlobUrlOptions, 'useBlobStorage'> = {}): string {
  return generateBlobUrl(legacyPath, { ...options, useBlobStorage: true });
}

/**
 * Determine if an asset should use Blob storage or fallback to local path
 * 
 * This is a temporary function to use during migration. Once all assets
 * are migrated, we can remove this and use getBlobUrl directly.
 * 
 * @param legacyPath The legacy path
 * @param useBlobStorage Whether to use Blob storage (can be used to globally toggle for testing)
 * @param options Additional URL generation options
 * @returns The path to use (either Blob URL or legacy path)
 */
export function getAssetUrl(
  legacyPath: string, 
  useBlobStorage: boolean = true,
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {}
): string {
  return generateBlobUrl(legacyPath, { ...options, useBlobStorage });
}

/**
 * Check if an asset exists in Blob storage
 * 
 * @param legacyPath The legacy path
 * @param options Optional URL generation options
 * @returns Promise resolving to true if the asset exists in Blob storage, false otherwise
 */
export async function assetExistsInBlobStorage(
  legacyPath: string,
  options: Omit<BlobUrlOptions, 'useBlobStorage' | 'noCache'> = {}
): Promise<boolean> {
  try {
    // Always use noCache for checking existence to avoid cached 404 responses
    const blobUrl = getBlobUrl(legacyPath, { ...options, noCache: true });
    const fileInfo = await blobService.getFileInfo(blobUrl);
    return fileInfo.size > 0;
  } catch (error) {
    return false;
  }
}

// Clear the URL cache - useful for testing or when URLs might change
export function clearBlobUrlCache(): void {
  Object.keys(urlCache).forEach(key => delete urlCache[key]);
}