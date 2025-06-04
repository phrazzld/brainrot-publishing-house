/**
 * Copy an existing image to use as placeholder
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

import logger from '../../utils/logger.js';
import { blobService } from '../../utils/services/BlobService.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function copyToPlaceholder() {
  logger.info({ msg: 'Copying image to placeholder location...' });

  // Use one of the existing coming soon book covers as the placeholder
  const sourceImage = 'assets/pride-and-prejudice/images/pride-and-prejudice-01.png';
  const targetPath = 'images/placeholder.jpg';

  try {
    // Fetch the source image
    const sourceUrl = blobService.getUrlForPath(sourceImage);
    logger.info({ msg: 'Fetching source image', url: sourceUrl });

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch source image: HTTP status ${response.status}`);
    }

    // Convert the response to a blob
    const imageBlob = await response.blob();
    const imageFile = new File([imageBlob], 'placeholder.jpg', { type: 'image/jpeg' });

    // Upload to the target location
    const result = await blobService.uploadFile(imageFile, {
      pathname: 'images',
      filename: 'placeholder.jpg',
    });

    const copied = !!result.url;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ msg: 'Error copying image', error: errorMessage });
  }
}

copyToPlaceholder().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error({ msg: 'Unhandled error during placeholder copy', error: errorMessage });
  process.exit(1);
});
