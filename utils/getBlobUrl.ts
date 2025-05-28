import { mapAssetPath } from './assetPathMapping';
import { logger } from './logger';
import { blobPathService } from './services/BlobPathService';
import { blobService } from './services/BlobService';

const moduleLogger = logger.child({ module: 'getBlobUrl' });
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
 * Determines if a path is in legacy format (starts with '/')
 */
function isLegacyPath(path: string): boolean {
  return path.startsWith('/');
}

/**
 * Converts a path to blob format if it's a legacy path
 */
function convertToBlobPath(path: string): string {
  return isLegacyPath(path) ? blobPathService.convertLegacyPath(path) : path;
}

/**
 * Generates a cache key for the URL cache
 */
function getCacheKey(
  path: string,
  baseUrl?: string,
  environment?: string,
  useBlobStorage = true,
): string {
  return `${path}-${baseUrl}-${environment}-${useBlobStorage}`;
}

/**
 * Retrieves a URL from the cache if available
 * @returns The cached URL or null if not found
 */
function getCachedUrl(cacheKey: string): string | null {
  return urlCache[cacheKey] || null;
}

/**
 * Determines the appropriate base URL based on environment
 */
function determineBaseUrl(
  environment: 'development' | 'production',
  customBaseUrl?: string,
): string {
  if (customBaseUrl) {
    return customBaseUrl;
  }

  if (environment === 'development') {
    return process.env.NEXT_PUBLIC_BLOB_DEV_URL || process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';
  }

  return process.env.NEXT_PUBLIC_BLOB_BASE_URL || '';
}

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
  // Process options with defaults
  const {
    baseUrl,
    noCache = false,
    useBlobStorage = true,
    environment = process.env.NODE_ENV as 'development' | 'production',
  } = options;

  // Early return if not using Blob storage for legacy paths
  if (!useBlobStorage && isLegacyPath(path)) {
    return path;
  }

  // Check cache if enabled
  const cacheKey = getCacheKey(path, baseUrl, environment, useBlobStorage);
  const cachedUrl = !noCache ? getCachedUrl(cacheKey) : null;
  if (cachedUrl) {
    return cachedUrl;
  }

  // Convert path if needed
  const blobPath = convertToBlobPath(path);

  // If the path starts with 'assets/', it's already in the new format - don't convert it
  const finalPath = path.startsWith('assets/') ? path : blobPath;

  // Determine the base URL
  const blobBaseUrl = determineBaseUrl(environment, baseUrl);

  // Generate the full URL - use the path directly without legacy conversion
  const url = finalPath.startsWith('http') ? finalPath : `${blobBaseUrl}/${finalPath}`;

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
export function getBlobUrl(
  legacyPath: string,
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {},
): string {
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
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {},
): string {
  if (!useBlobStorage) {
    return legacyPath;
  }

  // Apply asset path mapping first to handle known discrepancies
  const mappedPath = mapAssetPath(legacyPath);

  // If we got a direct mapping, use it
  if (mappedPath !== legacyPath) {
    const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL;
    // Don't process mapped paths further - use them directly
    return `${baseUrl}/${mappedPath}`;
  }

  // Define coming soon books that are in the new format
  const comingSoonBooksInNewFormat = [
    'pride-and-prejudice',
    'paradise-lost',
    'meditations',
    'the-divine-comedy-inferno',
    'the-divine-comedy-purgatorio',
    'the-divine-comedy-paradiso',
    'the-bible-old-testament',
    'the-bible-new-testament',
    'the-quran',
    'romeo-and-juliet',
    'a-midsummer-nights-dream',
    'gilgamesh',
    'bhagavad-gita',
  ];

  // Check if this is a coming soon book in the new format
  const pathMatch = legacyPath.match(/^\/assets\/([^/]+)\/images\/[^/]+\.(png|jpg|jpeg)$/);
  if (pathMatch) {
    const bookSlug = pathMatch[1];
    if (comingSoonBooksInNewFormat.includes(bookSlug)) {
      const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL;
      // Remove leading slash and return directly
      const cleanPath = legacyPath.substring(1);
      return `${baseUrl}/${cleanPath}`;
    }
  }

  // If the path already starts with 'assets/', convert it to the blob path format
  if (legacyPath.startsWith('/assets/')) {
    const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL;
    // Remove /assets/ prefix and generate blob path
    const pathWithoutAssets = legacyPath.substring('/assets/'.length);

    // Convert legacy asset paths to standard blob paths
    if (pathWithoutAssets.startsWith('text/')) {
      // Standard text path like /assets/text/hamlet/brainrot-act-01.txt
      const blobPath = blobPathService.convertLegacyPath(legacyPath);
      return `${baseUrl}/${blobPath}`;
    } else if (pathWithoutAssets.match(/^[^/]+\/text\//)) {
      // Non-standard text path like /assets/the-iliad/text/book-01.txt
      // Convert to standard blob path
      const blobPath = blobPathService.convertLegacyPath(legacyPath);
      return `${baseUrl}/${blobPath}`;
    } else if (pathWithoutAssets.match(/^[^/]+\/images?\//)) {
      // Image path like /assets/hamlet/images/hamlet-07.png
      const blobPath = blobPathService.convertLegacyPath(legacyPath);
      return `${baseUrl}/${blobPath}`;
    } else {
      // Other asset paths - convert normally
      const blobPath = blobPathService.convertLegacyPath(legacyPath);
      return `${baseUrl}/${blobPath}`;
    }
  }

  return generateBlobUrl(legacyPath, { ...options, useBlobStorage });
}

/**
 * Check if asset existence is cached
 */
function getExistenceFromCache(path: string, useCache: boolean): boolean | null {
  if (useCache && path in existenceCache) {
    return existenceCache[path];
  }
  return null;
}

/**
 * Store asset existence result in cache
 */
function cacheExistenceResult(path: string, exists: boolean, useCache: boolean): void {
  if (useCache) {
    existenceCache[path] = exists;
  }
}

/**
 * Normalize a Blob path to handle URL format discrepancies
 */
function normalizeBlobPath(path: string, baseUrl?: string): string {
  // If this is not a URL or we don't have a base URL, just return the path
  if (!path.startsWith('https://') || !baseUrl) {
    return path;
  }

  // If the path contains the generic Vercel Blob URL but we have a specific one, replace it
  if (
    path.startsWith('https://public.blob.vercel-storage.com/') &&
    baseUrl !== 'https://public.blob.vercel-storage.com'
  ) {
    const normalizedPath = path.replace('https://public.blob.vercel-storage.com/', baseUrl + '/');
    moduleLogger.info({
      msg: `Normalized URL from ${path} to ${normalizedPath}`,
      originalPath: path,
      normalizedPath,
    });
    return normalizedPath;
  }

  return path;
}

/**
 * Check if a path is already verified as valid
 */
function isKnownValidPath(path: string, baseUrl?: string): boolean {
  // We've already seen this path work in verification, so if it's the same URL, consider it valid
  return Boolean(baseUrl && path.startsWith(baseUrl));
}

/**
 * Extract blob path from URL or convert legacy path
 */
function extractBlobPath(path: string): string {
  // Determine if this is already a full URL or a legacy path
  const isAlreadyFullUrl = path.startsWith('http');

  if (isAlreadyFullUrl) {
    // If it's already a full URL, extract just the path part
    const url = new URL(path);
    return url.pathname.replace(/^\//, ''); // Remove leading slash
  } else {
    // If it's a legacy path, convert it to a blob path
    return blobPathService.convertLegacyPath(path);
  }
}

/**
 * Perform asset existence check with logging
 */
async function checkAssetExistence(
  path: string,
  blobPath: string,
  baseUrl?: string,
): Promise<boolean> {
  // Direct URL check if it's a full blob URL
  const isAlreadyFullUrl = path.startsWith('http');
  const urlToCheck = isAlreadyFullUrl
    ? path
    : blobService.getUrlForPath(blobPath, { baseUrl, noCache: true });

  // Log checking process
  moduleLogger.info({
    msg: `Checking if asset exists: ${path}`,
    operation: 'check_asset',
    normalizedPath: path,
  });
  moduleLogger.info({
    msg: `Blob path: ${blobPath}`,
    operation: 'check_asset',
    blobPath,
  });
  moduleLogger.info({
    msg: `Full URL: ${urlToCheck}`,
    operation: 'check_asset',
    urlToCheck,
  });

  // Get file info and determine existence
  const fileInfo = await blobService.getFileInfo(urlToCheck);
  const exists = fileInfo.size > 0;

  // Log result
  moduleLogger.info({
    msg: `Asset exists: ${exists}, size: ${fileInfo.size}`,
    operation: 'check_asset_result',
    exists,
    size: fileInfo.size,
  });

  return exists;
}

/**
 * Check if an asset exists in Blob storage
 *
 * @param legacyPath The legacy path or URL
 * @param options Optional URL generation options
 * @param useCache Whether to use cached existence results (defaults to true)
 * @returns Promise resolving to true if the asset exists in Blob storage, false otherwise
 */
export async function assetExistsInBlobStorage(
  legacyPath: string,
  _options: Omit<BlobUrlOptions, 'useBlobStorage' | 'noCache'> = {},
  useCache: boolean = true,
): Promise<boolean> {
  // Check existence cache if enabled
  const cachedResult = getExistenceFromCache(legacyPath, useCache);
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;

    // Normalize path to handle URL discrepancies
    const normalizedPath = normalizeBlobPath(legacyPath, baseUrl);

    // Check if path is already verified as valid
    if (isKnownValidPath(normalizedPath, baseUrl)) {
      cacheExistenceResult(legacyPath, true, useCache);
      return true;
    }

    // Extract blob path from URL or convert legacy path
    const blobPath = extractBlobPath(normalizedPath);

    // Perform the existence check
    const exists = await checkAssetExistence(normalizedPath, blobPath, baseUrl);

    // Cache the result if caching is enabled
    cacheExistenceResult(legacyPath, exists, useCache);

    return exists;
  } catch (error) {
    moduleLogger.error({
      msg: `Error checking asset: ${legacyPath}`,
      operation: 'check_asset_error',
      legacyPath,
      error: error instanceof Error ? error.message : String(error),
    });

    cacheExistenceResult(legacyPath, false, useCache);
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
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {},
): Promise<string> {
  try {
    // Check if the asset exists in Blob storage (use cache for performance)
    const exists = await assetExistsInBlobStorage(legacyPath, options);

    if (exists) {
      // If it exists in Blob, use the Blob URL
      return getBlobUrl(legacyPath, options);
    } else {
      // If it doesn't exist in Blob, use the local path
      moduleLogger.info({
        msg: `Asset not found in Blob storage, using local path: ${legacyPath}`,
        operation: 'asset_fallback',
        legacyPath,
      });
      return legacyPath;
    }
  } catch (error) {
    // On any error, fall back to the local path for safety
    moduleLogger.warn({
      msg: `Error checking Blob storage, falling back to local path: ${legacyPath}`,
      operation: 'blob_storage_error',
      legacyPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return legacyPath;
  }
}

/**
 * Utility to fetch text content with automatic fallback
 *
 * Tries to fetch from standardized path first, falls back to legacy path if needed
 *
 * @param legacyPath The legacy path to the text asset
 * @param options Optional URL generation options
 * @returns Promise resolving to the text content
 */
// eslint-disable-next-line complexity
export async function fetchTextWithFallback(
  legacyPath: string,
  options: Omit<BlobUrlOptions, 'useBlobStorage'> = {},
): Promise<string> {
  try {
    // Check if this is already a full URL (not a path)
    const isFullUrl = legacyPath.startsWith('http://') || legacyPath.startsWith('https://');

    if (isFullUrl) {
      // If it's already a full URL, try to fetch it directly
      moduleLogger.info({
        msg: 'Attempting to fetch text from URL',
        url: legacyPath,
      });

      try {
        const response = await fetch(legacyPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const textContent = await response.text();
        moduleLogger.info({
          msg: 'Successfully fetched text from URL',
          url: legacyPath,
        });
        return textContent;
      } catch (error) {
        moduleLogger.error({
          msg: 'Failed to fetch text from URL',
          url: legacyPath,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }

    // First, try the standardized path
    const standardizedPath = blobPathService.convertLegacyPath(legacyPath);
    const standardizedBlobUrl = blobService.getUrlForPath(standardizedPath, {
      baseUrl: options.baseUrl || process.env.NEXT_PUBLIC_BLOB_BASE_URL,
      noCache: options.noCache,
    });

    moduleLogger.info({
      msg: 'Attempting to fetch text from standardized path',
      legacyPath,
      standardizedPath,
      standardizedBlobUrl,
    });

    try {
      const textContent = await blobService.fetchText(standardizedBlobUrl);
      moduleLogger.info({
        msg: 'Successfully fetched text from standardized path',
        standardizedPath,
      });
      return textContent;
    } catch (standardError) {
      moduleLogger.warn({
        msg: 'Failed to fetch from standardized path, falling back to legacy path',
        standardizedPath,
        legacyPath,
        error: standardError instanceof Error ? standardError.message : String(standardError),
      });

      // Fallback mechanism
      const baseUrl = process.env.NEXT_PUBLIC_BLOB_BASE_URL;
      let normalizedPath = legacyPath;

      // Handle URL normalization for tenant-specific domains
      if (
        baseUrl &&
        legacyPath.startsWith('https://public.blob.vercel-storage.com/') &&
        baseUrl !== 'https://public.blob.vercel-storage.com'
      ) {
        normalizedPath = legacyPath.replace(
          'https://public.blob.vercel-storage.com/',
          baseUrl + '/',
        );
        moduleLogger.info({
          msg: `Normalized legacy URL from ${legacyPath} to ${normalizedPath}`,
          operation: 'normalize_legacy_url',
          originalPath: legacyPath,
          normalizedPath,
        });
      }

      // Try legacy path
      try {
        // If it's already a full URL after normalization, use it directly
        if (normalizedPath.startsWith('http')) {
          moduleLogger.info({
            msg: `Fetching text from normalized legacy URL: ${normalizedPath}`,
            operation: 'fetch_text_legacy',
            source: 'normalized_legacy_url',
            url: normalizedPath,
          });
          const textContent = await blobService.fetchText(normalizedPath);

          // Log deprecation warning
          moduleLogger.warn({
            msg: 'DEPRECATION: Successfully fetched text from legacy path. Please update references.',
            legacyPath,
            standardizedPath,
          });

          return textContent;
        } else {
          // Otherwise try as a local path
          moduleLogger.info({
            msg: `Fetching text from local path: ${normalizedPath}`,
            operation: 'fetch_text_local',
            source: 'local_path',
            path: normalizedPath,
          });

          const response = await fetch(normalizedPath);
          // eslint-disable-next-line max-depth
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }

          const textContent = await response.text();

          // Log deprecation warning
          moduleLogger.warn({
            msg: 'DEPRECATION: Successfully fetched text from legacy local path. Please update references.',
            legacyPath,
            standardizedPath,
          });

          return textContent;
        }
      } catch (legacyError) {
        moduleLogger.error({
          msg: 'Failed to fetch from legacy path as well',
          legacyPath,
          standardizedPath,
          standardError:
            standardError instanceof Error ? standardError.message : String(standardError),
          legacyError: legacyError instanceof Error ? legacyError.message : String(legacyError),
        });

        // Re-throw the legacy error as it's the final attempt
        throw legacyError;
      }
    }
  } catch (error) {
    moduleLogger.error({
      msg: `All fetch attempts failed for: ${legacyPath}`,
      operation: 'fetch_text_failed',
      legacyPath,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(
      `Failed to fetch text: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clear the URL cache and existence cache
 * Useful for testing or when URLs or asset availability might change
 */
export function clearBlobUrlCache(): void {
  Object.keys(urlCache).forEach((key) => delete urlCache[key]);
  Object.keys(existenceCache).forEach((key) => delete existenceCache[key]);
}
