import { blobService } from './services/BlobService';
import { blobPathService } from './services/BlobPathService';

/**
 * Convert a legacy asset path to a Blob URL
 * 
 * @param legacyPath The legacy path (e.g., /assets/hamlet/images/hamlet-01.png)
 * @returns The Blob URL for the asset
 */
export function getBlobUrl(legacyPath: string): string {
  // Convert the legacy path to a Blob path
  const blobPath = blobPathService.convertLegacyPath(legacyPath);
  
  // Get the URL for the Blob path
  return blobService.getUrlForPath(blobPath);
}

/**
 * Determine if an asset should use Blob storage or fallback to local path
 * 
 * This is a temporary function to use during migration. Once all assets
 * are migrated, we can remove this and use getBlobUrl directly.
 * 
 * @param legacyPath The legacy path
 * @param useBlobStorage Whether to use Blob storage (can be used to globally toggle for testing)
 * @returns The path to use (either Blob URL or legacy path)
 */
export function getAssetUrl(legacyPath: string, useBlobStorage: boolean = true): string {
  // If not using Blob storage, return the legacy path
  if (!useBlobStorage) {
    return legacyPath;
  }
  
  // Otherwise, return the Blob URL
  return getBlobUrl(legacyPath);
}

/**
 * Check if an asset exists in Blob storage
 * 
 * @param legacyPath The legacy path
 * @returns Promise resolving to true if the asset exists in Blob storage, false otherwise
 */
export async function assetExistsInBlobStorage(legacyPath: string): Promise<boolean> {
  try {
    const blobUrl = getBlobUrl(legacyPath);
    const fileInfo = await blobService.getFileInfo(blobUrl);
    return fileInfo.size > 0;
  } catch (error) {
    return false;
  }
}