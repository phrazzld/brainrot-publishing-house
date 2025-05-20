/**
 * Find The Republic's original cover image
 */
import dotenv from 'dotenv';
import path from 'path';

import { logger as _logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function findOriginalCover() {
  // From git history, The Republic originally used:
  // coverImage: '/assets/the-republic/images/republic-07.png'

  const originalPath = '/assets/the-republic/images/republic-07.png';
  logger.info({ msg: 'Looking for original Republic cover', path: originalPath });

  // Possible locations in blob storage
  const possiblePaths = [
    'books/the-republic/images/republic-07.png',
    'assets/the-republic/images/republic-07.png',
    'images/republic-07.png',
    'images/chapter-images/the-republic/republic-07.png',
    // Also check for variations
    'books/the-republic/images/the-republic-07.png',
    'assets/the-republic/images/the-republic-07.png',
    'images/the-republic-07.png',
  ];

  for (const testPath of possiblePaths) {
    try {
      const url = blobService.getUrlForPath(testPath);
      const response = await fetch(url, { method: 'HEAD' });

      if (response.ok) {
        logger.info({ msg: `✓ Found The Republic cover at: ${testPath}`, url });

        // Test if getAssetUrl would find it with the original path
        const { getAssetUrl } = await import('../utils');
        const assetUrl = getAssetUrl(originalPath, true);
        logger.info({ msg: 'Testing with getAssetUrl', input: originalPath, output: assetUrl });

        const testResponse = await fetch(assetUrl);
        logger.info({
          msg: 'getAssetUrl test result',
          status: testResponse.status,
          ok: testResponse.ok,
        });
      }
    } catch (error) {
      // Continue to next path
    }
  }
}

findOriginalCover().catch(console.error);
