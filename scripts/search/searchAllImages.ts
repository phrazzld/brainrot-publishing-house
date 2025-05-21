/**
 * TODO: Replace console.log with logger
 *
 * Search for all images in blob storage
 */
import dotenv from 'dotenv';
import path from 'path';

// Let me also test what happens with the current getAssetUrl function
import { getAssetUrl } from '../utils';
import { logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function searchImages() {
  logger.info({ msg: 'Searching for all images in blob storage...' });

  try {
    // Get all items in blob storage
    const response = await fetch(`${process.env.NEXT_PUBLIC_BLOB_BASE_URL}`);
    logger.info({ msg: 'Response status', status: response.status });

    // Also try listing with the blob service
    const bookImages = [
      'the-iliad-01.png',
      'the-odyssey-01.png',
      'the-aeneid-01.png',
      'hamlet-07.png',
    ];

    // Try different pattern paths for image search
    const _searchPatterns = [
      'books/*/images/*.png',
      'images/*.png',
      'assets/*/images/*.png',
      '*/images/*.png',
    ];

    for (const image of bookImages) {
      logger.info({ msg: `Searching for: ${image}` });

      // Try various paths
      const testPaths = [
        `books/the-iliad/images/${image}`,
        `books/the-odyssey/images/${image}`,
        `books/the-aeneid/images/${image}`,
        `books/hamlet/images/${image}`,
        `images/${image}`,
        `assets/the-iliad/images/${image}`,
        `assets/the-odyssey/images/${image}`,
        `assets/the-aeneid/images/${image}`,
        `assets/hamlet/images/${image}`,
        // Also try with chapter-images prefix
        `images/chapter-images/the-iliad/${image}`,
        `images/chapter-images/the-odyssey/${image}`,
        `images/chapter-images/the-aeneid/${image}`,
        `images/chapter-images/hamlet/${image}`,
      ];

      for (const path of testPaths) {
        try {
          const url = blobService.getUrlForPath(path);
          const response = await fetch(url, { method: 'HEAD' });

          if (response.ok) {
            // Extract common logic to reduce nesting depth
            logger.info({ msg: `✓ Found: ${path}`, url });
            continue;
          }
        } catch {
          // Continue - silent catch for 404s
        }
      }
    }
  } catch (error) {
    logger.error({ msg: 'Error searching images', error: error.message });
  }
}

const testPaths = [
  '/assets/hamlet/images/hamlet-07.png',
  '/assets/the-iliad/images/the-iliad-01.png',
];

// The following code is used for interactive CLI debugging
// eslint-disable-next-line no-console -- CLI debugging tool
console.log('\n=== Testing getAssetUrl ===');
for (const path of testPaths) {
  // eslint-disable-next-line no-console -- CLI debugging tool
  console.log(`Input: ${path}`);
  // eslint-disable-next-line no-console -- CLI debugging tool
  console.log(`Output: ${getAssetUrl(path, true)}`);
}

searchImages().catch(console.error);
