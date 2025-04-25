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

// Cache for existence checks to avoid repeated HEAD requests
const existenceCache: Record<string, boolean> = {};

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
 * @param useCache Whether to use cached existence results (defaults to true)
 * @returns Promise resolving to true if the asset exists in Blob storage, false otherwise
 */
export async function assetExistsInBlobStorage(
  legacyPath: string,
  options: Omit<BlobUrlOptions, 'useBlobStorage' | 'noCache'> = {},
  useCache: boolean = true
): Promise<boolean> {
  // Check existence cache if enabled
  if (useCache && legacyPath in existenceCache) {
    return existenceCache[legacyPath];
  }
  
  try {
    // Always use noCache for checking existence to avoid cached 404 responses
    const blobUrl = getBlobUrl(legacyPath, { ...options, noCache: true });
    const fileInfo = await blobService.getFileInfo(blobUrl);
    const exists = fileInfo.size > 0;
    
    // Cache the result if caching is enabled
    if (useCache) {
      existenceCache[legacyPath] = exists;
    }
    
    return exists;
  } catch (error) {
    if (useCache) {
      existenceCache[legacyPath] = false;
    }
    return false;
  }
}

/**
 * Gets a URL for an asset with automatic fallback to local path
 * if the asset doesn't exist in Blob storage
 * 
 * This function is ideal during migration when some assets may
 * be in Blob storage while others are still served locally.
 * 
 * @param legacyPath The legacy path to the asset
 * @param options Optional URL generation options
 * @returns Promise resolving to the most appropriate URL for the asset
 */
export async function getAssetUrlWithFallback(
  legacyPath: string,
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {}
): Promise<string> {
  try {
    // Check if the asset exists in Blob storage (use cache for performance)
    const exists = await assetExistsInBlobStorage(legacyPath, options);
    
    if (exists) {
      // If it exists in Blob, use the Blob URL
      return getBlobUrl(legacyPath, options);
    } else {
      // If it doesn't exist in Blob, use the local path
      console.info(`Asset not found in Blob storage, using local path: ${legacyPath}`);
      return legacyPath;
    }
  } catch (error) {
    // On any error, fall back to the local path for safety
    console.warn(`Error checking Blob storage, falling back to local path: ${legacyPath}`, error);
    return legacyPath;
  }
}

/**
 * Utility to fetch text content with automatic fallback
 * 
 * Tries to fetch from Blob storage first, falls back to local path if needed
 * 
 * @param legacyPath The legacy path to the text asset
 * @param options Optional URL generation options
 * @returns Promise resolving to the text content
 */
export async function fetchTextWithFallback(
  legacyPath: string,
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {}
): Promise<string> {
  try {
    // First try Blob storage
    const blobUrl = getBlobUrl(legacyPath, options);
    try {
      return await blobService.fetchText(blobUrl);
    } catch (blobError) {
      console.warn(`Failed to fetch from Blob, trying local path: ${legacyPath}`, blobError);
      
      // If Blob fetch fails, try the local path
      const response = await fetch(legacyPath);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.text();
    }
  } catch (error) {
    console.error(`All fetch attempts failed for: ${legacyPath}`, error);
    throw new Error(`Failed to fetch text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clear the URL cache and existence cache
 * Useful for testing or when URLs or asset availability might change
 */
export function clearBlobUrlCache(): void {
  Object.keys(urlCache).forEach(key => delete urlCache[key]);
  Object.keys(existenceCache).forEach(key => delete existenceCache[key]);
}