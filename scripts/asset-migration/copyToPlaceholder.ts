/**
 * Copy an existing image to use as placeholder
 */
import dotenv from 'dotenv';
import path from 'path';

import { logger } from '../utils/logger';
import { blobService } from '../utils/services/BlobService';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function copyToPlaceholder() {
  logger.info({ msg: 'Copying image to placeholder location...' });

  // Use one of the existing coming soon book covers as the placeholder
  const sourceImage = 'assets/pride-and-prejudice/images/pride-and-prejudice-01.png';
  const targetPath = 'images/placeholder.jpg';

  try {
    // Copy the image
    const copied = await blobService.copy(sourceImage, targetPath);

    if (copied) {
      logger.info({
        msg: 'Successfully copied image to placeholder',
        source: sourceImage,
        target: targetPath,
      });

      // Verify it's accessible
      const publicUrl = blobService.getUrlForPath(targetPath);
      const response = await fetch(publicUrl, { method: 'HEAD' });
      logger.info({
        msg: 'Verification',
        url: publicUrl,
        status: response.status,
        ok: response.ok,
      });
    } else {
      logger.error({ msg: 'Failed to copy image' });
    }
  } catch (error) {
    logger.error({ msg: 'Error copying image', error: error.message });
  }
}

copyToPlaceholder().catch(console.error);
