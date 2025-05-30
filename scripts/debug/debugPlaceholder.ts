/**
 * Debug the placeholder image issue
 */
import dotenv from 'dotenv';
import path from 'path';

import { logger } from '../../utils/logger.js';
import { getAssetUrl } from '../utils.js';
import { blobService } from '../utils/services/BlobService.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debugPlaceholder() {
  const placeholderPath = '/assets/covers/placeholder.jpg';

  // Check what getAssetUrl returns
  const generatedUrl = getAssetUrl(placeholderPath, true);
  logger.info({ msg: 'Generated URL', path: placeholderPath, url: generatedUrl });

  // Check the asset mapping
  const { mapAssetPath } = await import('../utils/assetPathMapping.js');
  const mappedPath = mapAssetPath(placeholderPath);
  logger.info({ msg: 'Mapped path', original: placeholderPath, mapped: mappedPath });

  // Search for placeholder in various locations
  const possiblePaths = [
    'images/placeholder.jpg',
    'assets/images/placeholder.jpg',
    'assets/covers/placeholder.jpg',
    'placeholder.jpg',
    'books/assets/covers/placeholder.jpg',
    'site-assets/placeholder.jpg',
    'shared/placeholder.jpg',
  ];

  logger.info({ msg: 'Searching for placeholder in blob storage...' });

  for (const testPath of possiblePaths) {
    try {
      const url = blobService.getUrlForPath(testPath);
      const response = await fetch(url, { method: 'HEAD' });

      if (response.ok) {
        logger.info({ msg: `✓ Found placeholder at: ${testPath}`, url });
      } else {
        logger.debug({ msg: `Not found at: ${testPath}`, status: response.status });
      }
    } catch (error) {
      logger.debug({ msg: `Error checking: ${testPath}`, error: error.message });
    }
  }

  // Try fetching the generated URL directly
  try {
    const response = await fetch(generatedUrl);
    logger.info({
      msg: 'Direct fetch of generated URL',
      status: response.status,
      ok: response.ok,
    });
  } catch (error) {
    logger.error({ msg: 'Failed to fetch generated URL', error: error.message });
  }
}

debugPlaceholder().catch(console.error);
