/**
 * This file is deprecated and only exists to support the build process.
 * Use VercelBlobSourceAdapter instead.
 */

/**
 * Get audio path from URL
 */
export function getAudioPathFromUrl(url) {
  // Extract the path from the URL
  if (url.startsWith('http')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      // Silently ignore URL parsing errors and return the original URL
      return url;
    }
  }
  return url;
}

/**
 * Download from spaces (DEPRECATED)
 */
export async function downloadFromSpaces(path, _options = {}) {
  // Still throw the error to prevent actual usage
  throw new Error('downloadFromSpaces is deprecated. Use VercelBlobSourceAdapter instead.');
}
